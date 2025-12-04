-- Migration: Course Compression Context System
-- Creates course-level compression context system for AI-generated content

-- 1) Create course_compression_context table for storing course-level compressed context
CREATE TABLE IF NOT EXISTS course_compression_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Core compression fields
  compressed_summary TEXT NOT NULL DEFAULT '',
  key_concepts JSONB DEFAULT '[]'::jsonb,
  learning_objectives JSONB DEFAULT '[]'::jsonb,
  session_contexts JSONB DEFAULT '[]'::jsonb,
  teaching_method TEXT,
  target_audience TEXT,
  prerequisites JSONB DEFAULT '[]'::jsonb,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  total_duration_minutes INTEGER DEFAULT 0,

  -- Metadata
  version INTEGER NOT NULL DEFAULT 1,
  quality_score DECIMAL(3,2) DEFAULT 0.0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one context per course/class
  UNIQUE(course_id, class_id, organization_id)
);

-- 2) Create context_extraction_events table for tracking extraction events
CREATE TABLE IF NOT EXISTS context_extraction_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  context_id UUID NOT NULL REFERENCES course_compression_context(id) ON DELETE CASCADE,
  extraction_type TEXT NOT NULL CHECK (extraction_type IN (
    'schedule_generation',
    'session_content_generation',
    'assignment_generation',
    'manual_update',
    'quality_refinement'
  )),
  source_type TEXT NOT NULL CHECK (source_type IN (
    'schedule',
    'session',
    'chapter',
    'component',
    'assignment',
    'submission',
    'conversation'
  )),
  source_id UUID,
  extracted_content JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN (
    'pending',
    'processed',
    'merged',
    'archived'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 3) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compression_context_course ON course_compression_context(course_id);
CREATE INDEX IF NOT EXISTS idx_compression_context_class ON course_compression_context(class_id);
CREATE INDEX IF NOT EXISTS idx_compression_context_org ON course_compression_context(organization_id);
CREATE INDEX IF NOT EXISTS idx_compression_context_version ON course_compression_context(version);
CREATE INDEX IF NOT EXISTS idx_compression_context_quality ON course_compression_context(quality_score);

CREATE INDEX IF NOT EXISTS idx_extraction_events_context ON context_extraction_events(context_id);
CREATE INDEX IF NOT EXISTS idx_extraction_events_type ON context_extraction_events(extraction_type);
CREATE INDEX IF NOT EXISTS idx_extraction_events_source ON context_extraction_events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_extraction_events_status ON context_extraction_events(processing_status);

-- 4) Enable RLS on new tables
ALTER TABLE course_compression_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_extraction_events ENABLE ROW LEVEL SECURITY;

-- 5) Create RLS policies for course_compression_context
DO $$
BEGIN
  -- SELECT policy: Users can view compression contexts for courses/classes they have access to
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_compression_context'
      AND policyname = 'Users can view compression contexts for their courses/classes'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view compression contexts for their courses/classes"
        ON course_compression_context FOR SELECT
        USING (
          organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
          )
          AND (
            -- For course-based compression contexts
            (course_id IS NOT NULL AND class_id IS NULL AND organization_id IN (
              SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            ))
            OR
            -- For class-based compression contexts
            (class_id IS NOT NULL AND class_id IN (
              SELECT class_id FROM class_members WHERE user_id = auth.uid()
            ))
          )
        );
    $$;
  END IF;

  -- INSERT policy: Users can create compression contexts for their courses/classes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_compression_context'
      AND policyname = 'Users can create compression contexts for their courses/classes'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can create compression contexts for their courses/classes"
        ON course_compression_context FOR INSERT
        WITH CHECK (
          created_by = auth.uid()
          AND (
            -- For course-based contexts
            (course_id IS NOT NULL AND class_id IS NULL AND organization_id IN (
              SELECT organization_id FROM organization_members
              WHERE user_id = auth.uid() AND role IN ('owner', 'teacher')
            ))
            OR
            -- For class-based contexts
            (class_id IS NOT NULL AND course_id IS NULL AND class_id IN (
              SELECT class_id FROM class_members WHERE user_id = auth.uid() AND role = 'teacher'
            ))
          )
        );
    $$;
  END IF;

  -- UPDATE policy: Users can update compression contexts they created
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_compression_context'
      AND policyname = 'Users can update their own compression contexts'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can update their own compression contexts"
        ON course_compression_context FOR UPDATE
        USING (created_by = auth.uid())
        WITH CHECK (created_by = auth.uid());
    $$;
  END IF;

  -- DELETE policy: Users can delete compression contexts they created
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_compression_context'
      AND policyname = 'Users can delete their own compression contexts'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can delete their own compression contexts"
        ON course_compression_context FOR DELETE
        USING (created_by = auth.uid());
    $$;
  END IF;
