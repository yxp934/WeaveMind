# AI Chatbot工作流工具API接口规范

## 1. API设计原则

### 1.1 设计标准
- **RESTful设计**: 遵循REST API设计规范
- **统一响应格式**: 所有API使用标准响应格式
- **版本控制**: 通过URL路径进行版本控制 (v1)
- **安全优先**: 所有API都需要认证和授权
- **错误处理**: 统一的错误码和错误信息格式
- **文档驱动**: 使用OpenAPI 3.0规范

### 1.2 认证方式
- **Supabase Auth**: 使用JWT Token进行身份验证
- **API Key**: 服务间调用使用API Key
- **权限检查**: 基于用户角色和组织权限

## 2. 统一响应格式

### 2.1 成功响应
```typescript
interface SuccessResponse<T = any> {
  success: true
  data: T
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
    version: string
  }
}
```

### 2.2 错误响应
```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    field?: string
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
    version: string
  }
}
```

### 2.3 分页响应
```typescript
interface PaginatedResponse<T = any> {
  success: true
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

## 3. 工作流管理API

### 3.1 创建工作流

**端点**: `POST /api/v1/chatbot/workflows`

**请求体**:
```typescript
interface CreateWorkflowRequest {
  type: 'outline_generation' | 'a2a_session_generation' | 'combined'
  context: {
    userId: string
    userRole: 'teacher' | 'student'
    organizationId?: string
    classId?: string
    courseId?: string
    initialData?: Record<string, any>
  }
  options?: {
    autoSave: boolean
    enableNotifications: boolean
    maxIterations: number
    language?: 'zh' | 'en'
  }
}
```

**响应体**:
```typescript
interface CreateWorkflowResponse {
  success: true
  data: {
    workflowId: string
    workflowType: WorkflowType
    initialState: WorkflowState
    firstStep: WorkflowStep
    estimatedDuration: number
    createdAt: string
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

**示例请求**:
```bash
curl -X POST /api/v1/chatbot/workflows \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "outline_generation",
    "context": {
      "userId": "user_123",
      "userRole": "teacher",
      "organizationId": "org_456"
    },
    "options": {
      "autoSave": true,
      "enableNotifications": true,
      "maxIterations": 3
    }
  }'
```

### 3.2 获取工作流状态

**端点**: `GET /api/v1/chatbot/workflows/{workflowId}`

**路径参数**:
- `workflowId`: 工作流ID

**响应体**:
```typescript
interface GetWorkflowResponse {
  success: true
  data: {
    workflowId: string
    type: WorkflowType
    status: WorkflowState
    currentStep: WorkflowStep
    progress: {
      percentage: number
      completedSteps: string[]
      activeStep: string
      estimatedTimeRemaining: number
    }
    context: WorkflowContext
    steps: WorkflowStep[]
    history: WorkflowHistory[]
    createdAt: string
    updatedAt: string
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 3.3 执行工作流步骤

**端点**: `PUT /api/v1/chatbot/workflows/{workflowId}/steps/{stepId}/execute`

**路径参数**:
- `workflowId`: 工作流ID
- `stepId`: 步骤ID

**请求体**:
```typescript
interface ExecuteStepRequest {
  input: {
    type: 'user_input' | 'tool_result' | 'system_event'
    data: any
    userId?: string
    timestamp?: string
  }
  options?: {
    skipValidation: boolean
    forceExecute: boolean
    priority?: 'low' | 'normal' | 'high'
  }
}
```

**响应体**:
```typescript
interface ExecuteStepResponse {
  success: true
  data: {
    executionId: string
    stepId: string
    status: 'queued' | 'running' | 'completed' | 'failed'
    output?: any
    nextStep?: WorkflowStep
    progress: ProgressMetrics
    suggestions?: string[]
    warnings?: string[]
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 3.4 取消工作流

**端点**: `DELETE /api/v1/chatbot/workflows/{workflowId}`

**路径参数**:
- `workflowId`: 工作流ID

**查询参数**:
- `reason`: 取消原因 (可选)

**响应体**:
```typescript
interface CancelWorkflowResponse {
  success: true
  data: {
    workflowId: string
    status: 'cancelled'
    cancelledAt: string
    cancelledBy: string
    reason?: string
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

## 4. 工具调用API

### 4.1 执行工具

**端点**: `POST /api/v1/chatbot/tools/execute`

**请求体**:
```typescript
interface ExecuteToolRequest {
  toolId: string
  workflowId?: string
  parameters: Record<string, any>
  context: {
    userId: string
    organizationId?: string
    classId?: string
    courseId?: string
  }
  options?: {
    async: boolean
    timeout: number
    priority: 'low' | 'normal' | 'high'
  }
}
```

**响应体**:
```typescript
interface ExecuteToolResponse {
  success: true
  data: {
    executionId: string
    toolId: string
    status: 'queued' | 'running' | 'completed' | 'failed'
    result?: ToolResult
    progress?: {
      percentage: number
      currentStep: string
      estimatedTimeRemaining: number
    }
    metadata?: Record<string, any>
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 4.2 获取工具状态

**端点**: `GET /api/v1/chatbot/tools/executions/{executionId}/status`

**路径参数**:
- `executionId`: 执行ID

**响应体**:
```typescript
interface ToolStatusResponse {
  success: true
  data: {
    executionId: string
    toolId: string
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
    progress: {
      percentage: number
      currentStep: string
      estimatedTimeRemaining: number
    }
    result?: ToolResult
    error?: {
      code: string
      message: string
      details?: any
    }
    logs?: ToolLog[]
    startedAt?: string
    completedAt?: string
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 4.3 取消工具执行

**端点**: `POST /api/v1/chatbot/tools/executions/{executionId}/cancel`

**路径参数**:
- `executionId`: 执行ID

**响应体**:
```typescript
interface CancelToolExecutionResponse {
  success: true
  data: {
    executionId: string
    status: 'cancelled'
    cancelledAt: string
    cancelledBy: string
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

## 5. 大纲生成API

### 5.1 收集课程需求

**端点**: `POST /api/v1/chatbot/outline/collect`

**请求体**:
```typescript
interface CollectRequirementsRequest {
  workflowId: string
  stepId: string
  input: {
    type: 'conversation' | 'form' | 'file'
    data: {
      messages?: ChatMessage[]
      formData?: CourseRequirementsForm
      fileUrl?: string
    }
  }
}
```

**响应体**:
```typescript
interface CollectRequirementsResponse {
  success: true
  data: {
    workflowId: string
    stepId: string
    status: 'collecting' | 'complete' | 'needs_clarification'
    currentRequirements: Partial<CourseRequirements>
    missingFields: string[]
    suggestions: string[]
    nextStep?: WorkflowStep
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 5.2 生成课程大纲

**端点**: `POST /api/v1/chatbot/outline/generate`

**请求体**:
```typescript
interface GenerateOutlineRequest {
  workflowId: string
  stepId: string
  requirements: CourseRequirements
  options?: {
    includeDescriptions: boolean
    suggestedChapters?: number
    focusAreas?: string[]
  }
}
```

**响应体**:
```typescript
interface GenerateOutlineResponse {
  success: true
  data: {
    workflowId: string
    stepId: string
    status: 'generating' | 'completed'
    outline?: CourseOutline
    generationId: string
    progress: ProgressMetrics
    estimatedTimeRemaining: number
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 5.3 编辑大纲

**端点**: `PUT /api/v1/chatbot/outline/{outlineId}/edit`

**路径参数**:
- `outlineId`: 大纲ID

**请求体**:
```typescript
interface EditOutlineRequest {
  workflowId: string
  stepId: string
  modifications: {
    type: 'add_chapter' | 'remove_chapter' | 'modify_chapter' | 'reorder_chapters'
    target?: string // chapterId if applicable
    data: any
  }[]
  options?: {
    validateStructure: boolean
    preserveConsistency: boolean
  }
}
```

**响应体**:
```typescript
interface EditOutlineResponse {
  success: true
  data: {
    workflowId: string
    stepId: string
    outlineId: string
    modifiedOutline: CourseOutline
    appliedModifications: {
      type: string
      success: boolean
      error?: string
    }[]
    suggestions: string[]
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 5.4 确认大纲

**端点**: `POST /api/v1/chatbot/outline/{outlineId}/confirm`

**路径参数**:
- `outlineId`: 大纲ID

**请求体**:
```typescript
interface ConfirmOutlineRequest {
  workflowId: string
  stepId: string
  decision: 'approve' | 'request_changes' | 'regenerate'
  feedback?: {
    overallRating: number // 1-5
    comments: string
    specificRequests?: string[]
  }
}
```

**响应体**:
```typescript
interface ConfirmOutlineResponse {
  success: true
  data: {
    workflowId: string
    stepId: string
    outlineId: string
    status: 'confirmed' | 'changes_requested' | 'regenerating'
    nextStep?: WorkflowStep
    outline?: CourseOutline // if regenerated
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

## 6. 会话生成API

### 6.1 规划会话

**端点**: `POST /api/v1/chatbot/session/plan`

**请求体**:
```typescript
interface PlanSessionRequest {
  workflowId: string
  stepId: string
  sessionInfo: {
    outlineId: string
    chapterId?: string
    sessionNumber: number
    title: string
    description?: string
    targetDuration: number
    learningObjectives: string[]
  }
  context: {
    previousSessions?: string[]
    studentLevel?: 'beginner' | 'intermediate' | 'advanced'
    classSize?: number
    teachingMethod?: string
  }
}
```

**响应体**:
```typescript
interface PlanSessionResponse {
  success: true
  data: {
    workflowId: string
    stepId: string
    planId: string
    sessionPlan: SessionPlan
    estimatedGenerationTime: number
    nextStep: WorkflowStep
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 6.2 生成会话内容

**端点**: `POST /api/v1/chatbot/session/generate`

**请求体**:
```typescript
interface GenerateSessionContentRequest {
  workflowId: string
  stepId: string
  planId: string
  options?: {
    maxIterations: number
    includeExamples: boolean
    includeQuestions: boolean
    targetReadingLevel: 'simple' | 'moderate' | 'complex'
  }
}
```

**响应体**:
```typescript
interface GenerateSessionContentResponse {
  success: true
  data: {
    workflowId: string
    stepId: string
    planId: string
    generationId: string
    status: 'generating' | 'completed'
    content?: GeneratedContent
    progress: ProgressMetrics
    estimatedTimeRemaining: number
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 6.3 评估会话内容

**端点**: `POST /api/v1/chatbot/session/review`

**请求体**:
```typescript
interface ReviewSessionContentRequest {
  workflowId: string
  stepId: string
  generationId: string
  evaluationCriteria?: {
    clarity: boolean
    engagement: boolean
    completeness: boolean
    difficulty: boolean
    relevance: boolean
  }
  focusAreas?: string[]
}
```

**响应体**:
```typescript
interface ReviewSessionContentResponse {
  success: true
  data: {
    workflowId: string
    stepId: string
    generationId: string
    reviewId: string
    evaluation: EvaluationResult
    overallScore: number
    strengths: string[]
    concerns: string[]
    recommendations: string[]
    decision: 'approve' | 'needs_improvement' | 'regenerate'
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 6.4 细化会话内容

**端点**: `POST /api/v1/chatbot/session/refine`

**请求体**:
```typescript
interface RefineSessionContentRequest {
  workflowId: string
  stepId: string
  generationId: string
  reviewId: string
  feedback: {
    overallRating: number
    specificFeedback: {
      section: string
      issue: string
      suggestion: string
      priority: 'low' | 'medium' | 'high'
    }[]
  }
  options?: {
    preserveStructure: boolean
    maintainLength: boolean
  }
}
```

**响应体**:
```typescript
interface RefineSessionContentResponse {
  success: true
  data: {
    workflowId: string
    stepId: string
    generationId: string
    reviewId: string
    refinementId: string
    status: 'refining' | 'completed'
    refinedContent?: RefinedContent
    improvements: {
      section: string
      improvement: string
      impact: 'minor' | 'moderate' | 'significant'
    }[]
    finalDecision?: 'approve' | 'needs_more_work'
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

## 7. 聊天接口API

### 7.1 发送消息

**端点**: `POST /api/v1/chatbot/chat/message`

**请求体**:
```typescript
interface SendMessageRequest {
  workflowId?: string
  conversationId?: string
  message: {
    content: string
    type: 'text' | 'action' | 'file'
    attachments?: {
      type: 'image' | 'document' | 'audio'
      url: string
      metadata?: Record<string, any>
    }[]
  }
  context: {
    userId: string
    organizationId?: string
    classId?: string
    courseId?: string
    userRole: 'teacher' | 'student'
  }
  options?: {
    stream: boolean
    includeToolSuggestions: boolean
    maxResponseLength: number
  }
}
```

**响应体**:
```typescript
interface SendMessageResponse {
  success: true
  data: {
    messageId: string
    conversationId: string
    workflowId?: string
    response: {
      content: string
      type: 'text' | 'action' | 'tool_suggestion'
      actions?: MessageAction[]
      toolSuggestions?: AITool[]
      metadata?: Record<string, any>
    }
    suggestions?: string[]
    workflowTriggers?: WorkflowTrigger[]
    context?: {
      currentWorkflow?: string
      activeStep?: string
      availableTools?: AITool[]
    }
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 7.2 获取聊天历史

**端点**: `GET /api/v1/chatbot/chat/history`

**查询参数**:
- `conversationId`: 对话ID (可选)
- `workflowId`: 工作流ID (可选)
- `limit`: 消息数量限制 (默认50)
- `offset`: 偏移量 (默认0)
- `before`: 获取指定时间之前的消息 (ISO 8601)

**响应体**:
```typescript
interface GetChatHistoryResponse {
  success: true
  data: {
    conversationId: string
    messages: ChatMessage[]
    hasMore: boolean
    lastMessageAt?: string
    metadata: {
      totalCount: number
      filteredCount: number
      conversationStats: {
        messageCount: number
        toolUsageCount: number
        workflowCount: number
        averageResponseTime: number
      }
    }
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 7.3 流式响应

**端点**: `WebSocket /api/v1/chatbot/chat/stream`

**连接参数**:
```typescript
interface WebSocketConnectionParams {
  conversationId?: string
  workflowId?: string
  token: string
}
```

**消息格式**:
```typescript
interface StreamMessage {
  type: 'message_start' | 'message_chunk' | 'message_end' | 'tool_call' | 'workflow_update' | 'error'
  data: any
  timestamp: string
}
```

**示例流式响应**:
```json
{
  "type": "message_start",
  "data": {
    "messageId": "msg_123",
    "conversationId": "conv_456"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 8. 工具管理API

### 8.1 获取可用工具

**端点**: `GET /api/v1/chatbot/tools`

**查询参数**:
- `category`: 工具类别筛选 (outline, session, edit, analyze)
- `userRole`: 用户角色筛选 (teacher, student)
- `context`: 上下文筛选 (class, course, organization)

**响应体**:
```typescript
interface GetToolsResponse {
  success: true
  data: {
    tools: AITool[]
    categories: {
      name: string
      description: string
      toolCount: number
    }[]
    totalTools: number
    availableForRole: string[]
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

### 8.2 获取工具详情

**端点**: `GET /api/v1/chatbot/tools/{toolId}`

**路径参数**:
- `toolId`: 工具ID

**响应体**:
```typescript
interface GetToolDetailResponse {
  success: true
  data: {
    tool: AITool & {
      description: string
      usage: string
      examples: {
        input: any
        output: any
      }[]
      parameters: ToolParameter[]
      requirements: {
        permissions: string[]
        prerequisites: string[]
        limitations: {
          maxExecutionsPerDay: number
          maxDataSize: number
          allowedFormats: string[]
        }
      }
      pricing?: {
        costPerExecution: number
        freeTierLimit: number
        currency: string
      }
    }
  }
  metadata: {
    timestamp: string
    requestId: string
    processingTimeMs: number
  }
}
```

## 9. 错误码定义

### 9.1 通用错误码
```typescript
const ERROR_CODES = {
  // 认证错误 (1000-1099)
  UNAUTHORIZED: 'AUTH_1001',
  INVALID_TOKEN: 'AUTH_1002',
  TOKEN_EXPIRED: 'AUTH_1003',
  INSUFFICIENT_PERMISSIONS: 'AUTH_1004',

  // 验证错误 (2000-2099)
  VALIDATION_ERROR: 'VAL_2001',
  MISSING_REQUIRED_FIELD: 'VAL_2002',
  INVALID_DATA_FORMAT: 'VAL_2003',
  PARAMETER_OUT_OF_RANGE: 'VAL_2004',

  // 资源错误 (3000-3099)
  RESOURCE_NOT_FOUND: 'RES_3001',
  RESOURCE_ALREADY_EXISTS: 'RES_3002',
  RESOURCE_LOCKED: 'RES_3003',
  RESOURCE_DELETED: 'RES_3004',

  // 工作流错误 (4000-4099)
  WORKFLOW_NOT_FOUND: 'WF_4001',
  WORKFLOW_INVALID_STATE: 'WF_4002',
  WORKFLOW_EXECUTION_FAILED: 'WF_4003',
  WORKFLOW_TIMEOUT: 'WF_4004',
  STEP_NOT_FOUND: 'WF_4005',
  STEP_EXECUTION_FAILED: 'WF_4006',

  // 工具错误 (5000-5099)
  TOOL_NOT_FOUND: 'TOOL_5001',
  TOOL_EXECUTION_FAILED: 'TOOL_5002',
  TOOL_UNAVAILABLE: 'TOOL_5003',
  TOOL_QUOTA_EXCEEDED: 'TOOL_5004',
  INVALID_TOOL_PARAMETERS: 'TOOL_5005',

  // AI服务错误 (6000-6099)
  AI_SERVICE_UNAVAILABLE: 'AI_6001',
  AI_MODEL_ERROR: 'AI_6002',
  AI_RATE_LIMIT_EXCEEDED: 'AI_6003',
  AI_CONTENT_FILTERED: 'AI_6004',
  AI_GENERATION_FAILED: 'AI_6005',

  // 系统错误 (9000-9999)
  INTERNAL_SERVER_ERROR: 'SYS_9001',
  DATABASE_ERROR: 'SYS_9002',
  CACHE_ERROR: 'SYS_9003',
  EXTERNAL_SERVICE_ERROR: 'SYS_9004',
  MAINTENANCE_MODE: 'SYS_9005'
}
```

### 9.2 错误响应示例
```json
{
  "success": false,
  "error": {
    "code": "WF_4003",
    "message": "工作流执行失败",
    "details": {
      "workflowId": "wf_123",
      "stepId": "step_456",
      "error": "AI服务不可用",
      "retryable": true,
      "retryAfter": 30
    },
    "field": "stepId"
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req_789",
    "processingTimeMs": 1500,
    "version": "v1"
  }
}
```

## 10. API使用示例

### 10.1 完整的工作流示例

```typescript
// 1. 创建大纲生成工作流
const createWorkflowResponse = await fetch('/api/v1/chatbot/workflows', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <jwt_token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'outline_generation',
    context: {
      userId: 'user_123',
      userRole: 'teacher',
      organizationId: 'org_456'
    }
  })
})

const { workflowId } = await createWorkflowResponse.json()

// 2. 收集课程需求
const collectRequirementsResponse = await fetch('/api/v1/chatbot/outline/collect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <jwt_token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflowId,
    stepId: 'step_collect',
    input: {
      type: 'conversation',
      data: {
        messages: [
          { role: 'user', content: '我想创建一个Python编程课程' }
        ]
      }
    }
  })
})

// 3. 生成大纲
const generateOutlineResponse = await fetch('/api/v1/chatbot/outline/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <jwt_token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflowId,
    stepId: 'step_generate',
    requirements: {
      goals: '学习Python编程基础',
      audience: '初学者',
      duration: '8周',
      topics: ['变量', '函数', '面向对象', '文件操作']
    }
  })
})

// 4. 监控工作流状态
const workflowStatus = await fetch(`/api/v1/chatbot/workflows/${workflowId}`, {
  headers: {
    'Authorization': 'Bearer <jwt_token>'
  }
})
```

### 10.2 流式聊天示例

```typescript
// 建立WebSocket连接
const ws = new WebSocket('wss://api.example.com/api/v1/chatbot/chat/stream?token=<jwt_token>')

ws.onopen = () => {
  // 发送消息
  ws.send(JSON.stringify({
    type: 'send_message',
    data: {
      conversationId: 'conv_123',
      message: {
        content: '帮我创建一个数学课程的大纲',
        type: 'text'
      },
      context: {
        userId: 'user_123',
        userRole: 'teacher'
      }
    }
  }))
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)

  switch (message.type) {
    case 'message_chunk':
      // 显示流式响应内容
      updateChatDisplay(message.data.content)
      break
    case 'tool_suggestion':
      // 显示工具建议
      showToolSuggestions(message.data.tools)
      break
    case 'workflow_update':
      // 更新工作流状态
      updateWorkflowProgress(message.data.progress)
      break
  }
}
```

## 11. API限制和配额

### 11.1 请求限制
```typescript
interface RateLimits {
  // 每用户每小时请求数
  perUserPerHour: {
    default: 1000
    premium: 5000
  }

  // 每IP每小时请求数
  perIpPerHour: {
    default: 2000
  }

  // 工具执行限制
  toolExecution: {
    perUserPerDay: {
      default: 100
      premium: 1000
    }
    concurrentExecutions: {
      default: 5
      premium: 20
    }
  }

  // 聊天消息限制
  chatMessages: {
    perConversation: {
      maxMessages: 1000
    }
    messageLength: {
      max: 4000
    }
  }
}
```

### 11.2 数据大小限制
```typescript
interface DataLimits {
  // 请求体大小
  requestBody: {
    maxSize: '10MB'
    allowedFormats: ['json', 'multipart']
  }

  // 文件上传
  fileUpload: {
    maxSize: '50MB'
    allowedTypes: ['image', 'document', 'audio']
    maxFiles: 5
  }

  // 响应数据
  responseData: {
    maxSize: '5MB'
    streamingThreshold: '1MB'
  }
}
```

## 12. 监控和调试

### 12.1 API监控指标
```typescript
interface APIMonitoring {
  // 性能指标
  performance: {
    responseTime: 'p50' | 'p95' | 'p99'
    throughput: 'requests_per_second'
    errorRate: 'percentage'
    availability: 'uptime_percentage'
  }

  // 业务指标
  business: {
    workflowCompletionRate: number
    toolExecutionSuccessRate: number
    userEngagement: 'session_duration'
    aiServiceUsage: 'tokens_consumed'
  }
}
```

### 12.2 调试支持
```typescript
interface DebugSupport {
  // 请求跟踪
  requestTracing: {
    enabled: boolean
    includeHeaders: boolean
    includeBody: boolean
    sampleRate: number
  }

  // 详细日志
  detailedLogging: {
    enabled: boolean
    level: 'error' | 'warn' | 'info' | 'debug'
    includeStackTrace: boolean
  }

  // 性能分析
  performanceProfiling: {
    enabled: boolean
    sampleRate: number
    includeDatabase: boolean
    includeAI: boolean
  }
}
```

这个API接口规范提供了完整的端到端API设计，涵盖了AI chatbot工作流工具的所有核心功能，包括工作流管理、工具调用、大纲生成、会话生成和聊天接口。API设计遵循RESTful原则，具有良好的可扩展性、安全性和可维护性。