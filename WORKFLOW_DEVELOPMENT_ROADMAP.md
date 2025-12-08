# WeaveMind AI Chatbot 工作流开发Roadmap

## 项目概述

基于调查结果，需要完整实现WeaveMind AI Chatbot的6个核心工作流系统，当前实现只有UI恢复，缺少100%的核心工作流功能。

## 开发原则

1. **仅后端AI工程** - 不改变前端UI（除工具调用消息气泡）
2. **零预设消息** - 所有回复基于模型能力、工具调用和提示词
3. **本地优先** - 本地测试无误后再部署production
4. **零容忍错误** - 所有问题必须立即解决，不能跳过

## 开发Roadmap

### Phase 1: 对话流程管理系统

#### 1.1 对话状态数据库结构
**文件**: `supabase/migrations/030_conversation_state_management.sql`
```sql
-- 对话状态表
CREATE TABLE conversation_states (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  session_id text NOT NULL,
  workflow_type text NOT NULL, -- 'create_course', 'create_session', etc.
  current_step integer NOT NULL DEFAULT 0,
  collected_data jsonb DEFAULT '{}',
  conversation_history jsonb DEFAULT '[]',
  status text DEFAULT 'active', -- 'active', 'completed', 'paused', 'error'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 对话步骤定义表
CREATE TABLE conversation_steps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_type text NOT NULL,
  step_number integer NOT NULL,
  step_type text NOT NULL, -- 'question', 'confirmation', 'generation', 'validation'
  prompt_template text NOT NULL,
  validation_rules jsonb DEFAULT '{}',
  next_step_conditions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 工具调用记录表
CREATE TABLE tool_call_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_state_id uuid REFERENCES conversation_states(id),
  tool_name text NOT NULL,
  tool_parameters jsonb NOT NULL,
  execution_result jsonb,
  execution_status text NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  error_message text,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- RLS策略
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own conversation states"
ON conversation_states FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Tool call logs are accessible to conversation owners"
ON tool_call_logs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversation_states
    WHERE id = conversation_state_id
    AND user_id = auth.uid()
  )
);
```

#### 1.2 对话状态管理API
**文件**: `app/api/conversation/state/route.ts`
- `GET /api/conversation/state` - 获取当前对话状态
- `POST /api/conversation/state` - 创建新对话状态
- `PUT /api/conversation/state` - 更新对话状态
- `DELETE /api/conversation/state` - 清理对话状态

**文件**: `lib/conversation/state-manager.ts`
```typescript
interface ConversationState {
  id: string
  userId: string
  sessionId: string
  workflowType: string
  currentStep: number
  collectedData: Record<string, any>
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    toolCalls?: ToolCall[]
  }>
  status: 'active' | 'completed' | 'paused' | 'error'
}

class StateManager {
  async createState(userId: string, workflowType: string): Promise<ConversationState>
  async getState(sessionId: string): Promise<ConversationState | null>
  async updateState(sessionId: string, updates: Partial<ConversationState>): Promise<void>
  async addMessage(sessionId: string, message: ConversationMessage): Promise<void>
  async markComplete(sessionId: string): Promise<void>
  async cleanup(sessionId: string): Promise<void>
}
```

### Phase 2: 工具调用和执行系统

#### 2.1 工具注册和管理
**文件**: `app/api/ai/tools/register/route.ts`
- 工具注册API
- 工具验证和启用/禁用
- 工具使用统计

**文件**: `lib/ai/tools/tool-registry.ts`
```typescript
interface ToolDefinition {
  name: string
  description: string
  parameters: ParameterDefinition[]
  execute: (params: any, context: ToolContext) => Promise<ToolResult>
  validate?: (params: any) => ValidationResult
}

interface ToolContext {
  userId: string
  conversationState: ConversationState
  supabase: SupabaseClient
  openai: OpenAI
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()

  register(tool: ToolDefinition): void
  get(name: string): ToolDefinition | null
  list(): ToolDefinition[]
  async execute(name: string, params: any, context: ToolContext): Promise<ToolResult>
}

export const toolRegistry = new ToolRegistry()
```

#### 2.2 核心工具实现
**文件**: `lib/ai/tools/create-course.ts`
- `createCourseOutline` - 生成课程大纲
- `validateCourseRequirements` - 验证课程需求
- `saveCourseToDatabase` - 保存课程到数据库

**文件**: `lib/ai/tools/create-session.ts`
- `generateSessionsFromOutline` - 从大纲生成sessions
- `validateSessionData` - 验证session数据
- `saveSessionsToDatabase` - 保存sessions到数据库

**文件**: `lib/ai/tools/create-assignment.ts`
- `createQuizAssignment` - 创建quiz作业
- `createWritingAssignment` - 创建写作作业
- `createResearchAssignment` - 创建研究作业

