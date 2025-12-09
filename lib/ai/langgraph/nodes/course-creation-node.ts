import { ChatbotState } from '../chatbot-state'
import { HumanMessage } from '@langchain/core/messages'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const openai = createOpenAI({
  apiKey: process.env.VERCEL_GATEWAY_KEY || process.env.OPENAI_API_KEY
})

/**
 * 课程创建节点 - 使用AI处理课程创建流程
 */
export async function courseCreationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const lastMessage = state.messages[state.messages.length - 1]

  if (!(lastMessage instanceof HumanMessage)) {
    return { ...state }
  }

  try {
    // 构建上下文信息
    const contextInfo = {
      currentWorkflow: state.currentWorkflow,
      courseInfo: state.courseInfo,
      intent: state.intent,
      userRole: state.userRole
    }

    // 构建AI提示
    const prompt = `
你是一个专业的课程创建助手。你需要根据用户的需求和提供的信息，帮助用户创建课程。

当前状态：
- 用户角色：${state.userRole}
- 当前工作流：${state.currentWorkflow ? JSON.stringify(state.currentWorkflow) : '无'}
- 已收集的课程信息：${state.courseInfo ? JSON.stringify(state.courseInfo, null, 2) : '无'}
- 用户最新消息：${lastMessage.content}

你的任务：
1. 分析用户的课程创建需求
2. 如果需要更多信息，向用户询问关键信息
3. 如果信息足够，开始生成课程
4. 保持对话的自然流畅

课程创建需要的关键信息：
- 课程主题
- 课程时长（节数）
- 每周课次
- 目标学员
- 难度级别
- 课程类型（理论/实践/并重）

请以JSON格式返回你的响应：
{
  "message": "你要发送给用户的消息",
  "action": "ask_info|generate_course|continue_collection",
  "updatedCourseInfo": {
    "topic": "课程主题",
    "duration": "课程时长",
    "sessionsPerWeek": "每周课次",
    "targetAudience": "目标学员",
    "difficultyLevel": "难度级别",
    "courseType": "课程类型"
  },
  "workflowStep": "当前工作流步骤",
  "missingInfo": ["缺失的信息字段列表"],
  "suggestions": ["建议的快捷操作"],
  "metadata": {
    "toolsUsed": ["使用的工具列表"],
    "progress": 0-100
  }
}

注意：
- 使用中文回复
- 保持友好和专业的语调
- 根据缺失信息的数量决定下一步行动
- 如果所有信息都收集完成，开始课程生成
`

    // 调用AI模型
    const { text } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt,
      maxTokens: 1000,
      temperature: 0.7
    })

    // 解析AI响应
    let result
    try {
      result = JSON.parse(text)
    } catch (e) {
      console.error('解析课程创建响应失败:', e)
      result = {
        message: '抱歉，处理您的课程创建请求时出现了问题。请重新描述您的需求。',
        action: 'ask_info',
        updatedCourseInfo: {},
        workflowStep: 'error_handling',
        missingInfo: [],
        suggestions: [],
        metadata: {
          toolsUsed: [],
          progress: 0
        }
      }
    }

    // 更新状态
    const updatedState: Partial<ChatbotState> = {
      ...state,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: result.metadata?.toolsUsed || [],
        suggestions: result.suggestions || []
      }
    }

    // 更新工作流状态
    if (result.action === 'generate_course') {
      updatedState.currentWorkflow = {
        type: 'course_creation',
        status: 'completed',
        step: result.workflowStep || 'completed',
        data: {}
      }
    } else if (state.currentWorkflow?.type === 'course_creation') {
      updatedState.currentWorkflow = {
        ...state.currentWorkflow,
        step: result.workflowStep || state.currentWorkflow.step,
        status: 'active'
      }
    } else {
      updatedState.currentWorkflow = {
        type: 'course_creation',
        status: 'active',
        step: result.workflowStep || 'info_collection',
        data: {}
      }
    }

    // 更新课程信息
    if (result.updatedCourseInfo && Object.keys(result.updatedCourseInfo).length > 0) {
      updatedState.courseInfo = {
        ...state.courseInfo,
        ...result.updatedCourseInfo
      }
    }

    return updatedState

  } catch (error) {
    console.error('课程创建处理失败:', error)

    return {
      ...state,
      currentWorkflow: {
        type: 'course_creation',
        status: 'active',
        step: 'error_recovery',
        data: { error: error.message }
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: [],
        suggestions: ['重新开始课程创建']
      }
    }
  }
}

/**
 * 继续工作流节点 - 处理正在进行的工作流
 */
export async function continueWorkflowNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const lastMessage = state.messages[state.messages.length - 1]

  if (!(lastMessage instanceof HumanMessage)) {
    return { ...state }
  }

  try {
    // 根据当前工作流类型继续处理
    switch (state.currentWorkflow?.type) {
      case 'course_creation':
        return await courseCreationNode(state)

      case 'outline_generation':
        // TODO: 实现大纲生成逻辑
        return {
          ...state,
          metadata: {
            ...state.metadata,
            timestamp: new Date().toISOString(),
            toolsUsed: ['outline_generation'],
            suggestions: ['生成大纲']
          }
        }

      case 'assignment_creation':
        // TODO: 实现作业创建逻辑
        return {
          ...state,
          metadata: {
            ...state.metadata,
            timestamp: new Date().toISOString(),
            toolsUsed: ['assignment_creation'],
            suggestions: ['创建作业']
          }
        }

      default:
        return {
          ...state,
          currentWorkflow: undefined
        }
    }
  } catch (error) {
    console.error('继续工作流失败:', error)

    return {
      ...state,
      currentWorkflow: {
        ...state.currentWorkflow,
        status: 'paused',
        step: 'error'
      }
    }
  }
}
