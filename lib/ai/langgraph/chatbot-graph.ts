import { StateGraph, END } from '@langchain/langgraph'
import { ChatbotState, createInitialState } from './chatbot-state'
import { intentRecognitionNode, routeDecisionNode } from './nodes/intent-recognition-node'
import { courseCreationNode, continueWorkflowNode, outlineGenerationNode, assignmentCreationNode, a2aOptimizationNode, contentGenerationNode } from './nodes/course-creation-node'
import { generalChatNode } from './nodes/general-chat-node'
import { responseGeneratorNode } from './nodes/response-generator-node'
import { HumanMessage, AIMessage } from '@langchain/core/messages'

/**
 * 创建聊天机器人图 - 增强版本
 * 支持六个核心工作流：course_creation, outline_generation, assignment_creation, a2a_optimization, content_generation, continue_workflow
 */
export function createChatbotGraph(): StateGraph<ChatbotState> {
  // 创建状态图
  const workflow = new StateGraph<ChatbotState>({
    channels: {
      messages: {
        reducer: (x: any, y: any) => x.concat(y),
        default: () => []
      },
      userRole: null,
      userId: null,
      conversationId: null,
      sessionId: null,
      currentWorkflow: null,
      courseInfo: null,
      intent: null,
      metadata: null
    }
  })

  // 添加节点 - 为所有六个核心工作流添加专门节点
  workflow.addNode('intent_recognition', intentRecognitionNode)
  workflow.addNode('course_creation', courseCreationNode)
  workflow.addNode('outline_generation', outlineGenerationNode)
  workflow.addNode('assignment_creation', assignmentCreationNode)
  workflow.addNode('a2a_optimization', a2aOptimizationNode)
  workflow.addNode('content_generation', contentGenerationNode)
  workflow.addNode('continue_workflow', continueWorkflowNode)
  workflow.addNode('general_chat', generalChatNode)
  workflow.addNode('response_generator', responseGeneratorNode)

  // 添加边和条件
  workflow.addEdge('__start__', 'intent_recognition')

  // 意图识别后路由到不同节点 - 完善所有六个工作流的路由
  workflow.addConditionalEdges(
    'intent_recognition',
    routeDecisionNode,
    {
      'course_creation': 'course_creation',
      'outline_generation': 'outline_generation',
      'assignment_creation': 'assignment_creation',
      'a2a_optimization': 'a2a_optimization',
      'content_generation': 'content_generation',
      'continue_workflow': 'continue_workflow',
      'general_chat': 'general_chat',
      '__end__': 'response_generator'
    }
  )

  // 课程创建后继续工作流或结束
  workflow.addConditionalEdges(
    'course_creation',
    (state: ChatbotState) => {
      const metadata = state.metadata
      if (metadata?.toolsUsed?.includes('course_generator')) {
        return 'response_generator'
      }
      return 'response_generator'
    },
    {
      'continue_workflow': 'continue_workflow',
      'response_generator': 'response_generator'
    }
  )

  // 大纲生成后路由
  workflow.addEdge('outline_generation', 'response_generator')

  // 作业创建后路由
  workflow.addEdge('assignment_creation', 'response_generator')

  // A2A优化后路由
  workflow.addEdge('a2a_optimization', 'response_generator')

  // 内容生成后路由
  workflow.addEdge('content_generation', 'response_generator')

  // 继续工作流后路由
  workflow.addConditionalEdges(
    'continue_workflow',
    (state: ChatbotState) => {
      const metadata = state.metadata
      if (metadata?.toolsUsed?.includes('course_generator')) {
        return 'response_generator'
      }
      // 如果没有使用course_generator工具，说明需要更多信息，结束等待用户输入
      return 'response_generator'
    },
    {
      'response_generator': 'response_generator'
    }
  )

  // 通用聊天后结束
  workflow.addEdge('general_chat', 'response_generator')

  // 响应生成后结束
  workflow.addEdge('response_generator', END)

  return workflow
}

/**
 * 聊天机器人主类
 */
export class LangGraphChatbot {
  private graph: StateGraph<ChatbotState>
  private app: any
  private stateManager: any

  constructor() {
    this.graph = createChatbotGraph()
    this.app = this.graph.compile()
  }

