import { StateGraph, END } from '@langchain/langgraph'
import { ChatbotState } from '../chatbot-state'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '../config/openai-gateway'

// 初始化AI模型 - 使用Vercel AI Gateway
const openai = createGatewayOpenAI()

/**
 * 意图识别节点 - 智能版本 (增强修复版)
 * 核心修复：基于完整对话上下文进行智能推断，支持六个核心工作流
 */
export async function intentRecognitionNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const lastMessage = state.messages[state.messages.length - 1]

  if (!(lastMessage instanceof HumanMessage)) {
    return { ...state }
  }

  try {
    // 关键修复1: 检查是否有活跃的工作流，如果有则优先继续该工作流
    if (state.currentWorkflow && state.currentWorkflow.status === 'active') {
      // 检查用户是否想要切换工作流或结束当前工作流
      const userInput = lastMessage.content.toString().toLowerCase()
      const exitKeywords = ['取消', '停止', '退出', '结束', '重新开始', '换一个', '不要了', 'cancel', 'stop', 'exit']
      const wantsToExit = exitKeywords.some(keyword => userInput.includes(keyword))

      if (!wantsToExit) {
        return {
          ...state,
          intent: {
            type: 'continue_workflow',
            confidence: 1.0,
            parameters: {
              currentWorkflowType: state.currentWorkflow.type,
              currentStep: state.currentWorkflow.step
            }
          },
          metadata: {
            ...state.metadata,
            timestamp: new Date().toISOString(),
            reasoning: `检测到活跃工作流 ${state.currentWorkflow.type}，继续当前流程`,
            workflowContinued: true
          }
        }
      }
    }

    // 关键修复2: 暂时使用改进的启发式匹配，确保状态正确传递
    console.log('🎯 使用改进的启发式意图识别')
    console.log('当前状态:', {
      workflow: state.currentWorkflow,
      messagesCount: state.messages.length,
      lastMessage: lastMessage.content
    })

    const heuristicResult = performHeuristicIntentRecognition(lastMessage.content.toString(), state)
    console.log('启发式识别结果:', heuristicResult)

    // 关键修复3: 确保状态正确传递
    return {
      ...state,  // 保留所有原有状态
      intent: {
        type: heuristicResult.intent,
        confidence: heuristicResult.confidence || 0.7,
        parameters: heuristicResult.parameters || {}
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        reasoning: heuristicResult.reasoning,
        suggestedResponse: heuristicResult.suggestedResponse,
        missingInfo: heuristicResult.missingInfo || [],
        nextStep: heuristicResult.nextStep,
        mode: 'enhanced_heuristic'
      }
    }

  } catch (error) {
    console.error('意图识别失败:', error)

    // 关键修复9: 改进错误恢复逻辑
    return {
      ...state,
      intent: {
        type: 'general_chat',
        confidence: 0.3,
        parameters: {}
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        reasoning: `意图识别失败: ${(error as Error).message}`,
        suggestedResponse: '我很乐意帮助您！请选择您想要进行的操作：',
        suggestions: ['创建课程', '生成大纲', '创建作业', '优化内容', '生成材料']
      }
    }
  }
}

/**
 * 启发式意图识别（增强版）
 * 基于对话历史和上下文的智能意图识别
 */
