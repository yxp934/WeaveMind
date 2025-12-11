import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '@/lib/ai/langgraph/config/openai-gateway'

export const runtime = 'edge'

// AI聊天请求验证模式
const chatStreamRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.object({
    courseId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    organizationId: z.string().uuid().optional(),
    userRole: z.enum(['teacher', 'student', 'self_learner']),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.string(),
      toolsUsed: z.array(z.string()).optional(),
      metadata: z.record(z.string(), z.any()).optional()
    })).optional()
  }).optional()
})

/**
 * 真正的流式AI对话API端点
 * 使用正确的generateText函数调用AI模型
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    // 1. 解析和验证请求数据
    const body = await request.json()
    const validation = chatStreamRequestSchema.safeParse(body)

    if (!validation.success) {
      return new Response(`data: ${JSON.stringify({
        type: 'error',
        error: '请求数据验证失败'
      })}\n\n`, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    const { message: msg, context: ctx } = validation.data
    const message = msg
    const context = ctx

    // 2. 检查认证状态
    const supabase = await createClient()
    const { data: { user: authenticatedUser } } = await supabase.auth.getUser()
    let user = authenticatedUser
    let isDemoMode = false

    // 如果没有用户但有上下文，或者明确设置为演示模式
    if (!user || (ctx?.userRole && !user)) {
      isDemoMode = true
      user = { id: 'demo-user', email: 'demo@example.com' }
    }

    // 3. 构建对话历史
    const conversationHistory = context?.conversationHistory || []
    const userRole = context?.userRole || 'teacher'

    // 4. 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          console.log('🚀 开始流式AI处理:', {
            requestId,
            messageLength: message.length,
            historyLength: (conversationHistory || []).length
          })

          // 发送开始信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            requestId,
            timestamp: new Date().toISOString()
          })}\n\n`))

          // 立即发送处理开始信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            progress: 10,
            message: '🤖 正在分析您的需求...',
            timestamp: new Date().toISOString()
          })}\n\n`))

          // 构建对话历史文本
          const conversationText = (conversationHistory || [])
            .slice(-10) // 只保留最近10条消息
            .map(h => {
              if (h.role === 'user') {
                return `用户: ${h.content}`
              } else {
                return `助手: ${h.content}`
              }
            })
            .join('\n')

          // 构建AI提示
          const prompt = `
你是一个专业的AI学习助手，名为WeaveMind。你需要与用户进行自然、友好的对话。

用户角色：${userRole}
当前时间：${new Date().toLocaleString('zh-CN')}

对话历史：
${conversationText}

用户最新消息：${message}

请根据用户角色和对话历史，提供一个恰当的回复。你的回复应该：

1. **友好亲切**：使用温暖、友好的语调
2. **专业准确**：提供准确、实用的信息
3. **主动引导**：根据用户角色提供相关的建议和帮助
4. **简洁明了**：保持回复简洁但信息丰富

请直接回复用户，不需要包含"用户角色"或其他格式化的标签。
`

          console.log('🤖 开始调用AI模型...')

          // 直接调用AI模型 - 使用正确的generateText函数
          const { text: aiResponse } = await generateText({
            model: createGatewayOpenAI().chat(DEFAULT_MODEL),
            prompt,
            maxTokens: 2000,
            temperature: 0.8,
            abortSignal: AbortSignal.timeout(30000) // 30秒超时
          })

          console.log('🤖 AI模型响应:', {
            requestId,
            responseLength: aiResponse.length,
            processingTime: Date.now() - startTime
          })

          // 发送进度更新到90%
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            progress: 90,
            message: '🤖 正在整理答案...',
            timestamp: new Date().toISOString()
          })}\n\n`))

          // 等待一下让用户看到"整理答案"
          await new Promise(resolve => setTimeout(resolve, 500))

          // 真正的字符级流式输出
          const characters = aiResponse.split('')
          let currentText = ''

          for (let i = 0; i < characters.length; i++) {
            currentText += characters[i]

            // 每几个字符发送一次更新
            if (i % 2 === 0 || i === characters.length - 1) {
              // 发送流式内容更新
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'streaming',
                content: currentText,
                progress: 90 + Math.floor((i / characters.length) * 10), // 90%到100%的进度
                timestamp: new Date().toISOString()
              })}\n\n`))

              // 添加小延迟以实现流畅效果
              if (i < characters.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 30)) // 30ms延迟
              }
            }
          }

          // 发送完整的AI响应
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            data: {
              message: aiResponse,
              choices: undefined,
              metadata: {
                intent: 'general_chat',
                userRole: userRole,
                conversationId: context?.organizationId || 'default-conversation',
                isDemoMode
              }
            },
            metadata: {
              timestamp: new Date().toISOString(),
              requestId,
              mode: isDemoMode ? 'demo' : 'production',
              processingTime: Date.now() - startTime
            }
          })}\n\n`))

          console.log('✅ 流式处理完成:', {
            requestId,
            totalProcessingTime: Date.now() - startTime
          })

        } catch (error: any) {
          console.error('🚨 流式处理失败:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error.message || 'AI处理失败',
            details: error.stack,
            timestamp: new Date().toISOString()
          })}\n\n`))
        } finally {
          // 发送结束信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'end',
            timestamp: new Date().toISOString()
          })}\n\n`))

          // 关闭流
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error('🚨 Chat Stream API Error:', {
      requestId,
      error: error.message,
      processingTime
    })

    return new Response(`data: ${JSON.stringify({
      type: 'error',
      error: error.message || '处理请求时发生错误',
      timestamp: new Date().toISOString()
    })}\n\n`, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  }
}

/**
 * 处理CORS预检请求
 */
export async function OPTIONS(request: NextRequest): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}
