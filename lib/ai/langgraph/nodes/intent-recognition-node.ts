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
          currentWorkflow: state.currentWorkflow, // 关键修复：确保currentWorkflow保持不变
          metadata: {
            ...state.metadata,
            timestamp: new Date().toISOString(),
            reasoning: `检测到活跃工作流 ${state.currentWorkflow.type}，继续当前流程`,
            workflowContinued: true
          }
        }
      }
    }

    // 关键修复2: 检查用户输入是否为继续指令，并从对话历史推断当前工作流
    const userInput = lastMessage.content.toString().toLowerCase()
    const continueKeywords = ['继续', '下一步', '好的', '明白了', '可以', '继续吧', '好的，继续', 'continue', 'next']
    const wantsToContinue = continueKeywords.some(keyword => userInput.includes(keyword))

    if (wantsToContinue) {
      // 从对话历史中推断当前可能的工作流
      const conversationHistory = state.messages.slice(-6) // 最近6条消息
      let likelyWorkflow = null

      // 检查对话历史中是否有创建课程的迹象
      const hasCourseCreation = conversationHistory.some(msg => {
        const content = msg.content.toString().toLowerCase()
        return content.includes('创建课程') || content.includes('神经科学') ||
               content.includes('8周') || content.includes('大学生') ||
               content.includes('课程') || content.includes('课程大纲')
      })

      if (hasCourseCreation) {
        likelyWorkflow = {
          type: 'course_creation',
          status: 'active',
          step: 'generating_outline',
          data: { inferredFromHistory: true }
        }

        return {
          ...state,
          intent: {
            type: 'continue_workflow',
            confidence: 0.9,
            parameters: {
              currentWorkflowType: 'course_creation',
              currentStep: 'generating_outline',
              inferredFromHistory: true
            }
          },
          currentWorkflow: likelyWorkflow,
          metadata: {
            ...state.metadata,
            timestamp: new Date().toISOString(),
            reasoning: `从对话历史推断用户想要继续课程创建工作流`,
            workflowContinued: true,
            inferredFromHistory: true
          }
        }
      }
    }

    // 关键修复3: 构建更完整的对话历史上下文（最近10条消息）
    const conversationHistory = state.messages.slice(-10)
    const historyText = conversationHistory.map(msg =>
      `${msg instanceof HumanMessage ? '用户' : '助手'}: ${msg.content}`
    ).join('\n')

    // 关键修复4: 增强版意图识别提示，包含更多上下文和规则
    const intentPrompt = `
你是一个专业的AI教育助手意图识别系统。你需要精确识别用户的真实意图。

## 当前会话状态：
- 会话ID：${state.sessionId}
- 用户角色：${state.userRole}
- 当前工作流：${state.currentWorkflow ? `${state.currentWorkflow.type} (状态: ${state.currentWorkflow.status}, 步骤: ${state.currentWorkflow.step})` : '无'}
- 已收集的课程信息：${state.courseInfo ? JSON.stringify(state.courseInfo, null, 2) : '无'}
- 消息总数：${state.messages.length}

## 完整对话历史（最近10条消息）：
${historyText}

## 用户最新消息：
${lastMessage.content}

## 六个核心工作流类型及识别规则：

1. **课程创建 (course_creation)**
   - 触发词：创建课程、新课程、开设课程、设计课程、我想上课、教XX课
   - 用户想要从头创建一个完整的教学课程
   - 需要收集：主题、时长、频率、受众、难度、类型

2. **大纲生成 (outline_generation)**
   - 触发词：生成大纲、课程大纲、教学大纲、课程结构、章节规划
   - 用户想要基于主题生成详细的教学大纲
   - 需要收集：主题、描述、目标受众、时长

3. **作业创建 (assignment_creation)**
   - 触发词：创建作业、布置作业、设计测验、考试题目、写作任务
   - 用户想要创建各类作业（测验、写作、研究）
   - 需要收集：类型、主题、难度、截止日期

4. **A2A优化 (a2a_optimization)**
   - 触发词：优化内容、改进课程、A2A、AI优化、内容审核
   - 用户想要使用AI对AI的方式优化现有内容
   - 需要收集：待优化内容、优化目标

5. **内容生成 (content_generation)**
   - 触发词：生成内容、创建材料、PPT、讲义、练习题、学习资料
   - 用户想要生成具体的教学内容和材料
   - 需要收集：内容类型、主题、格式

6. **继续工作流 (continue_workflow)**
   - 当用户在现有工作流中回答问题或提供更多信息时
   - 当用户说"继续"、"下一步"、"好的"等确认性回复时

7. **通用对话 (general_chat)**
   - 闲聊、问候、不明确的请求
   - 需要引导用户选择具体功能

## 意图识别原则：
1. **上下文优先**：如果对话历史显示正在进行某个工作流，用户的回复很可能是继续该工作流
2. **明确意图**：只有当用户明确表达新需求时，才切换到新工作流
3. **参数提取**：尽可能从用户消息中提取所有相关参数
4. **高置信度**：对于明确的意图，置信度应该>=0.8
5. **引导性回复**：对于模糊的意图，提供选择题引导用户

请以JSON格式返回识别结果（严格遵循此格式）：
{
  "intent": "course_creation|outline_generation|assignment_creation|a2a_optimization|content_generation|continue_workflow|general_chat",
  "confidence": 0.0-1.0,
  "parameters": {
    "courseTopic": "课程主题（如果识别到）",
    "courseDuration": "课程时长（如果识别到）",
    "sessionsPerWeek": "每周课次（如果识别到）",
    "targetAudience": "目标学员（如果识别到）",
    "difficultyLevel": "难度级别（如果识别到）",
    "courseType": "课程类型（如果识别到）",
    "assignmentType": "作业类型（如果识别到）",
    "contentType": "内容类型（如果识别到）"
  },
  "reasoning": "详细的识别逻辑说明",
  "suggestedResponse": "建议的AI回复内容",
  "missingInfo": ["缺失的关键信息列表"],
  "nextStep": "建议的下一步操作"
}

重要：返回纯JSON，不要包含任何其他文本或markdown格式。
`

    // 关键修复5: 使用AI模型进行智能意图识别
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      prompt: intentPrompt,
      maxTokens: 1000,
      temperature: 0.1  // 降低temperature以获得更一致的结果
    })

    // 关键修复6: 更强的JSON解析和错误处理
    let intentResult
    try {
      // 尝试清理可能的markdown格式
      let cleanText = text.trim()
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.slice(7)
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.slice(3)
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.slice(0, -3)
      }
      intentResult = JSON.parse(cleanText.trim())
    } catch (e) {
      console.error('解析意图识别结果失败:', e, 'Raw text:', text)
      throw new Error(`意图识别失败: ${e.message}`)
    }

    // 关键修复7: 映射中文意图到英文工作流类型
    const intentMapping: Record<string, string> = {
      '课程创建': 'course_creation',
      '大纲生成': 'outline_generation',
      '作业创建': 'assignment_creation',
      'A2A优化': 'a2a_optimization',
      '内容生成': 'content_generation',
      '继续工作流': 'continue_workflow',
      '通用对话': 'general_chat'
    }

    const mappedIntent = intentMapping[intentResult.intent] || intentResult.intent

    // 关键修复8: 更新状态，包含完整的识别信息
    return {
      ...state,
      intent: {
        type: mappedIntent,
        confidence: intentResult.confidence || 0.5,
        parameters: intentResult.parameters || {}
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        reasoning: intentResult.reasoning,
        suggestedResponse: intentResult.suggestedResponse,
        missingInfo: intentResult.missingInfo || [],
        nextStep: intentResult.nextStep,
        mode: 'ai_recognition'
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
