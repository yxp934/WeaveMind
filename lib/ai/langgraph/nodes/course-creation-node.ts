import { ChatbotState } from '../chatbot-state'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '../config/openai-gateway'

// 初始化AI模型 - 使用Vercel AI Gateway
const openai = createGatewayOpenAI()

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
      model: openai.chat(DEFAULT_MODEL),
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

    // 创建AI响应消息
    const aiMessage = new AIMessage({
      content: result.message || '我已经理解了您的课程创建需求。',
      additional_kwargs: {
        courseInfo: result.updatedCourseInfo,
        action: result.action,
        workflowStep: result.workflowStep,
        missingInfo: result.missingInfo,
        suggestions: result.suggestions,
        metadata: result.metadata
      }
    })

    // 更新状态
    const updatedState: Partial<ChatbotState> = {
      ...state,
      messages: [...state.messages, aiMessage],
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
 * 修复版本：完善所有六个核心工作流的实现
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
        return await outlineGenerationNode(state)

      case 'assignment_creation':
        return await assignmentCreationNode(state)

      case 'a2a_optimization':
        return await a2aOptimizationNode(state)

      case 'content_generation':
        return await contentGenerationNode(state)

      default:
        // 如果没有特定工作流，返回通用继续逻辑
        return await generalContinueNode(state)
    }
  } catch (error) {
    console.error('继续工作流失败:', error)

    return {
      ...state,
      currentWorkflow: {
        ...state.currentWorkflow,
        status: 'paused',
        step: 'error'
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        error: error.message,
        suggestions: ['重新开始', '联系技术支持']
      }
    }
  }
}

/**
 * 大纲生成节点 - 导出版本
 */
export async function outlineGenerationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const prompt = `
你是一个专业的课程大纲生成助手。

当前状态：
- 用户角色：${state.userRole}
- 已收集的信息：${state.courseInfo ? JSON.stringify(state.courseInfo) : '无'}
- 用户最新消息：${state.messages[state.messages.length - 1].content}

任务：基于用户提供的信息，生成详细的课程大纲。

请返回JSON格式：
{
  "message": "生成的大纲说明",
  "outline": "具体的课程大纲内容",
  "suggestions": ["建议的改进点"],
  "nextActions": ["下一步操作"]
}
`

  try {
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      prompt,
      maxTokens: 1000,
      temperature: 0.7
    })

    const result = JSON.parse(text)

    const aiMessage = new AIMessage({
      content: result.message || '课程大纲已生成完成！',
      additional_kwargs: {
        outline: result.outline,
        suggestions: result.suggestions,
        nextActions: result.nextActions
      }
    })

    return {
      ...state,
      messages: [...state.messages, aiMessage],
      currentWorkflow: {
        type: 'outline_generation',
        status: 'completed',
        step: 'generated',
        data: { outline: result.outline }
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: ['outline_generation'],
        suggestions: result.suggestions || []
      }
    }
  } catch (error) {
    return {
      ...state,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: ['outline_generation'],
        suggestions: ['请提供更多课程信息']
      }
    }
  }
}

/**
 * 作业创建节点 - 导出版本
 */
export async function assignmentCreationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const prompt = `
你是一个专业的作业创建助手。

当前状态：
- 用户角色：${state.userRole}
- 已收集的信息：${state.courseInfo ? JSON.stringify(state.courseInfo) : '无'}
- 用户最新消息：${state.messages[state.messages.length - 1].content}

任务：根据用户需求创建相应的作业。

支持的作业类型：
1. 测验题目 (quiz) - 多项选择题
2. 写作作业 (writing) - 论文、报告等
3. 研究作业 (research) - 调研、分析类作业

请返回JSON格式：
{
  "message": "作业创建说明",
  "assignmentType": "作业类型",
  "assignmentContent": "具体的作业内容",
  "requirements": ["具体要求"],
  "nextActions": ["下一步操作"]
}
`

  try {
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      prompt,
      maxTokens: 1000,
      temperature: 0.7
    })

    const result = JSON.parse(text)

    const aiMessage = new AIMessage({
      content: result.message || '作业已创建完成！',
      additional_kwargs: {
        assignmentType: result.assignmentType,
        assignmentContent: result.assignmentContent,
        requirements: result.requirements,
        nextActions: result.nextActions
      }
    })

    return {
      ...state,
      messages: [...state.messages, aiMessage],
      currentWorkflow: {
        type: 'assignment_creation',
        status: 'completed',
        step: 'created',
        data: {
          assignmentType: result.assignmentType,
          assignmentContent: result.assignmentContent
        }
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: ['assignment_creation'],
        suggestions: result.requirements || []
      }
    }
  } catch (error) {
    return {
      ...state,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: ['assignment_creation'],
        suggestions: ['请明确作业类型和要求']
      }
    }
  }
}

