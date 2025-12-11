import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '@/lib/ai/langgraph/config/openai-gateway'
import { chatJobStore } from '@/lib/store/chat-job-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, context, stream } = body

    // 验证必需字段
    if (!message || !context?.userRole) {
      return NextResponse.json(
        { error: 'Missing required fields: message, context.userRole' },
        { status: 400 }
      )
    }

    // 生成任务ID
    const jobId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 创建任务状态
    chatJobStore.create(jobId)
    chatJobStore.update(jobId, { status: 'processing' })

    console.log(`[Chat Async] 开始处理任务: ${jobId}`)

    // 直接处理AI调用并返回结果
    try {
      // 构建对话历史文本
      const recentHistory = context.conversationHistory
        .slice(-10) // 只保留最近10条消息
        .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
        .join('\n')

      // 构建AI提示
      const prompt = `
你是一个专业的AI学习助手，名为WeaveMind。你需要与用户进行自然、友好的对话。

用户角色：${context.userRole}
当前时间：${new Date().toLocaleString('zh-CN')}

对话历史：
${recentHistory}

用户最新消息：${message}

请根据用户角色和对话历史，提供一个恰当的回复。你的回复应该：

1. **友好亲切**：使用温暖、友好的语调
2. **专业准确**：提供准确、实用的信息
3. **主动引导**：根据用户角色提供相关的建议和帮助
4. **简洁明了**：保持回复简洁但信息丰富

请直接回复用户，不需要包含"用户角色"或其他格式化的标签。
`

      // 调用AI模型
      console.log(`[Chat Async ${jobId}] 开始调用AI模型...`)
      const { text: aiResponse } = await generateText({
        model: createGatewayOpenAI().chat(DEFAULT_MODEL),
        prompt,
        maxTokens: 2000,
        temperature: 0.8,
        abortSignal: AbortSignal.timeout(30000) // 30秒超时
      })

      console.log(`[Chat Async ${jobId}] AI响应完成，响应长度: ${aiResponse.length}`)

      // 直接返回AI响应结果
      return NextResponse.json({
        success: true,
        data: {
          jobId,
          status: 'completed',
          result: {
            message: aiResponse,
            metadata: {
              sessionId: jobId,
            },
          },
        }
      })

    } catch (aiError) {
      console.error(`[Chat Async ${jobId}] AI调用失败:`, aiError)

      // 返回错误结果
      return NextResponse.json({
        success: false,
        error: aiError instanceof Error ? aiError.message : 'AI处理失败'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Chat Async] API错误:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
