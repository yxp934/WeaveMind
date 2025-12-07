import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChatRequest, StandardApiResponse, ChatResponseData } from '@/lib/types/api'
import { teacherDashboardTools } from '@/lib/ai/teacher-dashboard-tools'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

export const runtime = 'edge'

// 初始化OpenAI客户端
const gatewayKey = process.env.VERCEL_GATEWAY_KEY
if (!gatewayKey) {
  throw new Error('AI Gateway not configured (VERCEL_GATEWAY_KEY missing)')
}

const openai = createOpenAI({
  apiKey: gatewayKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
})

// 教师助手请求验证模式
const teacherAssistantRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.object({
    classId: z.string().uuid().optional(),
    organizationId: z.string().uuid().optional(),
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
 * 教师助手AI对话API端点
 * 专为教师设计的智能助手，支持班级管理、学生监控和教学工具调用
 */
export async function POST(request: NextRequest): Promise<NextResponse<StandardApiResponse<ChatResponseData>>> {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  let user: any = null
  let organizationId: string | undefined
  let message: string = ''
  let context: any = null

  try {
    // 1. 验证用户身份
    const supabase = await createClient()
    const { data: { user: authenticatedUser } } = await supabase.auth.getUser()
    user = authenticatedUser

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

    // 2. 解析和验证请求数据
    const body = await request.json()
    const validation = teacherAssistantRequestSchema.safeParse(body)

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

    const { message: msg, context: ctx, tools } = validation.data
    message = msg
    context = ctx

    // 3. 验证教师角色权限
    let userRole = 'student'

    if (context?.organizationId) {
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', context.organizationId)
        .eq('user_id', user.id)
        .single()

      if (!orgMember) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '用户无权访问该组织'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId
          }
        }, { status: 403 })
      }

      if (orgMember.role !== 'teacher' && orgMember.role !== 'owner') {
        return NextResponse.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '只有教师和组织所有者可以使用教师助手'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId
          }
        }, { status: 403 })
      }

      userRole = orgMember.role
      organizationId = context.organizationId
    } else {
      // 获取用户的默认组织角色
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .in('role', ['teacher', 'owner'])
        .limit(1)
        .single()

      if (!orgMember) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '只有教师和组织所有者可以使用教师助手'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId
          }
        }, { status: 403 })
      }

      userRole = orgMember.role
      organizationId = orgMember.organization_id
    }

    // 4. 构建对话上下文和系统提示
    const messages = [
      {
        role: 'system' as const,
        content: `你是一位Weaver AI，智能教师助手，使用WeaveMind LMS。

你可以帮助教师：
- 查看班级进度和学生状态
- 查看即将到来的课程和截止日期
- 创建新班级、课程和作业
- 回答关于教学数据的问题

始终保持有用、简洁，并主动建议下一步行动。
提供数据时，请以清晰易读的格式呈现。
创建项目时，确认操作并提供相关详细信息。

用户角色：${userRole === 'owner' ? '组织所有者' : '教师'}
你可以访问所有管理功能。`
      },
      ...(context?.conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // 5. 选择可用的工具
    const availableTools = tools && tools.length > 0
      ? tools.filter(tool => tool in teacherDashboardTools)
      : Object.keys(teacherDashboardTools)

    // 6. 生成AI响应
    const result = await streamText({
      model: openai.chat('meituan/longcat-flash-chat'),
      messages,
      tools: availableTools.reduce((acc, toolName) => {
        acc[toolName] = teacherDashboardTools[toolName as keyof typeof teacherDashboardTools]
        return acc
      }, {} as any),
      maxOutputTokens: 2000,
      temperature: 0.7,
      system: `作为专业的教师助手，请提供准确、有用的教学管理建议和帮助。`
    })

    // 7. 构建响应数据
    const responseData: ChatResponseData = {
      message: await result.text,
      toolsUsed: (await result.toolCalls)?.map(call => call.toolName) || [],
      metadata: {
        userRole,
        organizationId,
        processingTimeMs: Date.now() - startTime,
        tokensUsed: (await result.usage)?.totalTokens || 0,
        model: 'meituan/longcat-flash-chat',
        assistantType: 'teacher'
      }
    }

    // 8. 记录使用日志
    await logTeacherAssistantUsage({
      userId: user.id,
      organizationId,
      requestId,
      action: 'teacher_assistant',
      input: { message, context },
      output: responseData,
      processingTimeMs: Date.now() - startTime
    })

    // 9. 返回成功响应
    return NextResponse.json({
      success: true,
      data: responseData,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error(`教师助手AI错误 [${requestId}]:`, error)

    // 记录错误日志
    await logTeacherAssistantUsage({
      userId: user?.id,
      organizationId,
      requestId,
      action: 'teacher_assistant',
      input: { message, context },
      output: null,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    })

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '教师助手服务处理失败',
        details: error.message
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }, { status: 500 })
  }
}

/**
 * 记录教师助手使用日志
 */
async function logTeacherAssistantUsage({
  userId,
  organizationId,
  requestId,
  action,
  input,
  output,
  processingTimeMs,
  error
}: {
  userId?: string
  organizationId?: string
  requestId: string
  action: string
  input: any
  output: any
  processingTimeMs: number
  error?: string
}) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        request_id: requestId,
        action: action || 'teacher_assistant',
        input_data: input,
        output_data: output,
        processing_time_ms: processingTimeMs,
        error_message: error,
        created_at: new Date().toISOString()
      })
  } catch (logError) {
    console.error('记录教师助手使用日志失败:', logError)
  }
}

/**
 * GET - 获取教师助手聊天历史记录
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

    // 验证教师角色
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['teacher', 'owner'])
      .limit(1)
      .single()

    if (!orgMember) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只有教师和组织所有者可以使用教师助手'
        }
      }, { status: 403 })
    }

    const searchParams = new URLSearchParams(request.url.split('?')[1] || '')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 获取教师的聊天历史记录
    const { data: history, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('conversation_type', 'teacher_assistant')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: history || [],
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error(`获取教师助手聊天历史错误 [${requestId}]:`, error)

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取聊天历史失败',
        details: error.message
      }
    }, { status: 500 })
  }
}