#### 2.3 工具调用API
**文件**: `app/api/ai/tools/execute/route.ts`
```typescript
interface ToolExecutionRequest {
  toolName: string
  parameters: Record<string, any>
  sessionId: string
}

interface ToolExecutionResponse {
  success: boolean
  result?: any
  error?: string
  executionTime: number
  toolCallId: string
}
```

### Phase 3: 创建课程工作流

#### 3.1 对话流程定义
**文件**: `lib/ai/workflows/create-course-flow.ts`
```typescript
const CREATE_COURSE_STEPS = [
  {
    stepNumber: 1,
    type: 'question',
    prompt: `你好！我将帮助你为课程创建一个详细的教学日程安排。

让我们开始收集一些信息。首先，请告诉我：

**这门课程的主题和主要学习目标是什么？**

（请简要描述课程内容和你希望学生达到的学习目标）`,
    validation: (input: string) => input.length > 10,
    nextStep: (input: string) => 2
  },
  {
    stepNumber: 2,
    type: 'question',
    prompt: `好的，我了解了课程主题。

**您希望这门课程有多少节课？**

A) 4节课
B) 8节课
C) 12节课
D) 其他（请具体说明）`,
    options: ['A', 'B', 'C', 'D'],
    validation: (input: string) => /^[ABCD]$/.test(input.trim()),
    nextStep: (input: string) => 3
  },
  {
    stepNumber: 3,
    type: 'question',
    prompt: `好的，课程数量已确认。

**您希望每周上几次课？**

A) 每周一次
B) 每周两次
C) 每周三次
D) 其他（请具体说明）`,
    options: ['A', 'B', 'C', 'D'],
    validation: (input: string) => /^[ABCD]$/.test(input.trim()),
    nextStep: (input: string) => 4
  },
  // ... 继续定义步骤4-8
]
```

#### 3.2 工作流执行引擎
**文件**: `lib/ai/workflows/workflow-engine.ts`
```typescript
class WorkflowEngine {
  private stateManager: StateManager
  private toolRegistry: ToolRegistry

  async startWorkflow(userId: string, workflowType: string): Promise<string>
  async processUserInput(sessionId: string, userInput: string): Promise<WorkflowResponse>
  async executeToolCall(sessionId: string, toolName: string, params: any): Promise<ToolResult>
  async generateResponse(sessionId: string): Promise<string>
  async validateInput(sessionId: string, input: string): Promise<ValidationResult>
  async transitionToNextStep(sessionId: string): Promise<void>
  async completeWorkflow(sessionId: string): Promise<void>
}

interface WorkflowResponse {
  message: string
  toolCalls?: ToolCall[]
  isComplete: boolean
  nextStep?: number
  requiresConfirmation?: boolean
}
```

#### 3.3 课程创建API端点
**文件**: `app/api/ai/workflows/create-course/route.ts`
```typescript
export async function POST(request: NextRequest) {
  // 1. 验证用户身份
  // 2. 获取或创建对话状态
  // 3. 处理用户输入
  // 4. 执行工作流步骤
  // 5. 生成AI响应
  // 6. 返回结果
}
```

### Phase 4: Outline生成和确认系统

#### 4.1 Outline生成工具
**文件**: `lib/ai/tools/outline-generator.ts`
```typescript
interface OutlineGenerationRequest {
  courseTopic: string
  learningObjectives: string[]
  targetAudience: string
  totalSessions: number
  sessionTopics: string[]
  teachingMethod: string
  additionalRequirements?: string
}

interface OutlineChapter {
  id: string
  sessionNumber: number
  title: string
  description: string
  objectives: string[]
  content: string
  duration: string
}

class OutlineGenerator {
  async generate(request: OutlineGenerationRequest): Promise<OutlineChapter[]>
  async validate(outline: OutlineChapter[]): Promise<ValidationResult>
  async saveToDatabase(outline: OutlineChapter[], classId: string): Promise<void>
}
```

#### 4.2 用户确认循环
**文件**: `lib/ai/workflows/outline-review-flow.ts`
```typescript
class OutlineReviewFlow {
  async generateOutline(request: OutlineGenerationRequest): Promise<OutlineChapter[]>
  async presentForReview(outline: OutlineChapter[]): Promise<string>
  async processFeedback(feedback: string): Promise<'accept' | 'revise' | 'regenerate'>
  async incorporateChanges(outline: OutlineChapter[], changes: string): Promise<OutlineChapter[]>
  async confirmFinal(outline: OutlineChapter[]): Promise<boolean>
}
```

### Phase 5: A2A Session生成工作流

