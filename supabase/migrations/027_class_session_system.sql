-- Phase 7: Complete Class Session System
-- This migration creates the missing course_sessions table and enhances the session management system

-- 1) Create course_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS course_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  session_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  location TEXT,
  content_generated BOOLEAN DEFAULT FALSE,
  posted BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_sessions_class ON course_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_course ON course_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_number ON course_sessions(session_number);
CREATE INDEX IF NOT EXISTS idx_course_sessions_scheduled ON course_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_course_sessions_created_by ON course_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_course_sessions_posted ON course_sessions(posted);

-- 3) Enable RLS on course_sessions
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;

-- 4) Create RLS policies for course_sessions
DO $$
BEGIN
  -- Policy for teachers to view sessions in their classes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_sessions'
      AND policyname = 'Teachers can view sessions in their classes'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Teachers can view sessions in their classes"
        ON course_sessions FOR SELECT
        USING (
          class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'teacher'
          )
        );
    $$;
  END IF;

  -- Policy for teachers to create sessions in their classes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_sessions'
      AND policyname = 'Teachers can create sessions in their classes'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Teachers can create sessions in their classes"
        ON course_sessions FOR INSERT
        WITH CHECK (
          class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'teacher'
          ) AND created_by = auth.uid()
        );
    $$;
  END IF;

  -- Policy for teachers to update sessions they created
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_sessions'
      AND policyname = 'Teachers can update their sessions'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Teachers can update their sessions"
        ON course_sessions FOR UPDATE
        USING (created_by = auth.uid())
        WITH CHECK (created_by = auth.uid());
    $$;
  END IF;

  -- Policy for teachers to delete sessions they created
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_sessions'
      AND policyname = 'Teachers can delete their sessions'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Teachers can delete their sessions"
        ON course_sessions FOR DELETE
        USING (created_by = auth.uid());
    $$;
  END IF;

  -- Policy for students to view posted sessions in their classes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_sessions'
      AND policyname = 'Students can view posted sessions in their classes'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Students can view posted sessions in their classes"
        ON course_sessions FOR SELECT
        USING (
          posted = TRUE AND
          class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'student'
          )
        );
    $$;
  END IF;
END$$;

-- 5) Update course_outlines to support class-based outlines
-- Add class_id field if it doesn't exist
ALTER TABLE course_outlines ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- Create index for class-based outlines
CREATE INDEX IF NOT EXISTS idx_course_outlines_class ON course_outlines(class_id);

-- Update RLS policies for course_outlines to support class-based access
DO $$
BEGIN
  -- Drop existing policy if present
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_outlines'
      AND policyname = 'Course creator can manage course_outlines'
  ) THEN
    EXECUTE 'DROP POLICY "Course creator can manage course_outlines" ON course_outlines;';
  END IF;

  -- Create new policy that supports both course-based and class-based outlines
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_outlines'
      AND policyname = 'Teachers can manage outlines for their courses or classes'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Teachers can manage outlines for their courses or classes"
        ON course_outlines FOR ALL
        USING (
          created_by = auth.uid() AND (
            course_id IN (
              SELECT id FROM courses
              WHERE created_by = auth.uid()
              AND class_id IN (
                SELECT class_id FROM class_members
                WHERE user_id = auth.uid() AND role = 'teacher'
              )
            )
            OR class_id IN (
              SELECT class_id FROM class_members
              WHERE user_id = auth.uid() AND role = 'teacher'
            )
          )
        )
        WITH CHECK (created_by = auth.uid());
    $$;
  END IF;
END$$;

-- 6) Create table for A2A session generation tracking
CREATE TABLE IF NOT EXISTS a2a_session_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  current_iteration INTEGER NOT NULL DEFAULT 0,
  max_iterations INTEGER NOT NULL DEFAULT 3,
  builder_feedback JSONB DEFAULT '[]'::jsonb,
  critic_feedback JSONB DEFAULT '[]'::jsonb,
  final_content JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7) Create table for chatbot workflow management
CREATE TABLE IF NOT EXISTS chatbot_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workflow_type VARCHAR(50) NOT NULL, -- 'session_creation', 'outline_generation', etc.
  context JSONB DEFAULT '{}'::jsonb,
  current_step VARCHAR(50) NOT NULL DEFAULT 'initial',
  tools_discovered JSONB DEFAULT '[]'::jsonb,
  tools_called JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8) Create table for AI tool registry and usage tracking
CREATE TABLE IF NOT EXISTS ai_tools_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_name VARCHAR(100) NOT NULL UNIQUE,
  tool_description TEXT,
  tool_category VARCHAR(50) NOT NULL,
  tool_schema JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9) Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_a2a_generations_session ON a2a_session_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_generations_created_by ON a2a_session_generations(created_by);
CREATE INDEX IF NOT EXISTS idx_a2a_generations_status ON a2a_session_generations(status);

CREATE INDEX IF NOT EXISTS idx_chatbot_workflows_user ON chatbot_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_workflows_type ON chatbot_workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_chatbot_workflows_status ON chatbot_workflows(status);

