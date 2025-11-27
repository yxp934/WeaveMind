-- Phase 6: Student Component-Level AI Assistant
-- Create tables for storing per-student, per-component conversation history

-- Student AI conversations table
-- Stores conversation sessions between students and AI at the component level
CREATE TABLE IF NOT EXISTS student_ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student AI messages table
-- Stores individual messages in a conversation
CREATE TABLE IF NOT EXISTS student_ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES student_ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_ai_conversations_student
  ON student_ai_conversations(student_id);

CREATE INDEX IF NOT EXISTS idx_student_ai_conversations_component
  ON student_ai_conversations(component_id);

CREATE INDEX IF NOT EXISTS idx_student_ai_messages_conversation
  ON student_ai_messages(conversation_id);

-- RLS Policies for student_ai_conversations
ALTER TABLE student_ai_conversations ENABLE ROW LEVEL SECURITY;

-- Students can only view their own conversations
CREATE POLICY "Students can view own conversations"
  ON student_ai_conversations
  FOR SELECT
  USING (auth.uid() = student_id);

-- Students can create their own conversations
CREATE POLICY "Students can create own conversations"
  ON student_ai_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Teachers can view conversations for courses in their classes
CREATE POLICY "Teachers can view class conversations"
  ON student_ai_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN classes cl ON c.class_id = cl.id
      JOIN organization_members om ON cl.organization_id = om.organization_id
      JOIN profiles p ON om.user_id = p.id
      WHERE c.id = student_ai_conversations.course_id
        AND p.id = auth.uid()
        AND p.role = 'teacher'
    )
  );

-- RLS Policies for student_ai_messages
ALTER TABLE student_ai_messages ENABLE ROW LEVEL SECURITY;

-- Students can view messages in their own conversations
CREATE POLICY "Students can view own messages"
  ON student_ai_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_ai_conversations
      WHERE student_ai_conversations.id = student_ai_messages.conversation_id
        AND student_ai_conversations.student_id = auth.uid()
    )
  );

-- Students can create messages in their own conversations
CREATE POLICY "Students can create own messages"
  ON student_ai_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_ai_conversations
      WHERE student_ai_conversations.id = student_ai_messages.conversation_id
        AND student_ai_conversations.student_id = auth.uid()
    )
  );

-- Teachers can view messages in conversations for their classes
CREATE POLICY "Teachers can view class messages"
  ON student_ai_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_ai_conversations sac
      JOIN courses c ON sac.course_id = c.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN organization_members om ON cl.organization_id = om.organization_id
      JOIN profiles p ON om.user_id = p.id
      WHERE sac.id = student_ai_messages.conversation_id
        AND p.id = auth.uid()
        AND p.role = 'teacher'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE student_ai_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when new message is added
CREATE TRIGGER update_conversation_timestamp
  AFTER INSERT ON student_ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_student_ai_conversation_timestamp();