/**
 * A2A优化节点 - 导出版本
 */
export async function a2aOptimizationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const prompt = `
你是一个专业的A2A（AI对AI）内容优化助手。

当前状态：
- 用户角色：${state.userRole}
- 已收集的信息：${state.courseInfo ? JSON.stringify(state.courseInfo) : '无'}
- 用户最新消息：${state.messages[state.messages.length - 1].content}

任务：使用A2A方式优化课程内容质量，包括：
1. Builder Agent生成内容
2. Critic Agent提供反馈
3. 迭代优化直到满意

请返回JSON格式：
{
  "message": "A2A优化说明",
  "originalContent": "原始内容",
  "optimizedContent": "优化后的内容",
  "improvements": ["具体的改进点"],
  "qualityScore": "质量评分(1-10)",
  "nextActions": ["下一步操作"]
}
`

  try {
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      prompt,
      maxTokens: 1200,
      temperature: 0.7
    })

    const result = JSON.parse(text)

    const aiMessage = new AIMessage({
      content: result.message || 'A2A内容优化完成！',
      additional_kwargs: {
        originalContent: result.originalContent,
        optimizedContent: result.optimizedContent,
        improvements: result.improvements,
        qualityScore: result.qualityScore,
        nextActions: result.nextActions
      }
    })

    return {
      ...state,
      messages: [...state.messages, aiMessage],
      currentWorkflow: {
        type: 'a2a_optimization',
        status: 'completed',
        step: 'optimized',
        data: {
          originalContent: result.originalContent,
          optimizedContent: result.optimizedContent,
          qualityScore: result.qualityScore
        }
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: ['a2a_optimization'],
        suggestions: result.improvements || []
      }
    }
  } catch (error) {
    return {
      ...state,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: ['a2a_optimization'],
        suggestions: ['请提供需要优化的具体内容']
      }
    }
  }
}

/**
 * 内容生成节点 - 导出版本
 */
export async function contentGenerationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const prompt = `
你是一个专业的教学内容生成助手。

当前状态：
- 用户角色：${state.userRole}
- 已收集的信息：${state.courseInfo ? JSON.stringify(state.courseInfo) : '无'}
- 用户最新消息：${state.messages[state.messages.length - 1].content}

任务：生成具体的教学内容，包括：
1. PPT讲义
2. 练习题
3. 教学资料
4. 学习材料

请返回JSON格式：
{
  "message": "内容生成说明",
  "contentType": "内容类型",
  "contentTitle": "内容标题",
  "contentBody": "具体内容",
  "resources": ["相关资源"],
  "nextActions": ["下一步操作"]
}
`

  try {
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      prompt,
      maxTokens: 1200,
      temperature: 0.7
    })

    const result = JSON.parse(text)

    const aiMessage = new AIMessage({
      content: result.message || '教学内容生成完成！',
      additional_kwargs: {
        contentType: result.contentType,
        contentTitle: result.contentTitle,
        contentBody: result.contentBody,
        resources: result.resources,
        nextActions: result.nextActions
      }
    })

    return {
      ...state,
      messages: [...state.messages, aiMessage],
      currentWorkflow: {
        type: 'content_generation',
        status: 'completed',
        step: 'generated',
        data: {
          contentType: result.contentType,
          contentTitle: result.contentTitle,
          contentBody: result.contentBody
        }
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: ['content_generation'],
        suggestions: result.resources || []
      }
    }
  } catch (error) {
    return {
      ...state,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: ['content_generation'],
        suggestions: ['请明确需要生成的内容类型']
      }
    }
  }
}

/**
 * 通用继续节点
 */
async function generalContinueNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  return {
    ...state,
    currentWorkflow: undefined,
    metadata: {
      ...state.metadata,
      timestamp: new Date().toISOString(),
      suggestions: ['请重新描述您的需求', '创建课程', '生成大纲']
    }
  }
}
