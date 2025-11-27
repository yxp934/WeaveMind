-- Phase 7: Real-Time Monitoring & Analytics
-- Expand learning events to track more comprehensive student activity

-- Add new event types to the existing enum
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'component_open';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'component_complete';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ai_question_asked';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ai_question_answered';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'assignment_submitted';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'assignment_graded';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'course_started';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'chapter_started';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'chapter_completed';

-- Add assignment_id to learning_events for tracking assignment-related events
ALTER TABLE learning_events
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE;

-- Add duration tracking for time spent on components
ALTER TABLE learning_events
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Create index for assignment events
CREATE INDEX IF NOT EXISTS idx_learning_events_assignment
  ON learning_events(assignment_id);

-- Create index for event type for faster filtering
CREATE INDEX IF NOT EXISTS idx_learning_events_type
  ON learning_events(event_type);

-- Create index for created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_learning_events_created_at
  ON learning_events(created_at DESC);

-- Create composite index for common queries (user + course + time)
CREATE INDEX IF NOT EXISTS idx_learning_events_user_course_time
  ON learning_events(user_id, course_id, created_at DESC);

-- Create student progress summary view
CREATE OR REPLACE VIEW student_progress_summary AS
SELECT
  le.user_id AS student_id,
  le.course_id,
  c.title AS course_title,
  COUNT(DISTINCT le.component_id) FILTER (WHERE le.event_type = 'component_complete') AS components_completed,
  COUNT(DISTINCT le.component_id) FILTER (WHERE le.event_type = 'component_open') AS components_viewed,
  COUNT(DISTINCT le.chapter_id) FILTER (WHERE le.event_type = 'chapter_completed') AS chapters_completed,
  COUNT(*) FILTER (WHERE le.event_type = 'ai_question_asked') AS ai_questions_asked,
  SUM(le.duration_seconds) FILTER (WHERE le.duration_seconds IS NOT NULL) AS total_time_seconds,
  MAX(le.created_at) AS last_activity_at,
  MIN(le.created_at) FILTER (WHERE le.event_type = 'course_started') AS course_started_at
FROM learning_events le
JOIN courses c ON c.id = le.course_id
GROUP BY le.user_id, le.course_id, c.title;

-- Create component progress view for detailed tracking
CREATE OR REPLACE VIEW component_progress AS
SELECT
  le.user_id AS student_id,
  le.course_id,
  le.chapter_id,
  le.component_id,
  comp.type AS component_type,
  MAX(CASE WHEN le.event_type = 'component_open' THEN le.created_at END) AS first_viewed_at,
  MAX(CASE WHEN le.event_type = 'component_complete' THEN le.created_at END) AS completed_at,
  COUNT(*) FILTER (WHERE le.event_type = 'component_open') AS view_count,
  SUM(le.duration_seconds) FILTER (WHERE le.duration_seconds IS NOT NULL) AS total_time_seconds,
  MAX(le.created_at) AS last_activity_at
FROM learning_events le
JOIN components comp ON comp.id = le.component_id
WHERE le.component_id IS NOT NULL
GROUP BY le.user_id, le.course_id, le.chapter_id, le.component_id, comp.type;

-- Create class progress summary for teachers
CREATE OR REPLACE VIEW class_progress_summary AS
SELECT
  c.id AS class_id,
  c.name AS class_name,
  co.id AS course_id,
  co.title AS course_title,
  cm.user_id AS student_id,
  COUNT(DISTINCT le.component_id) FILTER (WHERE le.event_type = 'component_complete') AS components_completed,
  COUNT(DISTINCT le.chapter_id) FILTER (WHERE le.event_type = 'chapter_completed') AS chapters_completed,
  COUNT(*) FILTER (WHERE le.event_type = 'ai_question_asked') AS ai_questions_asked,
  SUM(le.duration_seconds) FILTER (WHERE le.duration_seconds IS NOT NULL) AS total_time_seconds,
  MAX(le.created_at) AS last_activity_at
