import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChatRequest, StandardApiResponse, ChatResponseData } from '@/lib/types/api'
import { courseEditingTools } from '@/lib/ai/editing-tool-definitions'
import { generateObject, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

export const runtime = 'edge'

// 初始化OpenAI客户端 - 使用Vercel AI Gateway
const gatewayKey = process.env.VERCEL_GATEWAY_KEY
if (!gatewayKey) {
  throw new Error('AI Gateway not configured (VERCEL_GATEWAY_KEY missing)')
}

const openai = createOpenAI({
  apiKey: gatewayKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
})

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
 * 统一AI对话API端点
 * 支持多轮对话、上下文管理、工具调用和个性化响应
 */
export async function POST(request: NextRequest): Promise<NextResponse<StandardApiResponse<ChatResponseData>>> {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  let user: any = null
  let organizationId: string | undefined
  let message: string = ''
  let context: any = null

  try {
    // 1. 验证用户身份和权限
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

    const { message: msg, context: ctx, tools } = validation.data
    message = msg
    context = ctx

    // 3. 获取用户组织信息和角色验证
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

      userRole = orgMember.role === 'owner' || orgMember.role === 'teacher' ? 'teacher' : 'student'
      organizationId = context.organizationId
    } else {
      // 获取用户的默认组织角色
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (orgMember) {
        userRole = orgMember.role === 'owner' || orgMember.role === 'teacher' ? 'teacher' : 'student'
        organizationId = orgMember.organization_id
      }
    }

    // 4. 构建对话上下文
    const messages = [
      {
        role: 'system' as const,
        content: `你是一个专业的AI学习助手，角色为${userRole}。你能够帮助用户：
        - 回答课程相关问题
        - 提供学习建议和指导
        - 管理讨论和通知
        - 个性化设置建议
        - 课程内容编辑（仅教师）

        请根据用户角色提供适当的响应：${userRole === 'teacher' ? '你可以访问所有管理功能' : '你专注于学习支持和指导'}。`
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
      ? tools.filter(tool => tool in courseEditingTools)
      : Object.keys(courseEditingTools)

    // 6. 生成AI响应
    const result = await streamText({
      model: openai.chat('meituan/longcat-flash-chat'),
      messages,
      tools: availableTools.reduce((acc, toolName) => {
        acc[toolName] = courseEditingTools[toolName as keyof typeof courseEditingTools]
        return acc
      }, {} as any),
      maxOutputTokens: 2000,
      temperature: 0.7,
      system: `作为${userRole}角色的AI助手，请提供专业、准确的回答。`
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
        model: 'meituan/longcat-flash-chat'
      }
    }

    // 8. 记录使用日志
    await logAIUsage({
      userId: user.id,
      organizationId,
      requestId,
      action: 'chat',
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
    console.error(`AI Chat Error [${requestId}]:`, error)

    // 记录错误日志
    await logAIUsage({
      userId: user?.id,
      organizationId,
      requestId,
      action: 'chat',
      input: { message, context },
      output: null,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    })

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'AI服务处理失败',
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
 * 记录AI使用日志
 */
async function logAIUsage({
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
        action,
        input_data: input,
        output_data: output,
        processing_time_ms: processingTimeMs,
        error_message: error,
        created_at: new Date().toISOString()
      })
  } catch (logError) {
    console.error('Failed to log AI usage:', logError)
  }
}

/**
 * GET - 获取聊天历史记录
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 获取用户的聊天历史记录
    const { data: history, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
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
    console.error(`Get Chat History Error [${requestId}]:`, error)

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