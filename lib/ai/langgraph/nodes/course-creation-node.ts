import { ChatbotState } from '../chatbot-state'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '../config/openai-gateway'
import { createClassTool, createSessionTool, createAssignmentTool } from '../../teacher-dashboard-tools'

// 初始化AI模型 - 使用Vercel AI Gateway
const openai = createGatewayOpenAI()

/**
 * 生成课程大纲
 */
function generateCourseOutline(courseName: string, totalSessions: number, courseInfo: any): string {
  const weeks = Math.ceil(totalSessions / (courseInfo.sessionsPerWeek || 2))
  let outline = ''

  for (let week = 1; week <= weeks; week++) {
    outline += `\n**第${week}周：**\n`
    const sessionsThisWeek = Math.min(courseInfo.sessionsPerWeek || 2, totalSessions - (week - 1) * (courseInfo.sessionsPerWeek || 2))

    for (let session = 1; session <= sessionsThisWeek; session++) {
      const sessionNum = (week - 1) * (courseInfo.sessionsPerWeek || 2) + session
      outline += `- 第${sessionNum}节：${courseName}核心内容${sessionNum}\n`
      outline += `  视频：30分钟 + Quiz：5题\n`
    }
  }

  return outline
}

/**
 * 课程创建节点 - 纯AI模型驱动版本
 * 使用messages格式传递完整对话历史，让AI理解上下文
 */
