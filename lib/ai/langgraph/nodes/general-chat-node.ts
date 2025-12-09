import { ChatbotState } from '../chatbot-state'
import { HumanMessage } from '@langchain/core/messages'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '../config/openai-gateway'

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

回复格式：
{
  "message": "你的回复内容",
  "suggestions": ["建议的快捷操作或问题"],
  "availableActions": ["可用的功能按钮"],
  "metadata": {
    "toolsUsed": [],
    "intent": "general_chat",
    "confidence": 1.0
  }
}
`

    // 调用AI模型
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      prompt,
      maxTokens: 800,
      temperature: 0.8
    })

    // 解析AI响应
    let result
    try {
      result = JSON.parse(text)
    } catch (e) {
      console.error('解析通用聊天响应失败:', e)
      result = {
        message: '您好！我是WeaveMind AI学习助手。我可以帮助您创建课程、生成大纲、设计作业等。请告诉我您想做什么？',
        suggestions: [
          '帮我创建一个课程',
          '生成课程大纲',
          '设计一份作业',
          '使用A2A优化内容'
        ],
        availableActions: ['course_creation', 'outline_generation', 'assignment_creation', 'a2a_optimization'],
        metadata: {
          toolsUsed: [],
          intent: 'general_chat',
          confidence: 1.0
        }
      }
    }

    // 更新状态
    return {
      ...state,
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