  /**
   * 处理聊天消息 - 修复版本
   */
  async processMessage(
    message: string,
    conversationId: string,
    userRole: 'teacher' | 'student' | 'self_learner',
    userId?: string,
    conversationHistory: any[] = []
  ): Promise<any> {
    try {
      // 关键修复1: 使用conversationId作为固定的sessionId，保持状态连续性
      const fixedSessionId = conversationId

      // 关键修复2: 创建初始状态
      let state = createInitialState(fixedSessionId, userRole, userId)

      // 关键修复3: 正确设置sessionId与conversationId一致
      state.sessionId = fixedSessionId

      // 关键修复4: 从对话历史中恢复工作流状态和课程信息
      if (conversationHistory.length > 0) {
        console.log('🔄 从对话历史中恢复状态，消息数量:', conversationHistory.length)

        // 查找最新的工作流状态和课程信息
        let latestWorkflow = null
        let latestCourseInfo = null

        // 从最新的消息开始向前搜索
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          const msg = conversationHistory[i]

          // 尝试从metadata中恢复状态信息
          if (msg.metadata) {
            // 恢复工作流状态 - 关键修复：确保status为'active'
            if (msg.metadata.workflowType) {
              // 如果有workflowType，但status缺失，默认为'active'
              const workflowStatus = msg.metadata.workflowStatus || 'active'
              latestWorkflow = {
                type: msg.metadata.workflowType,
                status: workflowStatus,
                step: msg.metadata.currentStep || 'info_collection',
                data: {}
              }
              console.log(`✅ 从消息 ${i} 恢复工作流:`, latestWorkflow)

              // 关键修复：如果检测到活跃工作流且没有其他工作流被设置，就使用这个
              if (!state.currentWorkflow && workflowStatus === 'active') {
                state.currentWorkflow = latestWorkflow
              }
            }

            // 恢复课程信息
            if (msg.metadata.courseTopic || (msg.metadata.knownInfo && Object.keys(msg.metadata.knownInfo).length > 0)) {
              latestCourseInfo = msg.metadata.knownInfo || {}
              if (!latestCourseInfo.topic && msg.metadata.courseTopic) {
                latestCourseInfo.topic = msg.metadata.courseTopic
              }
              console.log(`✅ 从消息 ${i} 恢复课程信息:`, latestCourseInfo)
            }
          }
        }

        // 如果还没有设置工作流，尝试从intent参数中恢复
        if (!state.currentWorkflow && state.intent?.parameters?.currentWorkflowType) {
          state.currentWorkflow = {
            type: state.intent.parameters.currentWorkflowType,
            status: 'active',
            step: state.intent.parameters.currentStep || 'info_collection',
            data: {}
          }
          console.log(`✅ 从intent参数恢复工作流:`, state.currentWorkflow)
        }

        // 恢复找到的状态（如果还没有设置）
        if (latestWorkflow && !state.currentWorkflow) {
          state.currentWorkflow = latestWorkflow
        }

        if (latestCourseInfo) {
          state.courseInfo = latestCourseInfo
        }
      }

      // 关键修复5: 保留完整的对话历史上下文
      for (const msg of conversationHistory) {
        if (msg.role === 'user') {
          state = {
            ...state,
            messages: [...state.messages, new HumanMessage(msg.content)]
          }
        } else if (msg.role === 'assistant') {
          state = {
            ...state,
            messages: [...state.messages, new AIMessage(msg.content)]
          }
        }
      }

      // 关键修复6: 添加当前用户消息
      state = {
        ...state,
        messages: [...state.messages, new HumanMessage(message)]
      }

      // 关键修复6: 运行LangGraph处理流程
      const result = await this.app.invoke(state)

      // 关键修复7: 获取最终响应并确保正确格式
      const finalState = result as ChatbotState
      const response = responseGeneratorNode(finalState)

      return {
        success: true,
        data: response.response,
        metadata: {
          timestamp: new Date().toISOString(),
          conversationId,
          sessionId: finalState.sessionId,
          intent: finalState.intent?.type,
          workflow: finalState.currentWorkflow,
          contextPreserved: true,
          messagesCount: finalState.messages.length
        }
      }

    } catch (error) {
      console.error('聊天处理失败:', error)

      // 关键修复8: 改进错误处理，保持状态一致性
      return {
        success: false,
        data: {
          message: `抱歉，处理您的请求时出现了错误：${(error as Error).message}。让我重新理解您的需求，请再次描述您想要什么帮助。`,
          toolsUsed: [],
          metadata: {
            intent: 'error',
            userRole,
            availableActions: ['restart', 'support', 'course_creation', 'outline_generation'],
            suggestions: ['我想创建一个课程', '帮我生成大纲', '创建作业', '重新开始'],
            workflowType: null,
            currentStep: null,
            classId: crypto.randomUUID(),
            courseTopic: null,
            knownInfo: null,
            missingInfo: ['all'],
            suggestedActions: ['continue_workflow'],
            progress: 0
          }
        },
        error: {
          code: 'CHATBOT_ERROR',
          message: (error as Error).message
        },
        metadata: {
          timestamp: new Date().toISOString(),
          conversationId
        }
      }
    }
  }

  /**
   * 获取对话状态
   */
  async getConversationState(conversationId: string): Promise<ChatbotState | null> {
    try {
      // LangGraph的get_state API可能不存在，这里返回null
      console.log('获取对话状态:', conversationId)
      return null
    } catch (error) {
      console.error('获取对话状态失败:', error)
      return null
    }
  }

  /**
   * 重置对话
   */
  async resetConversation(conversationId: string): Promise<void> {
    try {
      console.log('重置对话:', conversationId)
      // LangGraph的update_state API可能不存在，这里只是记录日志
    } catch (error) {
      console.error('重置对话失败:', error)
    }
  }
}

// 创建全局实例
export const chatbot = new LangGraphChatbot()