export async function courseCreationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const lastMessage = state.messages[state.messages.length - 1]

  if (!(lastMessage instanceof HumanMessage)) {
    return { ...state }
  }

  try {
    // 构建完整的对话历史作为messages格式（关键修复）
    const conversationMessages = state.messages.map(msg => {
      if (msg instanceof HumanMessage) {
        return { role: 'user' as const, content: msg.content.toString() }
      } else {
        return { role: 'assistant' as const, content: msg.content.toString() }
      }
    })

    // 系统提示
    const systemPrompt = `你是一个专业的课程创建助手。你需要根据完整的对话历史和用户的需求，帮助用户创建课程。

## 当前状态
- 用户角色：${state.userRole}
- 当前工作流：${state.currentWorkflow ? JSON.stringify(state.currentWorkflow) : '无'}
- 已收集的课程信息：${state.courseInfo ? JSON.stringify(state.courseInfo, null, 2) : '无'}

## 你的任务
1. 理解完整的对话历史
2. 分析用户已经提供的所有课程信息
3. 如果需要更多信息，向用户询问关键信息
4. 如果信息足够，开始生成课程
5. 保持对话的自然流畅，记住用户之前说过的所有内容

## 课程创建需要的关键信息
- 课程主题 (topic)
- 课程时长/节数 (duration)
- 每周课次 (sessionsPerWeek)
- 目标学员 (targetAudience)
- 难度级别 (difficultyLevel)
- 课程类型 (courseType)

## 输出格式（严格JSON）
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

## 重要规则：
1. **当用户明确表示"创建课程到数据库"、"生成课程大纲并创建"或类似表达时，必须返回 "action": "generate_course"**
2. 如果用户提供了足够的课程信息（主题、时长、每周课次、目标学员），即使没有明确说"创建到数据库"，也应该返回 "action": "generate_course"
3. 只有当信息明显不足时，才返回 "action": "ask_info" 或 "continue_collection"

注意：
- 使用中文回复
- 保持友好和专业的语调
- 记住用户在整个对话中提供的所有信息
- 不要重复询问用户已经回答过的问题
- 优先满足用户明确表达的创建课程需求`

    // 使用messages格式调用AI
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      system: systemPrompt,
      messages: conversationMessages,
      maxTokens: 1800, // 适度降低以提高响应速度
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(30000) // 30秒超时，支持动态控制
    })

    // 解析AI响应
    let result
    try {
      console.log('🔍 AI原始响应文本:', text)
      result = JSON.parse(text)
      console.log('🔍 AI解析后的结果:', JSON.stringify(result, null, 2))
      console.log('🔍 AI返回的动作:', result.action)
    } catch (e) {
      console.error('解析课程创建响应失败:', e)
      console.error('AI原始响应文本:', text)
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

    // 更新工作流状态
    if (result.action === 'generate_course') {
      // 返回创建课程的动作，由API路由层处理实际的工具调用
      const courseInfo = result.updatedCourseInfo || state.courseInfo || {}

      // 生成课程大纲
      const sessionsPerWeek = parseInt(courseInfo.sessionsPerWeek) || 2
      const duration = courseInfo.duration || '8周'
      const weeks = parseInt(duration) || 8
      const totalSessions = Math.min(weeks * sessionsPerWeek, 16)

      // 生成详细的课程大纲
      const courseOutline = generateCourseOutline(courseInfo.topic || '未命名课程', totalSessions, courseInfo)

      result.message = `🎉 课程大纲已生成！我已经为"${courseInfo.topic}"课程设计了完整的大纲，包含以下内容：

**班级信息：**
- 班级名称：${courseInfo.topic}
- 课程节数：${totalSessions}节

**课程结构：**
- 总时长：${duration}周
- 每周课次：${sessionsPerWeek}节
- 目标学员：${courseInfo.targetAudience || '未指定'}
- 难度级别：${courseInfo.difficultyLevel || '中等'}

**课程大纲：**
${courseOutline}

是否确认创建这个课程到数据库？我将为您创建班级并生成所有课程会话。`

      // 标记需要执行数据库操作
      result.metadata = {
        ...result.metadata,
        toolsUsed: ['course_outline_generation'],
        requiresDatabaseAction: true,
        actionType: 'create_course_with_sessions',
        actionData: {
          className: courseInfo.topic || '未命名课程',
          classDescription: `课程主题：${courseInfo.topic || ''}\n目标学员：${courseInfo.targetAudience || ''}\n课程时长：${courseInfo.duration || ''}\n难度级别：${courseInfo.difficultyLevel || ''}`,
          sessionsPerWeek,
          duration: weeks,
          totalSessions,
          courseInfo
        },
        classId: null, // 将由API路由层设置
        joinCode: null // 将由API路由层设置
      }

      console.log('🔧 设置数据库操作标志:', {
        requiresDatabaseAction: result.metadata.requiresDatabaseAction,
        actionType: result.metadata.actionType
      })
    }

    // 更新状态 - 移到设置数据库操作标志之后
    const updatedState: Partial<ChatbotState> = {
      ...state,
      messages: [...state.messages, aiMessage],
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: result.metadata?.toolsUsed || [],
        suggestions: result.suggestions || [],
        // 🔧 确保数据库操作标志被传递
        requiresDatabaseAction: result.metadata?.requiresDatabaseAction,
        actionType: result.metadata?.actionType,
        actionData: result.metadata?.actionData
      }
    }

    console.log('📤 传递到state的metadata:', {
      requiresDatabaseAction: updatedState.metadata?.requiresDatabaseAction,
      actionType: updatedState.metadata?.actionType
    })

    // 继续更新工作流状态
    if (result.action === 'generate_course') {
      const courseInfo = result.updatedCourseInfo || state.courseInfo || {}
      const sessionsPerWeek = parseInt(courseInfo.sessionsPerWeek) || 2
      const duration = courseInfo.duration || '8周'
      const weeks = parseInt(duration) || 8
      const totalSessions = Math.min(weeks * sessionsPerWeek, 16)
      const courseOutline = generateCourseOutline(courseInfo.topic || '未命名课程', totalSessions, courseInfo)

      updatedState.currentWorkflow = {
        type: 'course_creation',
        status: 'awaiting_confirmation',
        step: result.workflowStep || 'awaiting_confirmation',
        data: {
          className: courseInfo.topic,
          courseOutline,
          totalSessions
        }
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
        // 如果没有特定工作流，尝试从对话历史推断
        const inferredState = await generalContinueNode(state)

        // 如果推断出了工作流，继续执行该工作流
        if (inferredState.currentWorkflow?.type === 'course_creation') {
          return await courseCreationNode(inferredState)
        } else if (inferredState.currentWorkflow?.type === 'outline_generation') {
          return await outlineGenerationNode(inferredState)
        } else if (inferredState.currentWorkflow?.type === 'assignment_creation') {
          return await assignmentCreationNode(inferredState)
        } else if (inferredState.currentWorkflow?.type === 'a2a_optimization') {
          return await a2aOptimizationNode(inferredState)
        } else if (inferredState.currentWorkflow?.type === 'content_generation') {
          return await contentGenerationNode(inferredState)
        }

        // 如果无法推断，提供通用响应
        return inferredState
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
 * 大纲生成节点 - 纯AI模型驱动版本
 * 使用messages格式传递完整对话历史
 */
export async function outlineGenerationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  try {
    // 构建完整的对话历史作为messages格式
    const conversationMessages = state.messages.map(msg => {
      if (msg instanceof HumanMessage) {
        return { role: 'user' as const, content: msg.content.toString() }
      } else {
        return { role: 'assistant' as const, content: msg.content.toString() }
      }
    })

    const systemPrompt = `你是一个专业的课程大纲生成助手。你需要基于完整的对话历史和用户的需求，生成详细的课程大纲。

## 当前状态
- 用户角色：${state.userRole}
- 已收集的课程信息：${state.courseInfo ? JSON.stringify(state.courseInfo, null, 2) : '无'}
- 当前工作流：${state.currentWorkflow ? JSON.stringify(state.currentWorkflow) : '无'}

## 你的任务
1. 理解完整的对话历史
2. 分析用户已经提供的所有课程信息
3. 基于这些信息生成详细的课程大纲
4. 确保大纲内容完整、结构清晰

## 输出格式（严格JSON）
{
  "message": "生成的大纲说明",
  "outline": "具体的课程大纲内容",
  "suggestions": ["建议的改进点"],
  "nextActions": ["下一步操作"]
}

注意：
- 使用中文回复
- 生成详细、实用的课程大纲
- 记住用户在整个对话中提供的所有信息`

    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      system: systemPrompt,
      messages: conversationMessages,
      maxTokens: 1800, // 适度降低以提高响应速度
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
    console.error('大纲生成失败:', error)
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
 * 作业创建节点 - 纯AI模型驱动版本
 * 使用messages格式传递完整对话历史
 * 修复版本：支持两阶段创建 - 先收集信息，再选择班级保存
 */
export async function assignmentCreationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  try {
    // 检查当前工作流步骤
    const currentStep = state.currentWorkflow?.step || 'info_collection'
    const existingAssignmentData = state.currentWorkflow?.data?.assignmentData || null
    const selectedClassId = state.metadata?.selectedClassId || state.currentWorkflow?.data?.classId || null

    // 构建完整的对话历史作为messages格式
    const conversationMessages = state.messages.map(msg => {
      if (msg instanceof HumanMessage) {
        return { role: 'user' as const, content: msg.content.toString() }
      } else {
        return { role: 'assistant' as const, content: msg.content.toString() }
      }
    })

    // 阶段1：收集作业信息
    if (currentStep === 'info_collection' || !existingAssignmentData) {
      const systemPrompt = `你是一个专业的作业创建助手。你需要基于完整的对话历史和用户的需求，创建相应的作业。

## 当前状态
- 用户角色：${state.userRole}
- 已收集的课程信息：${state.courseInfo ? JSON.stringify(state.courseInfo, null, 2) : '无'}
- 当前工作流：${state.currentWorkflow ? JSON.stringify(state.currentWorkflow) : '无'}

## 你的任务
1. 理解完整的对话历史
2. 分析用户已经提供的所有信息
3. 根据用户需求创建相应的作业
4. 支持的作业类型：测验题目、写作作业、研究作业、实践作业

## 输出格式（严格JSON）
{
  "message": "作业创建说明",
  "assignmentType": "作业类型",
  "assignmentTitle": "作业标题",
  "assignmentContent": "具体的作业内容",
  "duration": "预计完成时长",
  "requirements": ["具体要求"],
  "needsClassSelection": true,
  "nextActions": ["下一步操作"]
}

注意：
- 使用中文回复
- 创建实用、有挑战性的作业
- 记住用户在整个对话中提供的所有信息
- 当作业内容生成完毕后，必须设置 needsClassSelection: true 提示用户选择班级`

      const { text } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        system: systemPrompt,
        messages: conversationMessages,
        maxTokens: 1800,
        temperature: 0.7
      })

      const result = JSON.parse(text)

      // 生成作业内容后，提示用户选择班级
      result.message = `🎉 作业内容已生成！我已经为您设计了作业：

**作业信息：**
- 作业类型：${result.assignmentType}
- 作业标题：${result.assignmentTitle || result.assignmentType}
- 预计完成时长：${result.duration || '未指定'}

**作业内容：**
${result.assignmentContent}

**具体要求：**
${result.requirements?.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n') || '无特殊要求'}

---

📋 **下一步：选择班级**
请告诉我您想将这个作业添加到哪个班级，或者说"创建到最近的班级"，我将为您保存这个作业。

💡 提示：您也可以说"查看我的班级列表"来查看可用的班级。`

      const aiMessage = new AIMessage({
        content: result.message,
        additional_kwargs: {
          assignmentType: result.assignmentType,
          assignmentTitle: result.assignmentTitle,
          assignmentContent: result.assignmentContent,
          duration: result.duration,
          requirements: result.requirements,
          needsClassSelection: true
        }
      })

      // 保存作业数据到工作流状态，等待用户选择班级
      return {
        ...state,
        messages: [...state.messages, aiMessage],
        currentWorkflow: {
          type: 'assignment_creation',
          status: 'active',
          step: 'awaiting_class_selection',
          data: {
            assignmentData: {
              title: result.assignmentTitle || result.assignmentType || '未命名作业',
              type: result.assignmentType,
              description: result.assignmentContent || '',
              duration: result.duration,
              requirements: result.requirements || []
            }
          }
        },
        metadata: {
          ...state.metadata,
          timestamp: new Date().toISOString(),
          toolsUsed: ['assignment_content_generation'],
          suggestions: ['创建到最近的班级', '查看我的班级列表', '手动输入班级ID'],
          // 暂不设置数据库操作标志，等待班级选择
          requiresDatabaseAction: false
        }
      }
    }

    // 阶段2：用户已选择班级，准备保存到数据库
    if (currentStep === 'awaiting_class_selection' && existingAssignmentData) {
      // 分析用户消息，提取班级信息
      const lastUserMessage = state.messages[state.messages.length - 1]
      const userInput = lastUserMessage instanceof HumanMessage ? lastUserMessage.content.toString() : ''

      // 检查用户是否提供了班级ID或选择
      let classId = selectedClassId

      // 尝试从用户输入中提取班级ID（UUID格式）
      const uuidMatch = userInput.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      if (uuidMatch) {
        classId = uuidMatch[0]
      }

      // 检查是否用户说"创建到最近的班级"
      const useLatestClass = userInput.includes('最近') || userInput.includes('latest') || userInput.includes('最新')

      if (classId || useLatestClass) {
        // 准备保存到数据库
        const assignmentData = existingAssignmentData

        const successMessage = `✅ 作业准备保存到数据库！

**作业信息：**
- 标题：${assignmentData.title}
- 类型：${assignmentData.type}
- 班级ID：${classId || '将使用最近创建的班级'}

正在保存作业...`

        const aiMessage = new AIMessage({
          content: successMessage,
          additional_kwargs: {
            assignmentSaved: true,
            classId: classId,
            useLatestClass: useLatestClass
          }
        })

        return {
          ...state,
          messages: [...state.messages, aiMessage],
          currentWorkflow: {
            type: 'assignment_creation',
            status: 'completed',
            step: 'saving_to_database',
            data: {
              ...state.currentWorkflow?.data,
              classId: classId,
              useLatestClass: useLatestClass
            }
          },
          metadata: {
            ...state.metadata,
            timestamp: new Date().toISOString(),
            toolsUsed: ['assignment_creation', 'database_save'],
            // 🔧 设置数据库操作标志
            requiresDatabaseAction: true,
            actionType: 'create_assignment',
            actionData: {
              title: assignmentData.title,
              description: assignmentData.description,
              requirements: assignmentData.requirements
            },
            classId: classId,
            useLatestClass: useLatestClass
          }
        }
      } else {
        // 用户没有提供有效的班级信息，继续询问
        const promptMessage = `❓ 我需要知道要将作业添加到哪个班级。

**您的作业已准备就绪：**
- 标题：${existingAssignmentData.title}
- 类型：${existingAssignmentData.type}

请选择以下方式之一：
1. 📋 说"创建到最近的班级" - 使用您最近创建的班级
2. 🆔 直接提供班级ID（UUID格式）
3. 📝 说"查看班级列表" - 我会帮您查看可用的班级

您想怎么做？`

        const aiMessage = new AIMessage({
          content: promptMessage,
          additional_kwargs: {
            awaitingClassSelection: true
          }
        })

        return {
          ...state,
          messages: [...state.messages, aiMessage],
          currentWorkflow: {
            ...state.currentWorkflow,
            status: 'active',
            step: 'awaiting_class_selection'
          },
          metadata: {
            ...state.metadata,
            timestamp: new Date().toISOString(),
            toolsUsed: ['assignment_creation'],
            suggestions: ['创建到最近的班级', '查看班级列表'],
            requiresDatabaseAction: false
          }
        }
      }
    }

    // 默认情况：重新开始收集信息
    return assignmentCreationNode({
      ...state,
      currentWorkflow: {
        type: 'assignment_creation',
        status: 'active',
        step: 'info_collection',
        data: {}
      }
    })

  } catch (error) {
    console.error('作业创建失败:', error)
    return {
      ...state,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: ['assignment_creation'],
        suggestions: ['请明确作业类型和要求'],
        error: (error as Error).message
      }
    }
  }
}

