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
  tools: z.array(z.string()).optional()
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
      historyLength: context?.conversationHistory?.length || 0
    })

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

    // 4. 返回响应
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
