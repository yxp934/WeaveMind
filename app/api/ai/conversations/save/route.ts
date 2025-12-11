import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 请求数据验证Schema
const saveConversationSchema = z.object({
  conversationId: z.string().optional().nullable(),
  title: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.string(),
    metadata: z.any().optional(),
    toolsUsed: z.array(z.string()).optional()
  })),
  context: z.object({
    userRole: z.string().optional(),
    organizationId: z.string().optional(),
    courseId: z.string().optional(),
    classId: z.string().optional()
  }).optional()
})

// 响应类型
interface SaveConversationResponse {
  success: boolean
  data?: {
    conversationId: string
    messageCount: number
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
 * POST - 保存AI对话
 * 保存聊天消息到ai_conversations表
 */
export async function POST(request: NextRequest): Promise<NextResponse<SaveConversationResponse>> {
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
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId
        }
      }, { status: 401 })
    }

    // 解析和验证请求数据
    const body = await request.json()
    const validation = saveConversationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          details: validation.error.format()
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId
        }
      }, { status: 400 })
    }

    const { conversationId, title, messages, context } = validation.data

    // 确定organization_id（使用用户默认组织或context中的组织）
    let organizationId = context?.organizationId
    if (!organizationId) {
      const { data: orgMembership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (orgMembership) {
        organizationId = orgMembership.organization_id
      }
    }

    // 临时支持无组织用户的演示模式
    if (!organizationId) {
      // 为没有组织的用户创建一个临时演示对话记录
      organizationId = 'demo-organization-' + user.id
    }

    let conversationRecordId = conversationId

    // 如果没有conversationId，创建新的对话记录
    if (!conversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          title: title || `AI对话 - ${new Date().toLocaleString('zh-CN')}`,
          context: context || {},
          message_count: messages.length,
          is_active: true
        })
        .select('id')
        .single()

      if (createError) {
        throw createError
      }

      conversationRecordId = newConversation.id
    } else {
      // 更新现有对话
      const { error: updateError } = await supabase
        .from('ai_conversations')
        .update({
          title: title || undefined,
          context: context || undefined,
          message_count: messages.length,
          last_message_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', conversationId)

      if (updateError) {
        throw updateError
      }
    }

    // 保存消息（这里可以扩展为单独的消息表）
    // 目前先更新对话记录的消息数量
    const { data: updatedConversation, error: saveError } = await supabase
      .from('ai_conversations')
      .update({
        message_count: messages.length,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationRecordId)
      .select('id, message_count')
      .single()

    if (saveError) {
      throw saveError
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversationRecordId!,
        messageCount: updatedConversation.message_count
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error('Save Conversation Error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '保存对话时发生错误'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }, { status: 500 })
  }
}

/**
 * GET - 获取用户的AI对话列表
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 获取用户的对话列表
    const { data: conversations, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: conversations || [],
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error('Get Conversations Error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '获取对话列表时发生错误'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }, { status: 500 })
  }
}