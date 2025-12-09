import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'

// 定义聊天机器人状态接口
export interface ChatbotState {
  // 消息历史
  messages: BaseMessage[]

  // 用户信息
  userRole: 'teacher' | 'student' | 'self_learner'
  userId?: string

  // 对话上下文
  conversationId: string
  sessionId: string

  // 当前工作流状态
  currentWorkflow?: {
    type: 'course_creation' | 'outline_generation' | 'assignment_creation' | 'a2a_optimization' | 'content_generation'
    status: 'active' | 'completed' | 'paused'
    step: string
    data: Record<string, any>
  }

  // 课程创建相关数据
  courseInfo?: {
    topic: string
    duration: string
    sessionsPerWeek: string
    targetAudience: string
    difficultyLevel: string
    courseType: string
    teachingMethod?: string
    assessmentType?: string
  }

  // 意图识别结果
  intent?: {
    type: string
    confidence: number
    parameters: Record<string, any>
  }

  // 响应元数据
  metadata?: {
    timestamp: string
    toolsUsed: string[]
    suggestions: string[]
    availableActions: string[]
  }
}

// 初始状态创建函数
export function createInitialState(
  conversationId: string,
  userRole: 'teacher' | 'student' | 'self_learner',
  userId?: string
): ChatbotState {
  return {
    messages: [],
    userRole,
    userId,
    conversationId,
    sessionId: crypto.randomUUID(),
    metadata: {
      timestamp: new Date().toISOString(),
      toolsUsed: [],
      suggestions: [],
      availableActions: []
    }
  }
}

// 状态更新辅助函数
export function updateWorkflow(state: ChatbotState, workflowData: Partial<ChatbotState['currentWorkflow']>): ChatbotState {
  return {
    ...state,
    currentWorkflow: state.currentWorkflow ? {
      ...state.currentWorkflow,
      ...workflowData
    } : undefined
  }
}

export function updateCourseInfo(state: ChatbotState, courseData: Partial<ChatbotState['courseInfo']>): ChatbotState {
  return {
    ...state,
    courseInfo: state.courseInfo ? {
      ...state.courseInfo,
      ...courseData
    } : courseData as ChatbotState['courseInfo']
  }
}

export function addMessage(state: ChatbotState, message: BaseMessage): ChatbotState {
  return {
    ...state,
    messages: [...state.messages, message]
  }
}
