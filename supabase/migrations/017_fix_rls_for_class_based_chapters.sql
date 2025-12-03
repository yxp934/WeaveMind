-- Fix RLS policies to support class-based chapters
-- Chapters can now be either course-based or class-based

-- Drop old chapters policy
DROP POLICY IF EXISTS "Users can view chapters of accessible courses" ON chapters;

-- Create new chapters policy that supports both course and class-based chapters
CREATE POLICY "Users can view chapters of accessible content"
  ON chapters FOR SELECT
  USING (
    -- Course-based chapters
    (course_id IN (
      SELECT id FROM courses WHERE
      (published = TRUE AND class_id IN (
        SELECT class_id FROM class_members WHERE user_id = auth.uid()
      ))
      OR created_by = auth.uid()
    ))
    OR
    -- Class-based chapters
    (class_id IN (
      SELECT class_id FROM class_members WHERE user_id = auth.uid() AND role = 'student'
    ))
    OR
    -- Class creators can view all chapters in their classes
    (class_id IN (
      SELECT id FROM classes WHERE created_by = auth.uid()
    ))
  );

-- Drop old components policy
DROP POLICY IF EXISTS "Users can view components of accessible chapters" ON components;

-- Create new components policy that supports both course and class-based chapters
CREATE POLICY "Users can view components of accessible content"
  ON components FOR SELECT
  USING (
    chapter_id IN (
      SELECT ch.id FROM chapters ch
      WHERE
      -- Course-based chapters
      (ch.course_id IN (
        SELECT id FROM courses WHERE
        (published = TRUE AND class_id IN (
          SELECT class_id FROM class_members WHERE user_id = auth.uid()
        ))
        OR created_by = auth.uid()
      ))
      OR
      -- Class-based chapters
      (ch.class_id IN (
        SELECT class_id FROM class_members WHERE user_id = auth.uid() AND role = 'student'
      ))
      OR
      -- Class creators can view all components in their classes
      (ch.class_id IN (
        SELECT id FROM classes WHERE created_by = auth.uid()
      ))
    )
  );

-- Update course_outlines policy to include class-based chapters
DROP POLICY IF EXISTS "Users can manage their course and class outlines" ON course_outlines;

CREATE POLICY "Users can manage their outlines"
  ON course_outlines FOR ALL
  USING (
    created_by = auth.uid()
    OR
    -- For course-based outlines
    (course_id IN (
      SELECT id FROM courses WHERE created_by = auth.uid()
    ))
    OR
    -- For class-based outlines
    (class_id IN (
      SELECT id FROM classes WHERE created_by = auth.uid()
    ))
  )
  WITH CHECK (
    created_by = auth.uid()
  );