function performHeuristicIntentRecognition(userMessage: string, state: ChatbotState): any {
  const message = userMessage.toLowerCase()

  console.log('🔍 分析消息:', message)
  console.log('📋 当前工作流状态:', state.currentWorkflow)

  // 1. 如果有活跃工作流，优先考虑继续工作流
  if (state.currentWorkflow?.status === 'active') {
    console.log('✅ 检测到活跃工作流，继续当前流程')

    // 检查用户是否想要继续
    const continueKeywords = ['好的', '可以', '是的', '没问题', '继续', '下一步', 'ok', 'yes', 'sure', '明白了']
    if (continueKeywords.some(k => message.includes(k))) {
      return {
        intent: 'continue_workflow',
        confidence: 0.9,
        parameters: {
          currentWorkflowType: state.currentWorkflow.type,
          currentStep: state.currentWorkflow.step
        },
        reasoning: `检测到活跃工作流 ${state.currentWorkflow.type}，用户确认继续`,
        suggestedResponse: `好的，让我们继续${getWorkflowDisplayName(state.currentWorkflow.type)}流程。`,
        missingInfo: []
      }
    }

    // 检查是否要结束当前工作流
    const exitKeywords = ['取消', '停止', '退出', '结束', '重新开始', '换一个', '不要了', 'cancel', 'stop', 'exit']
    if (exitKeywords.some(k => message.includes(k))) {
      return {
        intent: 'general_chat',
        confidence: 0.8,
        parameters: {},
        reasoning: '用户想要结束当前工作流',
        suggestedResponse: '好的，我们结束当前流程。请告诉我您想做什么其他的事情。',
        missingInfo: ['user_intent']
      }
    }

    // 如果用户在回答工作流中的问题，继续当前工作流
    return {
      intent: 'continue_workflow',
      confidence: 0.8,
      parameters: {
        currentWorkflowType: state.currentWorkflow.type,
        currentStep: state.currentWorkflow.step
      },
      reasoning: `用户正在工作流 ${state.currentWorkflow.type} 中提供信息`,
      suggestedResponse: `好的，我记录了您的信息。让我继续${getWorkflowDisplayName(state.currentWorkflow.type)}流程。`,
      missingInfo: []
    }
  }

  // 2. 基于对话历史判断意图
  const recentMessages = state.messages.slice(-4) // 最近4条消息
  const hasRecentCourseCreation = recentMessages.some(msg =>
    msg.content && msg.content.toLowerCase().includes('课程')
  )

  // 3. 课程创建意图
  if (message.includes('创建课程') || message.includes('新课程') ||
      message.includes('开设课程') || message.includes('设计课程') ||
      (message.includes('课程') && message.includes('创建')) ||
      message.includes('我要上课') || message.includes('做课程') ||
      message.includes('python') || message.includes('数学') ||
      message.includes('物理') || message.includes('英语')) {

    const topic = extractCourseTopic(message)
    return {
      intent: 'course_creation',
      confidence: 0.8,
      parameters: {
        courseTopic: topic,
        ...extractCourseParameters(message)
      },
      reasoning: `关键词匹配：包含课程创建相关词汇，检测到主题: ${topic}`,
      suggestedResponse: topic ?
        `好的！我来帮您创建一个${topic}课程。` :
        '好的！我来帮您创建课程。请告诉我课程的主题是什么？',
      missingInfo: topic ? ['course_duration', 'sessions_per_week'] : ['course_topic', 'course_duration']
    }
  }

  // 4. 大纲生成意图
  if (message.includes('大纲') || message.includes('课程结构') || message.includes('章节') ||
      message.includes('课程规划') || message.includes('教学设计')) {
    return {
      intent: 'outline_generation',
      confidence: 0.8,
      parameters: {},
      reasoning: '关键词匹配：包含大纲相关词汇',
      suggestedResponse: '好的！我来帮您生成课程大纲。请告诉我课程主题和目标受众。',
      missingInfo: ['course_topic', 'target_audience']
    }
  }

  // 5. 作业创建意图
  if (message.includes('作业') || message.includes('测验') || message.includes('考试') ||
      message.includes('练习') || message.includes('题目') || message.includes('布置') ||
      message.includes('创建作业') || message.includes('做作业')) {
    const assignmentType = detectAssignmentType(message)
    return {
      intent: 'assignment_creation',
      confidence: 0.8,
      parameters: {
        assignmentType: assignmentType
      },
      reasoning: `关键词匹配：包含作业相关词汇，检测到类型: ${assignmentType}`,
      suggestedResponse: `好的！我来帮您创建${assignmentType}作业。请告诉我作业主题。`,
      missingInfo: ['topic', 'difficulty']
    }
  }

  // 6. A2A优化意图
  if (message.includes('优化') || message.includes('改进') || message.includes('a2a') ||
      message.includes('完善') || message.includes('提升质量')) {
    return {
      intent: 'a2a_optimization',
      confidence: 0.7,
      parameters: {},
      reasoning: '关键词匹配：包含优化相关词汇',
      suggestedResponse: '好的！我将使用A2A方式帮您优化内容。请提供需要优化的内容。',
      missingInfo: ['content_to_optimize']
    }
  }

  // 7. 内容生成意图
  if (message.includes('生成') || message.includes('ppt') || message.includes('讲义') ||
      message.includes('材料') || message.includes('课件') || message.includes('资料')) {
    const contentType = detectContentType(message)
    return {
      intent: 'content_generation',
      confidence: 0.7,
      parameters: {
        contentType: contentType
      },
      reasoning: `关键词匹配：包含内容生成相关词汇，检测到类型: ${contentType}`,
      suggestedResponse: `好的！我来帮您生成${contentType}。请告诉我具体需求。`,
      missingInfo: ['topic', 'requirements']
    }
  }

  // 8. 默认：通用对话
  console.log('⚠️ 未匹配到特定意图，使用通用对话')
  return {
    intent: 'general_chat',
    confidence: 0.4,
    parameters: {},
    reasoning: '未匹配到特定意图，使用通用对话',
    suggestedResponse: '我很乐意帮您！请告诉我您想要做什么：\n\n• 创建新课程\n• 生成课程大纲\n• 创建作业\n• 优化课程内容\n• 生成教学内容\n\n请描述您的具体需求，我会引导您完成。',
    missingInfo: ['user_intent']
  }
}

