-- Migration: Conversation State Management System
-- 创建时间: 2025-12-08
-- 用途: 为AI Chatbot工作流系统提供完整的对话状态管理

-- 对话状态表
CREATE TABLE conversation_states (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  workflow_type text NOT NULL, -- 'create_course', 'create_session', 'create_assignment', 'modify_course', etc.
  current_step integer NOT NULL DEFAULT 0,
  collected_data jsonb DEFAULT '{}',
  conversation_history jsonb DEFAULT '[]',
  status text DEFAULT 'active', -- 'active', 'completed', 'paused', 'error', 'cancelled'
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 创建索引
CREATE INDEX idx_conversation_states_user_id ON conversation_states(user_id);
CREATE INDEX idx_conversation_states_session_id ON conversation_states(session_id);
CREATE INDEX idx_conversation_states_workflow_type ON conversation_states(workflow_type);
CREATE INDEX idx_conversation_states_status ON conversation_states(status);

-- 对话步骤定义表
CREATE TABLE conversation_steps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_type text NOT NULL,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  step_type text NOT NULL, -- 'question', 'confirmation', 'generation', 'validation', 'tool_execution'
  prompt_template text NOT NULL,
  prompt_variables jsonb DEFAULT '{}',
  validation_rules jsonb DEFAULT '{}',
  next_step_conditions jsonb DEFAULT '{}',
  tool_associations jsonb DEFAULT '[]',
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_conversation_steps_workflow_type ON conversation_steps(workflow_type);
CREATE INDEX idx_conversation_steps_step_number ON conversation_steps(workflow_type, step_number);

-- 工具调用记录表
CREATE TABLE tool_call_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_state_id uuid REFERENCES conversation_states(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  tool_parameters jsonb NOT NULL,
  execution_result jsonb,
  execution_status text NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  error_message text,
  execution_time_ms integer,
  retries_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 创建索引
CREATE INDEX idx_tool_call_logs_conversation_state ON tool_call_logs(conversation_state_id);
CREATE INDEX idx_tool_call_logs_status ON tool_call_logs(execution_status);
CREATE INDEX idx_tool_call_logs_tool_name ON tool_call_logs(tool_name);

-- 工作流定义表
CREATE TABLE workflows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL,
  description text,
  steps_definition jsonb NOT NULL,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_workflows_type ON workflows(type);
CREATE INDEX idx_workflows_active ON workflows(is_active);

-- 工作流执行实例表
CREATE TABLE workflow_executions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  conversation_state_id uuid REFERENCES conversation_states(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  current_step integer DEFAULT 0,
  execution_data jsonb DEFAULT '{}',
  result_data jsonb DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

-- 创建索引
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);

-- 课程大纲表
CREATE TABLE course_outlines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_state_id uuid REFERENCES conversation_states(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  requirements jsonb NOT NULL,
  chapters jsonb NOT NULL,
  status text DEFAULT 'draft', -- 'draft', 'reviewing', 'approved', 'rejected'
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  approved_at timestamptz
);

-- 创建索引
CREATE INDEX idx_course_outlines_class_id ON course_outlines(class_id);
CREATE INDEX idx_course_outlines_status ON course_outlines(status);
CREATE INDEX idx_course_outlines_created_by ON course_outlines(created_by);

-- A2A生成记录表
CREATE TABLE a2a_generations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_state_id uuid REFERENCES conversation_states(id) ON DELETE CASCADE,
  session_id uuid REFERENCES course_sessions(id) ON DELETE CASCADE,
  iteration_number integer NOT NULL,
  teacher_content jsonb,
  student_feedback jsonb,
  final_components jsonb,
  status text DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 创建索引
CREATE INDEX idx_a2a_generations_session_id ON a2a_generations(session_id);
CREATE INDEX idx_a2a_generations_status ON a2a_generations(status);

-- 工具注册表
CREATE TABLE ai_tools_registry (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_name text UNIQUE NOT NULL,
  tool_description text NOT NULL,
  tool_schema jsonb NOT NULL,
  enabled boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT_at timestampt now(),
  updated);

-- 创建索引z DEFAULT now()

CREATE INDEX idx_ai_tools_registry_enabled ON ai_tools_registry(enabled);
CREATE INDEX idx_ai_tools_registry_usage ON ai_tools_registry(usage_count);

-- 启用RLS (Row Level Security)
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools_registry ENABLE ROW LEVEL SECURITY;

-- RLS策略：用户只能访问自己的对话状态
CREATE POLICY "Users can only access their own conversation states"
ON conversation_states FOR ALL
USING (auth.uid() = user_id);

-- RLS策略：工具调用日志只能由对话所有者访问
CREATE POLICY "Tool call logs are accessible to conversation owners"
ON tool_call_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM conversation_states
    WHERE id = conversation_state_id
    AND user_id = auth.uid()
  )
);

-- RLS策略：工作流执行只能由用户自己访问
CREATE POLICY "Users can only access their own workflow executions"
ON workflow_executions FOR ALL
USING (auth.uid() = user_id);

