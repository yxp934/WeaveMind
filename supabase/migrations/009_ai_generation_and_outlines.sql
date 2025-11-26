-- Phase 3 & 4: AI draft courses, course outlines, and AI generation tables

-- 1) Allow NULL class_id on courses for AI-generated draft courses
ALTER TABLE courses
  ALTER COLUMN class_id DROP NOT NULL;

-- Update courses insert policy to allow drafts with NULL class_id while
-- preserving class-based creation rules for normal courses.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Teachers can create courses'
  ) THEN
    EXECUTE 'DROP POLICY "Teachers can create courses" ON courses;';
  END IF;
END$$;

CREATE POLICY IF NOT EXISTS "Teachers can create courses or AI drafts"
  ON courses FOR INSERT
  WITH CHECK (
    -- AI-generated draft courses without a class
    (class_id IS NULL AND created_by = auth.uid())
    OR
    -- Normal courses tied to a class where the user is a teacher
    (class_id IN (
      SELECT class_id FROM class_members
      WHERE user_id = auth.uid() AND role = ''teacher''
    ))
  );

-- 2) Course outlines table to store AI-generated outlines
CREATE TABLE IF NOT EXISTS course_outlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  requirements JSONB NOT NULL,
  chapters JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE course_outlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Course creator can manage course_outlines"
  ON course_outlines FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 3) AI generation run and per-chapter result tables
CREATE TABLE IF NOT EXISTS ai_generation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total_chapters INTEGER NOT NULL DEFAULT 0,
  completed_chapters INTEGER NOT NULL DEFAULT 0,
  max_iterations_per_chapter INTEGER NOT NULL DEFAULT 2,
  config JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_generation_chapter_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES ai_generation_runs(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  iterations_used INTEGER NOT NULL DEFAULT 0,
  builder_critic_dialogue JSONB DEFAULT '[]'::jsonb,
  proposed_components JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_runs_course
  ON ai_generation_runs(course_id);

CREATE INDEX IF NOT EXISTS idx_ai_generation_chapter_results_run
  ON ai_generation_chapter_results(run_id);

ALTER TABLE ai_generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_chapter_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Course creator can view ai_generation_runs"
  ON ai_generation_runs FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Course creator can manage ai_generation_runs"
  ON ai_generation_runs FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Course creator can view ai_generation_chapter_results"
  ON ai_generation_chapter_results FOR SELECT
  USING (
    run_id IN (
      SELECT id FROM ai_generation_runs WHERE created_by = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Course creator can manage ai_generation_chapter_results"
  ON ai_generation_chapter_results FOR ALL
  USING (
    run_id IN (
      SELECT id FROM ai_generation_runs WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    run_id IN (
      SELECT id FROM ai_generation_runs WHERE created_by = auth.uid()
    )
  );

