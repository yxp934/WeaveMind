-- Phase 5: Course Versioning and Edit History
-- This migration adds support for tracking course versions and edit history

-- Course versions table to store snapshots of course state
CREATE TABLE IF NOT EXISTS course_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL, -- Full course structure snapshot
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT, -- Optional description of what changed
  UNIQUE(course_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_course_versions_course
  ON course_versions(course_id);

-- Course edit history table to track individual edits
CREATE TABLE IF NOT EXISTS course_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  edit_type TEXT NOT NULL, -- 'ai_instruction', 'manual_edit', 'bulk_operation'
  instruction TEXT, -- For AI edits, the natural language instruction
  tool_calls JSONB DEFAULT '[]'::jsonb, -- For AI edits, the tools that were called
  changes_summary TEXT, -- Human-readable summary of changes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_edit_history_course
  ON course_edit_history(course_id);

CREATE INDEX IF NOT EXISTS idx_course_edit_history_created_at
  ON course_edit_history(created_at DESC);

-- RLS policies for course_versions
ALTER TABLE course_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their courses"
  ON course_versions FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM courses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Course creators can create versions"
  ON course_versions FOR INSERT
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE created_by = auth.uid()
    )
  );

-- RLS policies for course_edit_history
ALTER TABLE course_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edit history of their courses"
  ON course_edit_history FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM courses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Course editors can create edit history"
  ON course_edit_history FOR INSERT
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE created_by = auth.uid()
    )
  );

-- Function to create a course version snapshot
CREATE OR REPLACE FUNCTION create_course_version_snapshot(
  p_course_id UUID,
  p_created_by UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_version_number INTEGER;
  v_snapshot JSONB;
  v_version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM course_versions
  WHERE course_id = p_course_id;

  -- Build snapshot
  SELECT jsonb_build_object(
    'course', row_to_json(c.*),
    'chapters', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'chapter', row_to_json(ch.*),
          'components', (
            SELECT jsonb_agg(row_to_json(comp.*) ORDER BY comp.order_index)
            FROM components comp
            WHERE comp.chapter_id = ch.id
          )
        ) ORDER BY ch.order_index
      )
      FROM chapters ch
      WHERE ch.course_id = p_course_id
    )
  )
  INTO v_snapshot
  FROM courses c
  WHERE c.id = p_course_id;

  -- Insert version
  INSERT INTO course_versions (course_id, version_number, snapshot, created_by, description)
  VALUES (p_course_id, v_version_number, v_snapshot, p_created_by, p_description)
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_course_version_snapshot(UUID, UUID, TEXT) TO authenticated;

-- Comments
COMMENT ON TABLE course_versions IS 'Stores snapshots of course state for versioning and rollback';
COMMENT ON TABLE course_edit_history IS 'Tracks all edits made to courses, including AI-assisted edits';
COMMENT ON FUNCTION create_course_version_snapshot IS 'Creates a complete snapshot of a course including all chapters and components';