FROM classes c
JOIN class_members cm ON cm.class_id = c.id AND cm.role = 'student'
JOIN courses co ON co.class_id = c.id
LEFT JOIN learning_events le ON le.user_id = cm.user_id AND le.course_id = co.id
GROUP BY c.id, c.name, co.id, co.title, cm.user_id;

-- Grant access to views
GRANT SELECT ON student_progress_summary TO authenticated;
GRANT SELECT ON component_progress TO authenticated;
GRANT SELECT ON class_progress_summary TO authenticated;

-- Add RLS policies for views (they inherit from base tables, but we make it explicit)
-- Students can view their own progress
CREATE POLICY "Students can view their own progress summary"
  ON student_progress_summary FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can view progress for students in their classes
CREATE POLICY "Teachers can view class progress summary"
  ON class_progress_summary FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM class_members
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

-- Create at-risk students view for anomaly detection
CREATE OR REPLACE VIEW at_risk_students AS
SELECT
  le.user_id AS student_id,
  le.course_id,
  c.title AS course_title,
  -- Risk indicators
  CASE
    WHEN MAX(le.created_at) < NOW() - INTERVAL '7 days' THEN 'inactive'
    WHEN COUNT(DISTINCT le.component_id) FILTER (WHERE le.event_type = 'component_open') >
         COUNT(DISTINCT le.component_id) FILTER (WHERE le.event_type = 'component_complete') * 3 THEN 'struggling'
    WHEN AVG(le.duration_seconds) FILTER (WHERE le.duration_seconds IS NOT NULL) > 600 THEN 'slow_progress'
    ELSE 'ok'
  END AS risk_level,
  -- Supporting metrics
  MAX(le.created_at) AS last_activity_at,
  COUNT(DISTINCT le.component_id) FILTER (WHERE le.event_type = 'component_open') AS components_opened,
  COUNT(DISTINCT le.component_id) FILTER (WHERE le.event_type = 'component_complete') AS components_completed,
  AVG(le.duration_seconds) FILTER (WHERE le.duration_seconds IS NOT NULL) AS avg_time_per_component,
  COUNT(*) FILTER (WHERE le.event_type = 'ai_question_asked') AS ai_questions_asked
FROM learning_events le
JOIN courses c ON c.id = le.course_id
WHERE le.component_id IS NOT NULL
GROUP BY le.user_id, le.course_id, c.title
HAVING
  -- Only include students with some activity
  COUNT(*) > 0
  AND (
    -- Inactive for 7+ days
    MAX(le.created_at) < NOW() - INTERVAL '7 days'
    -- Or opened many components but completed few
    OR COUNT(DISTINCT le.component_id) FILTER (WHERE le.event_type = 'component_open') >
       COUNT(DISTINCT le.component_id) FILTER (WHERE le.event_type = 'component_complete') * 3
    -- Or spending too much time per component (>10 minutes average)
    OR AVG(le.duration_seconds) FILTER (WHERE le.duration_seconds IS NOT NULL) > 600
  );

-- Grant access to at-risk students view
GRANT SELECT ON at_risk_students TO authenticated;

-- Add RLS policy for at-risk students view
CREATE POLICY "Teachers can view at-risk students in their classes"
  ON at_risk_students FOR SELECT
  USING (
    course_id IN (
      SELECT co.id FROM courses co
      JOIN classes cl ON cl.id = co.class_id
      JOIN class_members cm ON cm.class_id = cl.id
      WHERE cm.user_id = auth.uid() AND cm.role = 'teacher'
    )
  );

-- Add comments for documentation
COMMENT ON VIEW student_progress_summary IS 'Aggregated progress metrics per student per course';
COMMENT ON VIEW component_progress IS 'Detailed component-level progress tracking for each student';
COMMENT ON VIEW class_progress_summary IS 'Class-wide progress summary for teachers to monitor all students';
COMMENT ON VIEW at_risk_students IS 'Students who may need intervention based on activity patterns (inactive, struggling, or slow progress)';
COMMENT ON COLUMN learning_events.duration_seconds IS 'Time spent on the component/activity in seconds';
COMMENT ON COLUMN learning_events.assignment_id IS 'Reference to assignment for assignment-related events';

