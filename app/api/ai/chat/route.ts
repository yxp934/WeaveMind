import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChatRequest, StandardApiResponse, ChatResponseData } from '@/lib/types/api'
import { chatbot } from '@/lib/ai/langgraph/chatbot-graph'
import { z } from 'zod'

export const runtime = 'edge'

// AI聊天请求验证模式
const chatRequestSchema = z.object({
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
  }).optional(),
  tools: z.array(z.string()).optional(),
  stream: z.boolean().optional() // 新增：流式输出标志
})

/**
 * 基于LangGraph的统一AI对话API端点
 * 支持真正的AI上下文记忆和动态对话
 */
export async function POST(request: NextRequest): Promise<NextResponse<StandardApiResponse<ChatResponseData>>> {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    // 1. 解析和验证请求数据
    const body = await request.json()
    const validation = chatRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          details: validation.error.issues
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId
        }
      }, { status: 400 })
    }

    const { message: msg, context: ctx, stream: isStreamMode } = validation.data
    const message = msg
    const context = ctx
    const enableStream = isStreamMode || false

    // 2. 检查认证状态
    const supabase = await createClient()
    const { data: { user: authenticatedUser } } = await supabase.auth.getUser()
    let user = authenticatedUser
    let isDemoMode = false

    // 如果没有用户但有上下文，或者明确设置为演示模式
    if (!user || (ctx?.userRole && !user)) {
      isDemoMode = true
      // 演示模式下使用默认值
      user = { id: 'demo-user', email: 'demo@example.com' }
    }

    // 3. 使用LangGraph聊天机器人处理消息
    const conversationId = ctx?.organizationId || 'default-conversation'
    const userRole = context?.userRole || (isDemoMode ? 'teacher' : 'student')
    const userId = user?.id || 'demo-user'

    console.log('🤖 使用LangGraph处理聊天:', {
      requestId,
      conversationId,
      userRole,
      messageLength: message.length,
      historyLength: context?.conversationHistory?.length || 0,
      streamMode: enableStream
    })

    // 4. 如果启用流式模式，使用流式响应
    if (enableStream) {
      return handleStreamResponse(requestId, message, conversationId, userRole, userId, context, startTime, isDemoMode)
    }

    // 5. 否则使用普通JSON响应
    const result = await chatbot.processMessage(
      message,
      conversationId,
      userRole,
      userId,
      context?.conversationHistory || []
    )

    const processingTime = Date.now() - startTime
    console.log('✅ LangGraph处理完成:', {
      requestId,
      processingTime,
      success: result.success,
      intent: result.data?.metadata?.intent
    })

    // 6. 返回JSON响应
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          mode: isDemoMode ? 'demo' : 'production',
          processingTime
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CHATBOT_ERROR',
          message: result.error?.message || '聊天处理失败',
          details: result.error
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTime
        }
      }, { status: 500 })
    }

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error('🚨 Chat API Error:', {
      requestId,
      error: error.message,
      stack: error.stack,
      processingTime
    })

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '处理请求时发生错误',
        details: error
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime
      }
    }, { status: 500 })
  }
}

/**
 * 获取对话状态
 */
export async function GET(request: NextRequest): Promise<NextResponse<StandardApiResponse<any>>> {
  const requestId = crypto.randomUUID()

  try {
    const url = new URL(request.url)
    const conversationId = url.searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: '缺少conversationId参数'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId
        }
      }, { status: 400 })
    }

    const state = await chatbot.getConversationState(conversationId)

    return NextResponse.json({
      success: true,
      data: state,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error('Get conversation state error:', error)

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '获取对话状态失败'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }, { status: 500 })
  }
}

/**
 * 重置对话
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<StandardApiResponse<any>>> {
  const requestId = crypto.randomUUID()

  try {
    const url = new URL(request.url)
    const conversationId = url.searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: '缺少conversationId参数'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId
        }
      }, { status: 400 })
    }

    await chatbot.resetConversation(conversationId)

    return NextResponse.json({
      success: true,
      data: { message: '对话已重置' },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error('Reset conversation error:', error)

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '重置对话失败'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }, { status: 500 })
  }
}

/**
 * 处理流式响应 - 结合LangGraph + 字符级输出
 */
async function handleStreamResponse(
  requestId: string,
  message: string,
  conversationId: string,
  userRole: 'teacher' | 'student' | 'self_learner',
  userId: string,
  context: any,
  startTime: number,
  isDemoMode: boolean
): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        console.log('🌊 开始流式LangGraph处理:', {
          requestId,
          conversationId,
          userRole,
          messageLength: message.length
        })

        // 发送开始信号
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'start',
          requestId,
          timestamp: new Date().toISOString()
        })}\n\n`))

        // 发送进度更新 - 分析阶段
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 10,
          message: '🤖 正在分析您的需求...',
          timestamp: new Date().toISOString()
        })}\n\n`))

        // 发送进度更新 - 意图识别
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 30,
          message: '🧠 正在识别意图...',
          timestamp: new Date().toISOString()
        })}\n\n`))

        // 使用LangGraph处理消息
        console.log('🔄 开始LangGraph处理流程...')
        const result = await chatbot.processMessage(
          message,
          conversationId,
          userRole,
          userId,
          context?.conversationHistory || []
        )

        if (!result.success) {
          throw new Error(result.error?.message || 'LangGraph处理失败')
        }

        // 发送进度更新 - 生成响应
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 70,
          message: '✨ 正在生成智能回复...',
          timestamp: new Date().toISOString()
        })}\n\n`))

        // 等待一下让用户看到"生成回复"
        await new Promise(resolve => setTimeout(resolve, 500))

        // 发送进度更新 - 字符级输出
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress: 90,
          message: '📝 正在打字输出...',
          timestamp: new Date().toISOString()
        })}\n\n`))

        // 等待一下让用户看到"打字输出"
        await new Promise(resolve => setTimeout(resolve, 300))

        // 字符级流式输出AI响应
        const aiResponse = result.data?.message || '抱歉，我现在无法处理您的请求。'
        const characters = aiResponse.split('')
        let currentText = ''

        for (let i = 0; i < characters.length; i++) {
          currentText += characters[i]

          // 每2个字符发送一次更新
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

        // 发送完整的AI响应和metadata
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          data: result.data,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            mode: isDemoMode ? 'demo' : 'production',
            processingTime: Date.now() - startTime
          }
        })}\n\n`))

        console.log('✅ 流式LangGraph处理完成:', {
          requestId,
          totalProcessingTime: Date.now() - startTime,
          intent: result.data?.metadata?.intent
        })

      } catch (error: any) {
        console.error('🚨 流式处理失败:', error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error.message || 'LangGraph流式处理失败',
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
}