END$$;

-- 6) Create RLS policies for context_extraction_events
DO $$
BEGIN
  -- SELECT policy: Users can view extraction events for their compression contexts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'context_extraction_events'
      AND policyname = 'Users can view extraction events for their compression contexts'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view extraction events for their compression contexts"
        ON context_extraction_events FOR SELECT
        USING (
          context_id IN (
            SELECT id FROM course_compression_context
            WHERE organization_id IN (
              SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            )
          )
        );
    $$;
  END IF;

  -- INSERT policy: Users can create extraction events for their compression contexts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'context_extraction_events'
      AND policyname = 'Users can create extraction events for their compression contexts'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can create extraction events for their compression contexts"
        ON context_extraction_events FOR INSERT
        WITH CHECK (
          created_by = auth.uid()
          AND context_id IN (
            SELECT id FROM course_compression_context
            WHERE created_by = auth.uid()
          )
        );
    $$;
  END IF;

  -- UPDATE policy: Users can update extraction events they created
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'context_extraction_events'
      AND policyname = 'Users can update their own extraction events'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can update their own extraction events"
        ON context_extraction_events FOR UPDATE
        USING (created_by = auth.uid())
        WITH CHECK (created_by = auth.uid());
    $$;
  END IF;

  -- DELETE policy: Users can delete extraction events they created
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'context_extraction_events'
      AND policyname = 'Users can delete their own extraction events'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can delete their own extraction events"
        ON context_extraction_events FOR DELETE
        USING (created_by = auth.uid());
    $$;
  END IF;
END$$;

-- 7) Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_compression_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8) Create trigger for automatic timestamp update
DROP TRIGGER IF EXISTS trigger_update_course_compression_context_updated_at ON course_compression_context;
CREATE TRIGGER trigger_update_course_compression_context_updated_at
  BEFORE UPDATE ON course_compression_context
  FOR EACH ROW
  EXECUTE FUNCTION update_course_compression_context_updated_at();

-- 9) Create function to process and merge extraction events
CREATE OR REPLACE FUNCTION process_context_extraction_events(
  p_context_id UUID,
  p_created_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_compression_context RECORD;
BEGIN
  -- Get all pending extraction events for this context
  SELECT * INTO v_compression_context
  FROM course_compression_context
  WHERE id = p_context_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compression context not found';
  END IF;

  -- Process extraction events (this is a simplified version)
  -- In practice, this would use AI to merge the extracted content
  -- For now, we'll just mark them as processed

  UPDATE context_extraction_events
  SET processing_status = 'processed',
      processed_at = NOW()
  WHERE context_id = p_context_id
    AND processing_status = 'pending';

  -- Update the compression context version
  UPDATE course_compression_context
  SET version = version + 1,
      quality_score = CASE
        WHEN quality_score < 1.0 THEN quality_score + 0.05
        ELSE quality_score
      END
  WHERE id = p_context_id;

  -- Return processing result
  v_result := jsonb_build_object(
    'success', true,
    'context_id', p_context_id,
    'updated_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10) Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_context_extraction_events(UUID, UUID) TO authenticated;