#### 5.1 A2A迭代引擎
**文件**: `lib/ai/workflows/a2a-session-engine.ts`
```typescript
interface A2AContext {
  className: string
  sessionNumber: number
  sessionTitle: string
  sessionDescription: string
  outlineChapter: OutlineChapter
  previousSessions: SessionSummary[]
}

class A2ASessionEngine {
  async startA2AGeneration(context: A2AContext): Promise<ReadableStream>
  async teacherGenerate(context: A2AContext, iteration: number, feedback?: string): Promise<Component[]>
  async studentReview(components: Component[], context: A2AContext): Promise<StudentFeedback>
  async refineContent(components: Component[], feedback: StudentFeedback): Promise<Component[]>
}

interface Component {
  id: string
  type: 'text' | 'image' | 'video' | 'question' | 'interactive'
  content: any
  order: number
}
```

#### 5.2 流式响应处理
**文件**: `app/api/ai/workflows/a2a-session/route.ts`
```typescript
export async function POST(request: NextRequest) {
  // 返回ReadableStream支持实时更新
  const stream = new ReadableStream({
    start(controller) {
      // 发送迭代开始事件
      // 发送教师生成内容
      // 发送学生反馈
      // 发送迭代完成事件
      // 重复3轮
      // 发送最终结果
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  })
}
```

### Phase 6: Assignment三种形式创建

#### 6.1 Quiz生成工作流
**文件**: `lib/ai/workflows/quiz-creation-flow.ts`
```typescript
class QuizCreationFlow {
  async startQuizCreation(sessionId: string): Promise<string>
  async processQuizType(type: string): Promise<string>
  async generateQuestions(sessionId: string, questionTypes: string[]): Promise<QuizQuestion[]>
  async presentForReview(questions: QuizQuestion[]): Promise<string>
  async incorporateChanges(questions: QuizQuestion[], changes: string): Promise<QuizQuestion[]>
  async saveQuiz(questions: QuizQuestion[]): Promise<string>
}

interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'fill_blank' | 'code' | 'linking'
  question: string
  options?: string[]
  correct_answer: string | string[]
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}
```

#### 6.2 Writing Assignment工作流
**文件**: `lib/ai/workflows/writing-assignment-flow.ts`
```typescript
class WritingAssignmentFlow {
  async startWritingAssignment(classId: string): Promise<string>
  async collectRequirements(requirements: WritingRequirements): Promise<string>
  async generatePrompt(promptData: WritingRequirements): Promise<string>
  async setupGradingCriteria(criteria: GradingCriteria): Promise<string>
  async saveAssignment(assignment: WritingAssignment): Promise<string>
}

interface WritingRequirements {
  title: string
  description: string
  wordLimit: number
  formatRequirements: string
  rubric: RubricItem[]
}
```

#### 6.3 Research Assignment工作流
**文件**: `lib/ai/workflows/research-assignment-flow.ts`
```typescript
class ResearchAssignmentFlow {
  async startResearchAssignment(classId: string): Promise<string>
  async collectResearchTopic(topic: string): Promise<string>
  async defineResearchGuidelines(guidelines: ResearchGuidelines): Promise<string>
  async setupSourcesRequirement(sources: SourceRequirement[]): Promise<string>
  async configureAIAccess(aiAllowed: boolean): Promise<string>
  async saveAssignment(assignment: ResearchAssignment): Promise<string>
}
```

### Phase 7: 提示词管理系统

#### 7.1 提示词模板库
**文件**: `lib/ai/prompts/workflow-prompts.ts`
```typescript
export const COURSE_CREATION_SYSTEM_PROMPT = `
You are an expert educational planner helping teachers create effective courses.
Your role is to guide teachers through a structured conversation to gather all necessary information.

CRITICAL GUIDELINES:
- ALWAYS use multiple choice questions (A, B, C, D format) after the initial question
- Ask ONE question at a time
- Provide 3-4 clear options for each question
- Include an "Other (please specify)" option when appropriate
- Be encouraging and concise
- Summarize what you've learned periodically

[继续定义所有提示词...]
`

export const OUTLINE_GENERATION_PROMPT = `
You are an expert curriculum designer. Based on the requirements provided, generate a comprehensive course outline.

[定义outline生成提示词...]
`

export const A2A_TEACHER_AGENT_PROMPT = `
You are a Teacher Agent responsible for creating educational content.

[定义教师代理提示词...]
`

export const A2A_STUDENT_AGENT_PROMPT = `
You are a Student Agent responsible for reviewing educational content from a learner's perspective.

[定义学生代理提示词...]
`
```

#### 7.2 动态提示词构建
**文件**: `lib/ai/prompts/prompt-builder.ts`
```typescript
class PromptBuilder {
  buildCourseCreationPrompt(stepNumber: number, context: CourseCreationContext): string
  buildOutlineGenerationPrompt(requirements: OutlineRequirements): string
  buildA2ATeacherPrompt(context: A2AContext, iteration: number): string
  buildA2AStudentPrompt(context: A2AContext): string
  buildAssignmentGenerationPrompt(assignmentType: string, context: AssignmentContext): string
}
```

