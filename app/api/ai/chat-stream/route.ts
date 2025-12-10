import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatbot } from '@/lib/ai/langgraph/chatbot-graph'
import { z } from 'zod'

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
 * 基于LangGraph的流式AI对话API端点
 * 使用Server-Sent Events (SSE)实现实时流式响应
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

    // 3. 使用LangGraph聊天机器人处理消息
    const conversationId = ctx?.organizationId || 'default-conversation'
    const userRole = context?.userRole || (isDemoMode ? 'teacher' : 'student')
    const userId = user?.id || 'demo-user'

    console.log('🤖 使用LangGraph流式处理聊天:', {
      requestId,
      conversationId,
      userRole,
      messageLength: message.length,
      historyLength: context?.conversationHistory?.length || 0
    })

    // 4. 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          // 发送开始信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            requestId,
            timestamp: new Date().toISOString()
          })}\n\n`))

          // 处理AI响应 - 使用流式处理
          const result = await chatbot.processMessage(
            message,
            conversationId,
            userRole,
            userId,
            context?.conversationHistory || []
          )

          if (result.success) {
            const responseData = result.data

            // 发送进度更新
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              progress: 50,
              message: 'AI正在生成响应...',
              timestamp: new Date().toISOString()
            })}\n\n`))

            // 发送完整的AI响应
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              data: responseData,
              metadata: {
                timestamp: new Date().toISOString(),
                requestId,
                mode: isDemoMode ? 'demo' : 'production',
                processingTime: Date.now() - startTime
              }
            })}\n\n`))

          } else {
            // 发送错误信息
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: result.error?.message || '聊天处理失败',
              details: result.error
            })}\n\n`))
          }

        } catch (error: any) {
          console.error('流式处理失败:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error.message || '处理请求时发生错误',
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