-- RLS策略：课程大纲只能由创建者访问
CREATE POLICY "Users can only access their own course outlines"
ON course_outlines FOR ALL
USING (auth.uid() = created_by);

-- RLS策略：A2A生成记录只能由相关用户访问
CREATE POLICY "Users can only access their own a2a generations"
ON a2a_generations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM conversation_states
    WHERE id = conversation_state_id
    AND user_id = auth.uid()
  )
);

-- RLS策略：ai_tools_registry所有人都可以读取，但只有管理员可以修改
CREATE POLICY "Anyone can read enabled tools"
ON ai_tools_registry FOR SELECT
USING (enabled = true);

-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间戳触发器
CREATE TRIGGER update_conversation_states_updated_at
    BEFORE UPDATE ON conversation_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_outlines_updated_at
    BEFORE UPDATE ON course_outlines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_tools_registry_updated_at
    BEFORE UPDATE ON ai_tools_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认工作流定义
INSERT INTO workflows (name, type, description, steps_definition) VALUES
('Create Course', 'create_course', 'Complete course creation workflow with 8-step confirmation process', '[
  {
    "stepNumber": 1,
    "type": "question",
    "prompt": "你好！我将帮助你为课程创建一个详细的教学日程安排。让我们开始收集一些信息。首先，请告诉我：**这门课程的主题和主要学习目标是什么？**",
    "validation": {"minLength": 10}
  },
  {
    "stepNumber": 2,
    "type": "question",
    "prompt": "好的，我了解了课程主题。**您希望这门课程有多少节课？**\nA) 4节课\nB) 8节课\nC) 12节课\nD) 其他（请具体说明）",
    "options": ["A", "B", "C", "D"]
  },
  {
    "stepNumber": 3,
    "type": "question",
    "prompt": "好的，课程数量已确认。**您希望每周上几次课？**\nA) 每周一次\nB) 每周两次\nC) 每周三次\nD) 其他（请具体说明）",
    "options": ["A", "B", "C", "D"]
  },
  {
    "stepNumber": 4,
    "type": "question",
    "prompt": "好的，上课频率已确定。**您希望在哪几天上课？**（根据您选择的频率）",
    "validation": {"required": true}
  },
  {
    "stepNumber": 5,
    "type": "question",
    "prompt": "很好！现在请告诉我**您希望课程什么时候开始？**（请提供具体日期，格式：YYYY-MM-DD）",
    "validation": {"dateFormat": "YYYY-MM-DD"}
  },
  {
    "stepNumber": 6,
    "type": "question",
    "prompt": "好的，开始日期已确定。**您希望每节课在什么时间进行？**\nA) 上午 (9:00 AM)\nB) 下午 (2:00 PM)\nC) 晚上 (6:00 PM)\nD) 其他（请具体说明）",
    "options": ["A", "B", "C", "D"]
  },
  {
    "stepNumber": 7,
    "type": "question",
    "prompt": "好的，上课时间已确认。**您希望每节课多长时间？**\nA) 45分钟\nB) 90分钟\nC) 120分钟\nD) 其他（请具体说明）",
    "options": ["A", "B", "C", "D"]
  },
  {
    "stepNumber": 8,
    "type": "question",
    "prompt": "很好！现在请为每个课程节次提供简要的主题或内容概要。我将为每个节次生成一个详细的大纲。\n\n请按顺序列出每节课的主题：",
    "validation": {"minLength": 20}
  }
]'),

('Create Assignment', 'create_assignment', 'Assignment creation workflow with three types support', '[
  {
    "stepNumber": 1,
    "type": "question",
    "prompt": "我将帮您创建作业。请选择作业类型：\nA) Quiz (选择题、填空题等)\nB) Writing Assignment (写作作业)\nC) Research Assignment (研究作业)",
    "options": ["A", "B", "C"]
  }
]'),

('A2A Session Generation', 'a2a_session', 'A2A iterative content generation workflow', '[
  {
    "stepNumber": 1,
    "type": "confirmation",
    "prompt": "我将为您生成Session内容。这将使用A2A（Agent-to-Agent）三层迭代优化：\n1. 教师代理生成内容\n2. 学生代理审查反馈\n3. 内容优化完善\n\n是否开始？",
    "options": ["是", "否"]
  }
]');

-- 插入默认工具定义
INSERT INTO ai_tools_registry (tool_name, tool_description, tool_schema) VALUES
('generate_outline', 'Generate course outline based on collected requirements', '{
  "type": "object",
  "properties": {
    "requirements": {"type": "object"},
    "class_id": {"type": "string"},
    "save_to_class": {"type": "boolean"}
  },
  "required": ["requirements"]
}'),

('create_session', 'Create a new session for a class', '{
  "type": "object",
  "properties": {
    "class_id": {"type": "string"},
    "title": {"type": "string"},
    "description": {"type": "string"},
    "scheduled_date": {"type": "string"},
    "duration_minutes": {"type": "number"},
    "location": {"type": "string"}
  },
  "required": ["class_id", "title", "scheduled_date"]
}'),