### Phase 8: 数据库架构完善

#### 8.1 工作流相关表结构
**文件**: `supabase/migrations/031_workflow_system_tables.sql`
```sql
-- 工作流定义表
CREATE TABLE workflows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL,
  steps jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 工作流执行实例表
CREATE TABLE workflow_executions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id uuid REFERENCES workflows(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text DEFAULT 'active',
  current_step integer DEFAULT 0,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 课程大纲表
CREATE TABLE course_outlines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id),
  title text NOT NULL,
  description text,
  chapters jsonb NOT NULL,
  requirements jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- A2A生成记录表
CREATE TABLE a2a_generations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid REFERENCES course_sessions(id),
  iteration_number integer NOT NULL,
  teacher_content jsonb,
  student_feedback jsonb,
  final_components jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- RLS策略
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_generations ENABLE ROW LEVEL SECURITY;
```

### Phase 9: 错误处理和恢复机制

#### 9.1 错误分类和处理
**文件**: `lib/ai/errors/error-handler.ts`
```typescript
enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  TOOL_EXECUTION_ERROR = 'tool_execution_error',
  WORKFLOW_STATE_ERROR = 'workflow_state_error',
  AI_GENERATION_ERROR = 'ai_generation_error',
  DATABASE_ERROR = 'database_error'
}

class ErrorHandler {
  async handleError(error: Error, context: ErrorContext): Promise<ErrorResponse>
  async recoverFromError(error: Error, sessionId: string): Promise<boolean>
  async logError(error: Error, context: ErrorContext): Promise<void>
  async notifyUser(error: Error, sessionId: string): Promise<void>
}
```

#### 9.2 工作流恢复机制
**文件**: `lib/ai/workflows/workflow-recovery.ts`
```typescript
class WorkflowRecovery {
  async saveCheckpoint(sessionId: string, checkpointData: CheckpointData): Promise<void>
  async restoreFromCheckpoint(sessionId: string): Promise<CheckpointData | null>
  async handleInterruption(sessionId: string): Promise<void>
  async resumeWorkflow(sessionId: string): Promise<void>
}
```

### Phase 10: 本地测试框架

#### 10.1 工作流测试套件
**文件**: `tests/workflows/create-course.test.ts`
```typescript
describe('Create Course Workflow', () => {
  test('should complete full 8-step conversation flow')
  test('should handle validation errors gracefully')
  test('should recover from tool execution failures')
  test('should generate valid outline')
  test('should save course to database correctly')
})

describe('A2A Session Generation', () => {
  test('should complete 3-iteration A2A loop')
  test('should stream responses correctly')
  test('should handle teacher-student agent interaction')
  test('should generate valid components')
})

describe('Assignment Creation', () => {
  test('should create quiz assignment with all question types')
  test('should create writing assignment with rubric')
  test('should create research assignment with guidelines')
})
```

#### 10.2 集成测试
**文件**: `tests/integration/workflow-integration.test.ts`
```typescript
describe('Workflow Integration', () => {
  test('should integrate create course -> outline -> sessions -> assignments')
  test('should maintain state across workflow transitions')
  test('should handle concurrent user sessions')
  test('should validate all database operations')
})
```

## 开发时间线

### Week 1: 基础设施
- [ ] Phase 1: 对话状态管理系统
- [ ] Phase 2: 工具调用和执行系统基础

### Week 2: 核心工作流
- [ ] Phase 3: 创建课程工作流
- [ ] Phase 4: Outline生成和确认系统

### Week 3: 高级功能
- [ ] Phase 5: A2A Session生成工作流
- [ ] Phase 6: Assignment三种形式创建

### Week 4: 完善和测试
- [ ] Phase 7-9: 提示词管理、数据库完善、错误处理
- [ ] Phase 10: 本地测试和调试
- [ ] 生产环境部署和测试

## 关键成功指标

1. **零预设消息** - 所有AI回复基于真实模型能力和工具调用
2. **完整工作流** - 6个核心工作流100%功能实现
3. **零错误容忍** - 所有问题立即解决，无fallback
4. **生产就绪** - 本地测试无误后部署production

## 风险和缓解措施

### 高风险
1. **AI模型响应不稳定** - 实施重试机制和错误恢复
2. **工具调用失败** - 实现详细的错误日志和回退策略
3. **工作流状态丢失** - 实施检查点和恢复机制

### 缓解措施
1. **全面测试覆盖** - 单元测试、集成测试、端到端测试
2. **渐进式开发** - 每个phase完成后进行充分测试
3. **实时监控** - 实施详细的日志和监控机制

## 开始开发

现在开始实施Phase 1: 对话状态管理系统。

**第一个任务**: 创建对话状态数据库迁移文件