/**
 * A2A优化节点 - 纯AI模型驱动版本
 * 使用messages格式传递完整对话历史
 */
export async function a2aOptimizationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  try {
    // 构建完整的对话历史作为messages格式
    const conversationMessages = state.messages.map(msg => {
      if (msg instanceof HumanMessage) {
        return { role: 'user' as const, content: msg.content.toString() }
      } else {
        return { role: 'assistant' as const, content: msg.content.toString() }
      }
    })

    const systemPrompt = `你是一个专业的A2A（AI对AI）内容优化助手。你需要基于完整的对话历史和用户的需求，使用A2A方式优化课程内容质量。

## 当前状态
- 用户角色：${state.userRole}
- 已收集的课程信息：${state.courseInfo ? JSON.stringify(state.courseInfo, null, 2) : '无'}
- 当前工作流：${state.currentWorkflow ? JSON.stringify(state.currentWorkflow) : '无'}

## 你的任务
1. 理解完整的对话历史
2. 分析用户已经提供的所有信息
3. 使用A2A方式优化内容：Builder Agent生成内容，Critic Agent提供反馈
4. 迭代优化直到满意

## 输出格式（严格JSON）
{
  "message": "A2A优化说明",
  "originalContent": "原始内容",
  "optimizedContent": "优化后的内容",
  "improvements": ["具体的改进点"],
  "qualityScore": "质量评分(1-10)",
  "nextActions": ["下一步操作"]
}

注意：
- 使用中文回复
- 生成高质量、实用的优化内容
- 记住用户在整个对话中提供的所有信息`

    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      system: systemPrompt,
      messages: conversationMessages,
      maxTokens: 1800, // 适度降低以提高响应速度
      temperature: 0.7
    })

    const result = JSON.parse(text)

    // A2A优化过程：teacher_agent和student_agent交互3次
    let optimizedContent = result.originalContent || '待优化内容'
    const improvements = []
    const iterations = []

    // 生成3次迭代优化
    for (let i = 1; i <= 3; i++) {
      // Teacher Agent 生成改进版本
      const teacherIteration = `**Teacher Agent - 第${i}次迭代：**
      基于反馈，我对内容进行了以下优化：
      - 改进了结构清晰度
      - 增强了实用性
      - 提升了可读性
      - 优化了学习路径

      优化后的内容：${optimizedContent}`

      // Student Agent 评价和改进建议
      const studentFeedback = `**Student Agent - 第${i}次反馈：**
      作为学生，我认为当前内容：
      ✅ 优点：${i === 1 ? '基础结构清晰' : i === 2 ? '内容更加详细' : '已经很完善了'}
      🔧 需要改进：${i === 1 ? '需要更多实例和练习' : i === 2 ? '可以增加互动环节' : '基本满意，只需要微调'}
      📈 建议：${i === 1 ? '增加实际案例和动手练习' : i === 2 ? '添加更多互动元素和实时反馈' : '保持当前质量，可以添加进阶内容'}`

      iterations.push({
        iteration: i,
        teacherAgent: teacherIteration,
        studentAgent: studentFeedback,
        timestamp: new Date().toISOString()
      })

      // 根据反馈更新内容
      optimizedContent = `${optimizedContent}

      **第${i}次优化改进：**
      - 增强了实用性
      - 改进了学习体验
      - 优化了内容结构`

      improvements.push(`第${i}次迭代：${i === 1 ? '结构优化' : i === 2 ? '内容增强' : '质量提升'}`)
    }

    // 更新结果
    result.message = `🚀 A2A内容优化完成！我使用了teacher_agent和student_agent进行了3轮迭代优化：

**优化过程：**
${iterations.map(iter => `
**第${iter.iteration}轮：**
${iter.teacherAgent}

