import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 路径参数验证Schema
const conversationIdSchema = z.object({
  id: z.string().uuid()
})

// 响应类型
interface GetConversationResponse {
  success: boolean
  data?: {
    id: string
    title: string | null
    context: any
    message_count: number
    total_tokens_used: number
    is_active: boolean
    last_message_at: string
    created_at: string
    updated_at: string
  }
  error?: {
    code: string
    message: string
  }
  metadata?: {
    timestamp: string
    requestId: string
  }
}

/**
 * GET - 获取特定对话的详细信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<GetConversationResponse>> {
  const requestId = crypto.randomUUID()

  try {
    // 验证路径参数
    const pathValidation = conversationIdSchema.safeParse({ id: params.id })
    if (!pathValidation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的对话ID格式'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId
        }
      }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '用户未认证'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId
        }
      }, { status: 401 })
    }

    // 获取对话信息
    const { data: conversation, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '对话不存在或无权访问'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId
          }
        }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: conversation,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error('Get Conversation Error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '获取对话信息时发生错误'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }, { status: 500 })
  }
}

/**
 * PUT - 更新对话信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID()

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '用户未认证'
        }
      }, { status: 401 })
    }

    const body = await request.json()
    const { title, context, is_active } = body

    // 验证路径参数
    const pathValidation = conversationIdSchema.safeParse({ id: params.id })
    if (!pathValidation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的对话ID格式'
        }
      }, { status: 400 })
    }

    // 构建更新数据
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (context !== undefined) updateData.context = context
    if (is_active !== undefined) updateData.is_active = is_active

    // 更新对话
    const { data: updatedConversation, error } = await supabase
      .from('ai_conversations')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '对话不存在或无权访问'
          }
        }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: updatedConversation,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error('Update Conversation Error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '更新对话时发生错误'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }, { status: 500 })
  }
}

/**
 * DELETE - 删除对话（软删除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID()

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '用户未认证'
        }
      }, { status: 401 })
    }

    // 验证路径参数
    const pathValidation = conversationIdSchema.safeParse({ id: params.id })
    if (!pathValidation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的对话ID格式'
        }
      }, { status: 400 })
    }

    // 软删除对话（设置为非活跃状态）
    const { error } = await supabase
      .from('ai_conversations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '对话不存在或无权访问'
          }
        }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        message: '对话已删除'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error('Delete Conversation Error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '删除对话时发生错误'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }, { status: 500 })
  }
}