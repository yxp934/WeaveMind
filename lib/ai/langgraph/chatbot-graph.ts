import { StateGraph, END } from '@langchain/langgraph'
import { ChatbotState, createInitialState } from './chatbot-state'
import { intentRecognitionNode, routeDecisionNode } from './nodes/intent-recognition-node'
import { courseCreationNode, continueWorkflowNode } from './nodes/course-creation-node'
import { generalChatNode } from './nodes/general-chat-node'
import { responseGeneratorNode } from './nodes/response-generator-node'
import { HumanMessage, AIMessage } from '@langchain/core/messages'

/**
 * 创建聊天机器人图
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

  // 添加节点
  workflow.addNode('intent_recognition', intentRecognitionNode)
  workflow.addNode('course_creation', courseCreationNode)
  workflow.addNode('continue_workflow', continueWorkflowNode)
  workflow.addNode('general_chat', generalChatNode)
  workflow.addNode('response_generator', responseGeneratorNode)

  // 添加边和条件
  workflow.addEdge('__start__', 'intent_recognition')

  // 意图识别后路由到不同节点
  workflow.addConditionalEdges(
    'intent_recognition',
    routeDecisionNode,
    {
      'course_creation': 'course_creation',
      'outline_generation': 'continue_workflow',
      'assignment_creation': 'continue_workflow',
      'a2a_optimization': 'continue_workflow',
      'content_generation': 'continue_workflow',
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
      return 'continue_workflow'
    },
    {
      'continue_workflow': 'continue_workflow',
      'response_generator': 'response_generator'
    }
  )

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

  constructor() {
    this.graph = createChatbotGraph()
    this.app = this.graph.compile()
  }

  /**
   * 处理聊天消息
   */
  async processMessage(
    message: string,
    conversationId: string,
    userRole: 'teacher' | 'student' | 'self_learner',
    userId?: string,
    conversationHistory: any[] = []
  ): Promise<any> {
    try {
      // 创建初始状态
      let state = createInitialState(conversationId, userRole, userId)

      // 添加历史消息到状态
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

      // 添加当前消息
      state = {
        ...state,
        messages: [...state.messages, new HumanMessage(message)]
      }

      // 运行图
      const result = await this.app.invoke(state)

      // 获取最终响应
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
          workflow: finalState.currentWorkflow
        }
      }

    } catch (error) {
      console.error('聊天处理失败:', error)

      return {
        success: false,
        data: {
          message: `抱歉，处理您的请求时出现了错误：${(error as Error).message}。请重新描述您的需求，或尝试其他操作。`,
          toolsUsed: [],
          metadata: {
            intent: 'error',
            userRole,
            availableActions: ['restart', 'support'],
            suggestions: ['重新开始', '联系技术支持']
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