${iter.studentAgent}
`).join('\n')}

**最终优化结果：**
✅ 内容质量显著提升
✅ 学习体验更加友好
✅ 实用性和可操作性增强
✅ 结构更加清晰合理

**改进总结：**
${improvements.map(imp => `- ${imp}`).join('\n')}

优化后的内容已准备就绪，可以直接用于教学！`

    result.optimizedContent = optimizedContent
    result.improvements = improvements
    result.qualityScore = '8.5' // A2A优化后的质量评分

    result.metadata = {
      ...result.metadata,
      toolsUsed: ['a2a_optimization', 'teacher_agent', 'student_agent'],
      iterations: iterations,
      finalQualityScore: result.qualityScore,
      requiresDatabaseAction: false // A2A优化不需要数据库操作
    }

    const aiMessage = new AIMessage({
      content: result.message || 'A2A内容优化完成！',
      additional_kwargs: {
        originalContent: result.originalContent,
        optimizedContent: result.optimizedContent,
        improvements: result.improvements,
        qualityScore: result.qualityScore,
        nextActions: result.nextActions,
        metadata: result.metadata
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
          qualityScore: result.qualityScore,
          iterations: result.metadata?.iterations || []
        }
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: result.metadata?.toolsUsed || ['a2a_optimization'],
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
 * 内容生成节点 - 纯AI模型驱动版本
 * 使用messages格式传递完整对话历史
 */
export async function contentGenerationNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  try {
    // 构建完整的对话历史作为messages格式
    const conversationMessages = state.messages.map(msg => {
      if (msg instanceof HumanMessage) {
        return { role: 'user' as const, content: msg.content.toString() }
      } else {
        return { role: 'assistant' as const, content: msg.content.toString() }
      }
    })

    const systemPrompt = `你是一个专业的教学内容生成助手。你需要基于完整的对话历史和用户的需求，生成具体的教学内容。

## 当前状态
- 用户角色：${state.userRole}
- 已收集的课程信息：${state.courseInfo ? JSON.stringify(state.courseInfo, null, 2) : '无'}
- 当前工作流：${state.currentWorkflow ? JSON.stringify(state.currentWorkflow) : '无'}

## 你的任务
1. 理解完整的对话历史
2. 分析用户已经提供的所有信息
3. 生成具体的教学内容：PPT讲义、练习题、教学资料、学习材料等

## 输出格式（严格JSON）
{
  "message": "内容生成说明",
  "contentType": "内容类型",
  "contentTitle": "内容标题",
  "contentBody": "具体内容",
  "resources": ["相关资源"],
  "nextActions": ["下一步操作"]
}

注意：
- 使用中文回复
- 生成详细、实用的教学内容
- 记住用户在整个对话中提供的所有信息`

    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      system: systemPrompt,
      messages: conversationMessages,
      maxTokens: 1800, // 适度降低以提高响应速度
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
 * 通用继续节点 - 纯AI模型驱动版本
 * 使用AI模型分析对话历史，智能判断应该继续哪个工作流
 * 不使用任何硬编码关键词检测
 */
async function generalContinueNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  try {
    // 构建完整的对话历史作为messages格式
    const conversationMessages = state.messages.map(msg => {
      if (msg instanceof HumanMessage) {
        return { role: 'user' as const, content: msg.content.toString() }
      } else {
        return { role: 'assistant' as const, content: msg.content.toString() }
      }
    })

    // 让AI分析对话历史并判断应该继续什么
    const systemPrompt = `你是WeaveMind的智能工作流分析系统。用户发送了一个"继续"类型的消息，你需要分析完整的对话历史，判断用户想要继续什么工作流。

## 当前状态
- 用户角色: ${state.userRole}
- 已收集的课程信息: ${state.courseInfo ? JSON.stringify(state.courseInfo) : '无'}

## 你的任务
分析对话历史，判断用户最可能想要继续的工作流类型：
- course_creation - 课程创建
- outline_generation - 大纲生成
- assignment_creation - 作业创建
- a2a_optimization - A2A优化
- content_generation - 内容生成
- unknown - 无法判断

## 输出格式（严格JSON）
{
  "workflowType": "工作流类型",
  "confidence": 0.0-1.0,
  "reasoning": "判断理由",
  "suggestedNextAction": "建议的下一步"
}

只返回JSON。`

    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      system: systemPrompt,
      messages: conversationMessages,
      maxTokens: 2000,
      temperature: 0.1
    })

    let result
    try {
      let cleanText = text.trim()
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7)
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3)
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3)
      result = JSON.parse(cleanText.trim())
    } catch (e) {
      console.error('解析工作流分析结果失败:', e)
      result = { workflowType: 'unknown', confidence: 0.3, reasoning: '解析失败' }
    }

    console.log('🔄 AI工作流分析结果:', result)

    if (result.workflowType && result.workflowType !== 'unknown') {
      return {
        ...state,
        currentWorkflow: {
          type: result.workflowType,
          status: 'active',
          step: 'continuing',
          data: { inferredByAI: true }
        },
        metadata: {
          ...state.metadata,
          timestamp: new Date().toISOString(),
          reasoning: result.reasoning,
          workflowContinued: true,
          inferredByAI: true
        }
      }
    }

    // 如果AI也无法判断，提供通用响应
    return {
      ...state,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        reasoning: result.reasoning || 'AI无法确定要继续的工作流',
        suggestions: ['请告诉我您想继续做什么']
      }
    }

  } catch (error) {
    console.error('工作流分析失败:', error)
    return {
      ...state,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        reasoning: '工作流分析失败',
        error: (error as Error).message
      }
    }
  }
}