('update_session', 'Update an existing session', '{
  "type": "object",
  "properties": {
    "session_id": {"type": "string"},
    "updates": {"type": "object"}
  },
  "required": ["session_id"]
}'),

('delete_session', 'Delete a session', '{
  "type": "object",
  "properties": {
    "session_id": {"type": "string"}
  },
  "required": ["session_id"]
}'),

('generate_session_content', 'Generate content for a session using A2A', '{
  "type": "object",
  "properties": {
    "session_id": {"type": "string"},
    "content_type": {"type": "string"},
    "specific_requirements": {"type": "object"}
  },
  "required": ["session_id"]
}'),

('create_quiz_assignment', 'Create a quiz assignment with multiple question types', '{
  "type": "object",
  "properties": {
    "class_id": {"type": "string"},
    "title": {"type": "string"},
    "description": {"type": "string"},
    "question_types": {"type": "array"},
    "difficulty": {"type": "string"}
  },
  "required": ["class_id", "title"]
}'),

('create_writing_assignment', 'Create a writing assignment', '{
  "type": "object",
  "properties": {
    "class_id": {"type": "string"},
    "title": {"type": "string"},
    "description": {"type": "string"},
    "word_limit": {"type": "number"},
    "format_requirements": {"type": "string"}
  },
  "required": ["class_id", "title"]
}'),

('create_research_assignment', 'Create a research assignment', '{
  "type": "object",
  "properties": {
    "class_id": {"type": "string"},
    "title": {"type": "string"},
    "description": {"type": "string"},
    "research_guidelines": {"type": "string"},
    "word_limit": {"type": "number"},
    "ai_assistance_allowed": {"type": "boolean"}
  },
  "required": ["class_id", "title"]
}'),

('get_class_sessions', 'Get all sessions for a class', '{
  "type": "object",
  "properties": {
    "class_id": {"type": "string"}
  },
  "required": ["class_id"]
}'),

('get_session_details', 'Get detailed information about a session', '{
  "type": "object",
  "properties": {
    "session_id": {"type": "string"}
  },
  "required": ["session_id"]
}');

-- 插入默认对话步骤定义
INSERT INTO conversation_steps (workflow_type, step_number, step_name, step_type, prompt_template, validation_rules, next_step_conditions) VALUES
('create_course', 1, 'Course Topic and Objectives', 'question', '你好！我将帮助你为课程创建一个详细的教学日程安排。让我们开始收集一些信息。首先，请告诉我：**这门课程的主题和主要学习目标是什么？**', '{"minLength": 10}', '{"success": 2}'),
('create_course', 2, 'Session Count', 'question', '好的，我了解了课程主题。**您希望这门课程有多少节课？**\nA) 4节课\nB) 8节课\nC) 12节课\nD) 其他（请具体说明）', '{"options": ["A", "B", "C", "D"]}', '{"success": 3}'),
('create_course', 3, 'Class Frequency', 'question', '好的，课程数量已确认。**您希望每周上几次课？**\nA) 每周一次\nB) 每周两次\nC) 每周三次\nD) 其他（请具体说明）', '{"options": ["A", "B", "C", "D"]}', '{"success": 4}'),
('create_course', 4, 'Days of Week', 'question', '好的，上课频率已确定。**您希望在哪几天上课？**（根据您选择的频率）', '{"required": true}', '{"success": 5}'),
('create_course', 5, 'Start Date', 'question', '很好！现在请告诉我**您希望课程什么时候开始？**（请提供具体日期，格式：YYYY-MM-DD）', '{"dateFormat": "YYYY-MM-DD"}', '{"success": 6}'),
('create_course', 6, 'Class Time', 'question', '好的，开始日期已确定。**您希望每节课在什么时间进行？**\nA) 上午 (9:00 AM)\nB) 下午 (2:00 PM)\nC) 晚上 (6:00 PM)\nD) 其他（请具体说明）', '{"options": ["A", "B", "C", "D"]}', '{"success": 7}'),
('create_course', 7, 'Session Duration', 'question', '好的，上课时间已确认。**您希望每节课多长时间？**\nA) 45分钟\nB) 90分钟\nC) 120分钟\nD) 其他（请具体说明）', '{"options": ["A", "B", "C", "D"]}', '{"success": 8}'),
('create_course', 8, 'Session Topics', 'question', '很好！现在请为每个课程节次提供简要的主题或内容概要。我将为每个节次生成一个详细的大纲。请按顺序列出每节课的主题：', '{"minLength": 20}', '{"success": "complete"}');

-- 完成迁移
COMMENT ON TABLE conversation_states IS 'Stores conversation state for AI chatbot workflows';
COMMENT ON TABLE tool_call_logs IS 'Logs all tool executions during conversations';
COMMENT ON TABLE course_outlines IS 'Stores generated course outlines with chapters';
COMMENT ON TABLE a2a_generations IS 'Tracks A2A iterative content generation iterations';