CREATE INDEX IF NOT EXISTS idx_ai_tools_name ON ai_tools_registry(tool_name);
CREATE INDEX IF NOT EXISTS idx_ai_tools_category ON ai_tools_registry(tool_category);

-- 10) Enable RLS on new tables
ALTER TABLE a2a_session_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools_registry ENABLE ROW LEVEL SECURITY;

-- 11) Create RLS policies for new tables
DO $$
BEGIN
  -- Policies for a2a_session_generations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'a2a_session_generations'
      AND policyname = 'Users can manage their own a2a generations'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can manage their own a2a generations"
        ON a2a_session_generations FOR ALL
        USING (created_by = auth.uid())
        WITH CHECK (created_by = auth.uid());
    $$;
  END IF;

  -- Policies for chatbot_workflows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chatbot_workflows'
      AND policyname = 'Users can manage their own chatbot workflows'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can manage their own chatbot workflows"
        ON chatbot_workflows FOR ALL
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    $$;
  END IF;

  -- Policies for ai_tools_registry (read-only for authenticated users)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_tools_registry'
      AND policyname = 'Authenticated users can read enabled tools'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Authenticated users can read enabled tools"
        ON ai_tools_registry FOR SELECT
        USING (enabled = TRUE);
    $$;
  END IF;

  -- Policy for service role to manage tools registry
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_tools_registry'
      AND policyname = 'Service role can manage tools registry'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Service role can manage tools registry"
        ON ai_tools_registry FOR ALL
        USING (auth.jwt() ->> 'role' = 'service_role')
        WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
    $$;
  END IF;
END$$;

-- 12) Insert default AI tools into registry
INSERT INTO ai_tools_registry (tool_name, tool_description, tool_category, tool_schema) VALUES
('create_session', 'Create a new course session', 'session_management', '{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "scheduled_date": {"type": "string"}, "duration_minutes": {"type": "number"}}}'::jsonb),
('update_session', 'Update an existing course session', 'session_management', '{"type": "object", "properties": {"session_id": {"type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}}}'::jsonb),
('delete_session', 'Delete a course session', 'session_management', '{"type": "object", "properties": {"session_id": {"type": "string"}}}'::jsonb),
('generate_outline', 'Generate a course outline using AI', 'ai_generation', '{"type": "object", "properties": {"requirements": {"type": "object"}, "target_audience": {"type": "string"}, "duration_weeks": {"type": "number"}}}'::jsonb),
('generate_session_content', 'Generate content for a specific session', 'ai_generation', '{"type": "object", "properties": {"session_id": {"type": "string"}, "content_type": {"type": "string"}, "specific_requirements": {"type": "string"}}}'::jsonb),
('a2a_session_generation', 'Run A2A (Agent-to-Agent) session generation', 'ai_generation', '{"type": "object", "properties": {"session_id": {"type": "string"}, "max_iterations": {"type": "number"}}}'::jsonb),
('get_class_sessions', 'Retrieve all sessions for a class', 'data_retrieval', '{"type": "object", "properties": {"class_id": {"type": "string"}}}'::jsonb),
('get_session_details', 'Retrieve detailed information about a session', 'data_retrieval', '{"type": "object", "properties": {"session_id": {"type": "string"}}}'::jsonb)
ON CONFLICT (tool_name) DO NOTHING;

-- 13) Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 14) Create triggers for updated_at columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_course_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_course_sessions_updated_at
      BEFORE UPDATE ON course_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_a2a_generations_updated_at'
  ) THEN
    CREATE TRIGGER update_a2a_generations_updated_at
      BEFORE UPDATE ON a2a_session_generations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_chatbot_workflows_updated_at'
  ) THEN
    CREATE TRIGGER update_chatbot_workflows_updated_at
      BEFORE UPDATE ON chatbot_workflows
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_ai_tools_updated_at'
  ) THEN
    CREATE TRIGGER update_ai_tools_updated_at
      BEFORE UPDATE ON ai_tools_registry
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- 15) Add comments for documentation
COMMENT ON TABLE course_sessions IS 'Stores course sessions scheduled for specific classes';
COMMENT ON TABLE a2a_session_generations IS 'Tracks A2A (Agent-to-Agent) session generation processes';
COMMENT ON TABLE chatbot_workflows IS 'Manages chatbot workflow state and progress';
COMMENT ON TABLE ai_tools_registry IS 'Registry of available AI tools with their schemas and metadata';

COMMENT ON COLUMN course_sessions.posted IS 'Whether the session is visible to students before scheduled date';
COMMENT ON COLUMN course_sessions.content_generated IS 'Whether AI-generated content has been created for this session';
COMMENT ON COLUMN a2a_session_generations.status IS 'Generation status: pending, running, completed, failed';
COMMENT ON COLUMN chatbot_workflows.workflow_type IS 'Type of workflow: session_creation, outline_generation, etc.';
COMMENT ON COLUMN ai_tools_registry.tool_category IS 'Tool category: session_management, ai_generation, data_retrieval, etc.';

-- Migration complete
-- This migration adds comprehensive session management, A2A generation tracking,
-- chatbot workflow management, and AI tools registry support.