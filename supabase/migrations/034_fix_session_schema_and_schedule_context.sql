-- Phase 9: Fix session/chapter schema gaps + schedule context storage

-- 1) Allow class-based chapters
ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE chapters
  ALTER COLUMN course_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chapters_course_or_class_check'
  ) THEN
    ALTER TABLE chapters
      ADD CONSTRAINT chapters_course_or_class_check
      CHECK (course_id IS NOT NULL OR class_id IS NOT NULL)
      NOT VALID;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_chapters_class_id ON chapters(class_id);

-- 2) Link sessions to chapters (for generated content)
ALTER TABLE course_sessions
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_sessions_chapter ON course_sessions(chapter_id);

-- 3) Schedule generation context (class-level)
CREATE TABLE IF NOT EXISTS schedule_generation_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  target_audience TEXT,
  learning_goals TEXT,
  teaching_method TEXT,
  class_topic TEXT,
  total_sessions INTEGER,
  frequency TEXT,
  session_details JSONB DEFAULT '[]'::jsonb,
  conversation_context TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id)
);

ALTER TABLE schedule_generation_context
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_generation_context_class
  ON schedule_generation_context(class_id);

ALTER TABLE schedule_generation_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view schedule context for their classes"
  ON schedule_generation_context;
CREATE POLICY "Teachers can view schedule context for their classes"
  ON schedule_generation_context FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM class_members
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
    OR class_id IN (
      SELECT id FROM classes WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can insert schedule context for their classes"
  ON schedule_generation_context;
CREATE POLICY "Teachers can insert schedule context for their classes"
  ON schedule_generation_context FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      class_id IN (
        SELECT class_id FROM class_members
        WHERE user_id = auth.uid() AND role = 'teacher'
      )
      OR class_id IN (
        SELECT id FROM classes WHERE created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can update schedule context for their classes"
  ON schedule_generation_context;
CREATE POLICY "Teachers can update schedule context for their classes"
  ON schedule_generation_context FOR UPDATE
  USING (
    class_id IN (
      SELECT class_id FROM class_members
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
    OR class_id IN (
      SELECT id FROM classes WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Teachers can delete schedule context for their classes"
  ON schedule_generation_context;
CREATE POLICY "Teachers can delete schedule context for their classes"
  ON schedule_generation_context FOR DELETE
  USING (
    class_id IN (
      SELECT class_id FROM class_members
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
    OR class_id IN (
      SELECT id FROM classes WHERE created_by = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_schedule_generation_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schedule_generation_context_updated_at_trigger
  ON schedule_generation_context;

CREATE TRIGGER schedule_generation_context_updated_at_trigger
  BEFORE UPDATE ON schedule_generation_context
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_generation_context_updated_at();
