-- Add class_id to course_outlines to support class-based outline generation
-- This allows outlines to be associated with either a course or a class

-- Add class_id column (nullable, since existing outlines are course-based)
ALTER TABLE course_outlines
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- Make course_id nullable (since we now support class-based outlines)
ALTER TABLE course_outlines
  ALTER COLUMN course_id DROP NOT NULL;

-- Add constraint to ensure either course_id or class_id is set (but not both)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_outlines_entity_check'
  ) THEN
    ALTER TABLE course_outlines
      ADD CONSTRAINT course_outlines_entity_check
      CHECK (
        (course_id IS NOT NULL AND class_id IS NULL) OR
        (course_id IS NULL AND class_id IS NOT NULL)
      );
  END IF;
END$$;

-- Add index for class_id lookups
CREATE INDEX IF NOT EXISTS idx_course_outlines_class
  ON course_outlines(class_id);

-- Update RLS policies to support class-based outlines
-- Drop old policy
DROP POLICY IF EXISTS "Course creator can manage course_outlines" ON course_outlines;

-- Create new policy that supports both course and class-based outlines
CREATE POLICY "Users can manage their course and class outlines"
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

-- Add schedule_requirements and schedule_generated columns if they don't exist
-- (These were added in a previous migration for course-based schedules)
ALTER TABLE course_outlines
  ADD COLUMN IF NOT EXISTS schedule_requirements JSONB;

ALTER TABLE course_outlines
  ADD COLUMN IF NOT EXISTS schedule_generated BOOLEAN DEFAULT FALSE;

-- Add updated_at column for tracking changes
ALTER TABLE course_outlines
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_course_outlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_outlines_updated_at_trigger ON course_outlines;

CREATE TRIGGER course_outlines_updated_at_trigger
  BEFORE UPDATE ON course_outlines
  FOR EACH ROW
  EXECUTE FUNCTION update_course_outlines_updated_at();