/**
 * 从消息中提取课程参数
 */
function extractCourseParameters(message: string): Record<string, string> {
  const params: Record<string, string> = {}

  // 提取主题（在"关于"、"主题是"等词后面的内容）
  const topicPatterns = [
    /关于(.+?)的课程/,
    /主题是(.+)/,
    /教(.+?)课/,
    /(.+?)课程/
  ]
  for (const pattern of topicPatterns) {
    const match = message.match(pattern)
    if (match) {
      params.courseTopic = match[1].trim()
      break
    }
  }

  // 提取时长
  const durationMatch = message.match(/(\d+)\s*(节|课时|周|小时)/)
  if (durationMatch) {
    params.courseDuration = durationMatch[0]
  }

  return params
}

/**
 * 从消息中提取课程主题
 */
function extractCourseTopic(message: string): string {
  // 常见课程主题关键词
  const topics = ['python', 'java', 'javascript', '数学', '物理', '化学', '英语', '语文',
                 '历史', '地理', '生物', '编程', '机器学习', '人工智能', '数据科学',
                 'web开发', '前端', '后端', '数据库', '算法', '数据结构']

  const lowerMessage = message.toLowerCase()
  for (const topic of topics) {
    if (lowerMessage.includes(topic)) {
      return topic
    }
  }

  // 尝试从消息中提取主题
  const topicPatterns = [
    /关于(.+?)的/,
    /主题是(.+)/,
    /教(.+?)课/,
    /(.+?)课程/
  ]

  for (const pattern of topicPatterns) {
    const match = message.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return ''
}

/**
 * 检测作业类型
 */
function detectAssignmentType(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('测验') || lowerMessage.includes('选择题') || lowerMessage.includes('考试')) {
    return '测验'
  }
  if (lowerMessage.includes('写作') || lowerMessage.includes('作文') || lowerMessage.includes('论文')) {
    return '写作'
  }
  if (lowerMessage.includes('研究') || lowerMessage.includes('调研') || lowerMessage.includes('项目')) {
    return '研究'
  }

  return '通用作业'
}

/**
 * 检测内容类型
 */
function detectContentType(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('ppt') || lowerMessage.includes('幻灯片')) {
    return 'PPT课件'
  }
  if (lowerMessage.includes('讲义') || lowerMessage.includes('教案')) {
    return '教学讲义'
  }
  if (lowerMessage.includes('练习') || lowerMessage.includes('习题')) {
    return '练习题'
  }
  if (lowerMessage.includes('考试') || lowerMessage.includes('测试')) {
    return '考试题目'
  }

  return '教学材料'
}

/**
 * 获取工作流显示名称
 */
function getWorkflowDisplayName(workflowType: string): string {
  const names: Record<string, string> = {
    'course_creation': '创建课程',
    'outline_generation': '生成大纲',
    'assignment_creation': '创建作业',
    'a2a_optimization': 'A2A优化',
    'content_generation': '内容生成'
  }
  return names[workflowType] || '工作流'
}

/**
 * 路由决策节点 - 根据意图决定下一步操作
 */
export function routeDecisionNode(state: ChatbotState): string {
  // 如果有活跃的工作流，继续该工作流
  if (state.currentWorkflow && state.currentWorkflow.status === 'active') {
    return 'continue_workflow'
  }

  // 根据意图类型路由到不同的处理节点
  const intent = state.intent?.type || 'general_chat'

  switch (intent) {
    case 'course_creation':
    case '课程创建':
      return 'course_creation'
    case 'outline_generation':
    case '大纲生成':
      return 'outline_generation'
    case 'assignment_creation':
    case '作业创建':
      return 'assignment_creation'
    case 'a2a_optimization':
    case 'A2A优化':
      return 'a2a_optimization'
    case 'content_generation':
    case '内容生成':
      return 'content_generation'
    case 'continue_workflow':
    case '继续工作流':
      return 'continue_workflow'
    case 'general_chat':
    case '通用对话':
    default:
      return 'general_chat'
  }
}
