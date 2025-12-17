import { ChatbotState } from '../chatbot-state'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '../config/openai-gateway'
import { parseModelResponse } from '../utils/model-response'

// 初始化AI模型 - 使用Vercel AI Gateway
const openai = createGatewayOpenAI()

/**
 * 通用聊天节点 - 处理一般性对话
 */
export async function generalChatNode(state: ChatbotState): Promise<Partial<ChatbotState>> {
  const lastMessage = state.messages[state.messages.length - 1]

  if (!(lastMessage instanceof HumanMessage)) {
    return { ...state }
  }

  try {
    // 构建对话历史文本
    const conversationHistory = state.messages
      .slice(-10) // 只保留最近10条消息
      .map(msg => {
        if (msg instanceof HumanMessage) {
          return `用户: ${msg.content}`
        } else {
          return `助手: ${msg.content}`
        }
      })
      .join('\n')

    // 构建提示
    const prompt = `
你是一个专业的AI学习助手，名为WeaveMind。你需要与用户进行自然、友好的对话。

用户角色：${state.userRole}
当前时间：${new Date().toLocaleString('zh-CN')}

对话历史：
${conversationHistory}

用户最新消息：${lastMessage.content}

请根据用户角色和对话历史，提供一个恰当的回复。你的回复应该：

1. **友好亲切**：使用温暖、友好的语调
2. **专业准确**：提供准确、实用的信息
3. **主动引导**：根据用户角色提供相关的建议和帮助
4. **简洁明了**：保持回复简洁但信息丰富

根据用户角色，你可以提供以下帮助：

**教师角色**：
- 创建和管理课程
- 生成课程大纲
- 设计作业和评估
- 使用A2A优化教学内容
- 分析学生学习数据

**学生角色**：
- 学习辅导和答疑
- 制定学习计划
- 提供学习资源
- 跟踪学习进度
- 练习和测试

**自主学习者角色**：
- 技能提升建议
- 学习路径规划
- 资源推荐
- 进度跟踪

请生成一个自然的回复，帮助用户并引导对话。

    回复必须严格遵守TOON格式，包含以下字段：
    message: 你的回复内容
    suggestions: 建议的快捷操作或问题（数组，最多4个，用逗号分隔）
    availableActions: 可用的功能按钮（数组，最多4个）
    metadata:
      toolsUsed: 使用到的工具名称数组
      intent: general_chat
      confidence: 1.0
输出时必须满足：
1. 第一行输出: ---BEGIN_TOON---
2. 中间是符合上述字段定义的TOON内容
3. 最后一行输出: ---END_TOON---
不要输出任何其他解释、前后缀或代码块标记。
`

    // 调用AI模型
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      prompt,
      maxTokens: 1500,
      temperature: 0.8,
      abortSignal: AbortSignal.timeout(30000) // 30秒超时，支持动态控制
    })

    // 解析AI响应
    let result
    try {
      result = parseModelResponse<{
        message: string
        suggestions?: string[]
        availableActions?: string[]
        metadata?: {
          toolsUsed?: string[]
          intent?: string
          confidence?: number
        }
      }>(text)
    } catch (e) {
      console.error('解析通用聊天响应失败:', e)
      // 删除预设消息，抛出错误让用户知道模型解析失败
      throw new Error(`TOON格式解析失败: ${e.message}。请重新输入您的请求。`)
    }

    // 创建AI响应消息
    if (!result.message) {
      throw new Error('AI模型返回了空的响应内容')
    }
    const aiMessage = new AIMessage({
      content: result.message,
      additional_kwargs: {
        intent: 'general_chat',
        suggestions: result.suggestions,
        availableActions: result.availableActions,
        metadata: result.metadata
      }
    })

    // 更新状态
    return {
      ...state,
      messages: [...state.messages, aiMessage],
      intent: {
        type: 'general_chat',
        confidence: result.metadata?.confidence || 1.0,
        parameters: {}
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: result.metadata?.toolsUsed || [],
        suggestions: result.suggestions || [],
        availableActions: result.availableActions || []
      }
    }

  } catch (error) {
    console.error('通用聊天处理失败:', error)

    return {
      ...state,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        toolsUsed: [],
        suggestions: ['重新开始对话'],
        availableActions: []
      }
    }
  }
}
