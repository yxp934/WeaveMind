import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChatRequest, StandardApiResponse, ChatResponseData } from '@/lib/types/api'
import { courseEditingTools } from '@/lib/ai/editing-tool-definitions'
import { generateObject, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

export const runtime = 'edge'

// 工作流意图处理函数
async function handleWorkflowIntent(message: string, context: any, isDemoMode: boolean): Promise<ChatResponseData | null> {
  const lowerMessage = message.toLowerCase()

  // 检测课程创建意图
  if (lowerMessage.includes('创建') && (lowerMessage.includes('课程') || lowerMessage.includes('神经科学'))) {
    return {
      message: `我将帮您创建"神经科学入门课程"。这将包含以下步骤：

1. **需求收集** - 我会了解您的具体需求
2. **大纲生成** - 基于AI生成课程大纲
3. **内容创建** - 使用A2A双智能体优化内容
4. **完善发布** - 完善课程并发布

让我们开始第一步：您希望这个课程面向什么受众？（例如：本科生、高中生、成人学习者）

点击下方按钮开始工作流，或告诉我您的具体需求。`,
      toolsUsed: ['outline_generation'],
      metadata: {
        workflowType: 'course_creation',
        intent: 'create_course',
        suggestedActions: ['outline_generation', 'a2a_session'],
        userRole: context?.userRole || 'teacher'
      }
    }
  }

  // 检测大纲生成意图
  if (lowerMessage.includes('大纲') || lowerMessage.includes('outline')) {
    return {
      message: `好的，我将为您生成课程大纲。

**当前工作流：** 大纲生成
**状态：** 准备开始

请在工作流工具面板中点击"大纲生成器"，我将帮助您：

1. 收集课程需求
2. 生成结构化大纲
3. 提供编辑建议

准备好开始了吗？`,
      toolsUsed: ['outline_generation'],
      metadata: {
        workflowType: 'outline_generation',
        intent: 'generate_outline',
        currentStep: 'ready_to_start',
        userRole: context?.userRole || 'teacher'
      }
    }
  }

  // 检测A2A优化意图
  if (lowerMessage.includes('a2a') || lowerMessage.includes('优化') || lowerMessage.includes('改进')) {
    return {
      message: `好的，我将使用A2A双智能体为您优化内容。

**当前工作流：** A2A会话优化
**状态：** 准备开始

A2A优化流程：
1. **教师代理** - 生成教学内容
2. **学生代理** - 提供批判性反馈
3. **迭代优化** - 最多3轮优化
4. **质量评估** - 确保内容质量

请在工作流工具面板中点击"A2A优化"开始。`,
      toolsUsed: ['a2a_session'],
      metadata: {
        workflowType: 'a2a_session',
        intent: 'optimize_content',
        suggestedIterations: 3,
        userRole: context?.userRole || 'teacher'
      }
    }
  }

  // 默认响应
  return null
}

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
  let isDemoMode = false

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

    const { message: msg, context: ctx, tools } = validation.data
    message = msg
    context = ctx

    // 2. 检查是否为演示模式（无需认证）
    const supabase = await createClient()
    const { data: { user: authenticatedUser } } = await supabase.auth.getUser()
    user = authenticatedUser

    // 如果没有用户但有上下文，或者明确设置为演示模式
    if (!user || (ctx?.userRole && !user)) {
      isDemoMode = true
      // 演示模式下使用默认值
      user = { id: 'demo-user', email: 'demo@example.com' }
      organizationId = ctx?.organizationId || 'demo-org-id'
    }

    // 3. 检查工作流意图并提供相应响应
    const userRole = context?.userRole || (isDemoMode ? 'teacher' : 'student')
    const workflowResponse = await handleWorkflowIntent(message, context, isDemoMode)

    if (workflowResponse) {
      return NextResponse.json({
        success: true,
        data: workflowResponse,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          mode: isDemoMode ? 'demo' : 'production'
        }
      })
    }

    // 提供默认的AI助手响应
    const defaultResponse = {
      message: `您好！我是您的AI学习助手。

我可以帮助您：
- 📚 **创建课程** - "帮我创建一个神经科学的入门课"
- 📝 **生成大纲** - "为我的课程生成大纲"
- 🤖 **A2A优化** - "用A2A优化我的内容"

请告诉我您想做什么，或者点击下方的快捷按钮！`,
      toolsUsed: [],
      metadata: {
        userRole,
        availableActions: ['outline_generation', 'a2a_session', 'course_creation'],
        suggestions: [
          '帮我创建一个神经科学的入门课',
          '生成课程大纲',
          '使用A2A优化内容'
        ]
      }
    }

    return NextResponse.json({
      success: true,
      data: defaultResponse,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        mode: isDemoMode ? 'demo' : 'production'
      }
    })

  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '处理请求时发生错误'
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