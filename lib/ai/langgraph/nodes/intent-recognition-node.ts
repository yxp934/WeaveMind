import { StateGraph, END } from '@langchain/langgraph'
import { ChatbotState } from '../chatbot-state'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

// 初始化AI模型
const openai = createOpenAI({
  apiKey: process.env.VERCEL_GAVEWAY_KEY || process.env.OPENAI_API_KEY
})

/**
 * 意图识别节点 - 使用AI模型分析用户意图
 */
export async function intentRecognitionNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const lastMessage = state.messages[state.messages.length - 1]

  if (!(lastMessage instanceof HumanMessage)) {
    return { ...state }
  }

  try {
    // 构建意图识别提示
    const intentPrompt = `
你是一个专业的聊天机器人意图识别助手。你的任务是分析用户消息，识别用户的意图并提取关键参数。

用户角色：${state.userRole}
当前工作流：${state.currentWorkflow ? `${state.currentWorkflow.type} (${state.currentWorkflow.status})` : '无'}

用户消息：${lastMessage.content}

请以JSON格式返回识别结果：
{
  "intent": "课程创建|大纲生成|作业创建|A2A优化|内容生成|通用对话|未知",
  "confidence": 0.0-1.0,
  "parameters": {
    "courseTopic": "如果涉及课程创建，提取课程主题",
    "courseDuration": "如果涉及课程创建，提取课程时长",
    "sessionsPerWeek": "如果涉及课程创建，提取每周课次",
    "targetAudience": "如果涉及课程创建，提取目标学员",
    "difficultyLevel": "如果涉及课程创建，提取难度级别",
    "courseType": "如果涉及课程创建，提取课程类型",
    "assignmentType": "如果涉及作业创建，提取作业类型",
    "subject": "提取学科主题",
    "gradeLevel": "提取年级水平"
  },
  "reasoning": "解释你的识别逻辑"
}

注意：
- 如果当前有活跃的工作流，应继续该工作流而不是识别新的意图
- 考虑对话历史上下文
- 提取所有可能相关的信息
`

    // 使用AI模型进行意图识别
    const { text } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt: intentPrompt,
      maxTokens: 500,
      temperature: 0.1
    })

    // 解析AI响应
    let intentResult
    try {
      intentResult = JSON.parse(text)
    } catch (e) {
      console.error('解析意图识别结果失败:', e)
      intentResult = {
        intent: '通用对话',
        confidence: 0.5,
        parameters: {},
        reasoning: '解析失败，使用默认值'
      }
    }

    // 更新状态
    return {
      ...state,
      intent: {
        type: intentResult.intent,
        confidence: intentResult.confidence,
        parameters: intentResult.parameters
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('意图识别失败:', error)

    // 如果有活跃工作流，继续该工作流
    if (state.currentWorkflow && state.currentWorkflow.status === 'active') {
      return {
        ...state,
        intent: {
          type: 'continue_workflow',
          confidence: 1.0,
          parameters: {}
        }
      }
    }

    // 否则返回默认意图
    return {
      ...state,
      intent: {
        type: '通用对话',
        confidence: 0.5,
        parameters: {}
      }
    }
  }
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
  const intent = state.intent?.type || '通用对话'

  switch (intent) {
    case '课程创建':
      return 'course_creation'
    case '大纲生成':
      return 'outline_generation'
    case '作业创建':
      return 'assignment_creation'
    case 'A2A优化':
      return 'a2a_optimization'
    case '内容生成':
      return 'content_generation'
    case 'continue_workflow':
      return 'continue_workflow'
    case '通用对话':
    default:
      return 'general_chat'
  }
}
