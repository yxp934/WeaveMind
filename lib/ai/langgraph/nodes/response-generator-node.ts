import { ChatbotState } from '../chatbot-state'
import { AIMessage } from '@langchain/core/messages'

/**
 * 响应生成节点 - 将AI响应格式化为客户端需要的格式
 */
export function responseGeneratorNode(state: ChatbotState): { messages: any[], response: any } {
  // 获取最新的AI响应消息
  const lastMessage = state.messages[state.messages.length - 1]

  if (!(lastMessage instanceof AIMessage)) {
    // 如果没有AI消息，返回默认响应
    return {
      messages: state.messages,
      response: {
        message: '抱歉，我没有理解您的请求。请重新描述您需要什么帮助。',
        toolsUsed: [],
        metadata: {
          intent: 'unknown',
          userRole: state.userRole,
          availableActions: ['course_creation', 'outline_generation', 'assignment_creation'],
          suggestions: ['帮我创建一个课程', '生成课程大纲', '设计作业'],
          workflowType: state.currentWorkflow?.type,
          currentStep: state.currentWorkflow?.step,
          classId: crypto.randomUUID(),
          courseTopic: state.courseInfo?.topic,
          knownInfo: state.courseInfo,
          missingInfo: getMissingInfo(state),
          suggestedActions: ['continue_workflow'],
          progress: calculateProgress(state)
        }
      }
    }
  }

  // 构建响应对象
  const response = {
    message: lastMessage.content,
    toolsUsed: state.metadata?.toolsUsed || [],
    metadata: {
      // 基本信息
      intent: state.intent?.type || 'unknown',
      userRole: state.userRole,
      timestamp: state.metadata?.timestamp,

      // 工作流信息
      workflowType: state.currentWorkflow?.type,
      currentStep: state.currentWorkflow?.step,
      workflowStatus: state.currentWorkflow?.status,
      classId: crypto.randomUUID(),

      // 课程信息
      courseTopic: state.courseInfo?.topic,
      knownInfo: state.courseInfo,
      missingInfo: getMissingInfo(state),

      // 交互信息
      suggestedActions: state.metadata?.suggestions || ['continue_workflow'],
      availableActions: state.metadata?.availableActions || [],
      suggestions: state.metadata?.suggestions || [],

      // 进度信息
      progress: calculateProgress(state),

      // 会话信息
      conversationId: state.conversationId,
      sessionId: state.sessionId
    }
  }

  return {
    messages: state.messages,
    response
  }
}

/**
 * 计算缺失信息
 */
function getMissingInfo(state: ChatbotState): string[] {
  if (!state.courseInfo) {
    return ['course_topic', 'course_duration', 'sessions_per_week', 'target_audience', 'difficulty_level', 'course_type']
  }

  const missing: string[] = []
  const courseInfo = state.courseInfo

  if (!courseInfo.topic) missing.push('course_topic')
  if (!courseInfo.duration) missing.push('course_duration')
  if (!courseInfo.sessionsPerWeek) missing.push('sessions_per_week')
  if (!courseInfo.targetAudience) missing.push('target_audience')
  if (!courseInfo.difficultyLevel) missing.push('difficulty_level')
  if (!courseInfo.courseType) missing.push('course_type')

  return missing
}

/**
 * 计算进度百分比
 */
function calculateProgress(state: ChatbotState): number {
  if (!state.currentWorkflow) {
    return 0
  }

  const totalFields = 6 // courseInfo总共6个字段
  const knownFields = state.courseInfo ? Object.keys(state.courseInfo).length : 0

  // 根据工作流状态调整进度
  let baseProgress = (knownFields / totalFields) * 80 // 最大80%

  switch (state.currentWorkflow.step) {
    case 'info_collection':
      return baseProgress
    case 'course_generation':
      return 90
    case 'completed':
      return 100
    case 'error':
      return Math.max(baseProgress - 20, 0)
    default:
      return baseProgress
  }
}

/**
 * 错误处理节点
 */
export function errorHandlerNode(state: ChatbotState, error: Error): Partial<ChatbotState> {
  console.error('聊天机器人错误:', error)

  // 添加错误消息到对话历史
  const errorMessage = new AIMessage({
    content: `抱歉，处理您的请求时出现了错误：${error.message}。请重新描述您的需求，或尝试其他操作。`,
    additional_kwargs: {
      error: true,
      errorMessage: error.message
    }
  })

  return {
    ...state,
    messages: [...state.messages, errorMessage],
    currentWorkflow: state.currentWorkflow ? {
      ...state.currentWorkflow,
      status: 'paused',
      step: 'error'
    } : undefined,
    metadata: {
      ...state.metadata,
      timestamp: new Date().toISOString(),
      toolsUsed: [],
      suggestions: ['重新开始', '联系技术支持'],
      availableActions: ['restart', 'support']
    }
  }
}
