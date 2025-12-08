-- Migration: Workflow System Tables
-- 创建时间: 2025-12-08
-- 用途: 为AI Chatbot工作流系统添加缺失的表

-- 对话状态表
CREATE TABLE IF NOT EXISTS conversation_states (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  workflow_type text NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  collected_data jsonb DEFAULT '{}',
  conversation_history jsonb DEFAULT '[]',
  status text DEFAULT 'active',
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 对话步骤定义表
CREATE TABLE IF NOT EXISTS conversation_steps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_type text NOT NULL,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  step_type text NOT NULL,
  prompt_template text NOT NULL,
  prompt_variables jsonb DEFAULT '{}',
  validation_rules jsonb DEFAULT '{}',
  next_step_conditions jsonb DEFAULT '{}',
  tool_associations jsonb DEFAULT '[]',
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 工具调用记录表
CREATE TABLE IF NOT EXISTS tool_call_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_state_id uuid REFERENCES conversation_states(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  tool_parameters jsonb NOT NULL,
  execution_result jsonb,
  execution_status text NOT NULL DEFAULT 'pending',
  error_message text,
  execution_time_ms integer,
  retries_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 工作流定义表
CREATE TABLE IF NOT EXISTS workflows (
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

-- 工作流执行实例表
CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  conversation_state_id uuid REFERENCES conversation_states(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  current_step integer DEFAULT 0,
  execution_data jsonb DEFAULT '{}',
  result_data jsonb DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_conversation_states_user_id ON conversation_states(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_states_session_id ON conversation_states(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_states_workflow_type ON conversation_states(workflow_type);
CREATE INDEX IF NOT EXISTS idx_conversation_states_status ON conversation_states(status);

CREATE INDEX IF NOT EXISTS idx_conversation_steps_workflow_type ON conversation_steps(workflow_type);
CREATE INDEX IF NOT EXISTS idx_conversation_steps_step_number ON conversation_steps(workflow_type, step_number);

CREATE INDEX IF NOT EXISTS idx_tool_call_logs_conversation_state ON tool_call_logs(conversation_state_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_logs_status ON tool_call_logs(execution_status);
CREATE INDEX IF NOT EXISTS idx_tool_call_logs_tool_name ON tool_call_logs(tool_name);

CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(type);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- 启用RLS
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS策略
-- 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "Users can only access their own conversation states" ON conversation_states;
DROP POLICY IF EXISTS "Tool call logs are accessible to conversation owners" ON tool_call_logs;
DROP POLICY IF EXISTS "Users can only access their own workflow executions" ON workflow_executions;

-- 创建新的RLS策略
CREATE POLICY "Users can only access their own conversation states"
ON conversation_states FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Tool call logs are accessible to conversation owners"
ON tool_call_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM conversation_states
    WHERE id = conversation_state_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can only access their own workflow executions"
ON workflow_executions FOR ALL
USING (auth.uid() = user_id);

-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间戳触发器
DROP TRIGGER IF EXISTS update_conversation_states_updated_at ON conversation_states;
CREATE TRIGGER update_conversation_states_updated_at
    BEFORE UPDATE ON conversation_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
