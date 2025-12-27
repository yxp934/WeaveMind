-- Phase 9b: Support course-based schedule context

ALTER TABLE schedule_generation_context
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE schedule_generation_context
  ALTER COLUMN class_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedule_generation_context_entity_check'
  ) THEN
    ALTER TABLE schedule_generation_context
      ADD CONSTRAINT schedule_generation_context_entity_check
      CHECK (class_id IS NOT NULL OR course_id IS NOT NULL)
      NOT VALID;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_schedule_generation_context_course
  ON schedule_generation_context(course_id);

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
    OR course_id IN (
      SELECT id FROM courses WHERE created_by = auth.uid()
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
      OR course_id IN (
        SELECT id FROM courses WHERE created_by = auth.uid()
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
    OR course_id IN (
      SELECT id FROM courses WHERE created_by = auth.uid()
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
    OR course_id IN (
      SELECT id FROM courses WHERE created_by = auth.uid()
    )
  );
