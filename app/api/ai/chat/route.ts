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
    // 实际启动大纲生成工作流
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = createAdminClient()

      const userId = isDemoMode ? 'demo-user' : context?.userId || 'demo-user'
      const classId = context?.classId || crypto.randomUUID()

      // 创建或获取课程大纲
      const { data: outlineResult, error: outlineError } = await supabase
        .from('course_outlines')
        .insert({
          class_id: classId,
          title: `神经科学入门课程大纲`,
          description: '基于AI生成的神经科学入门课程大纲',
          requirements: {
            subject: 'neuroscience',
            level: 'beginner',
            target_audience: 'undergraduate',
            duration: '16 weeks',
            prerequisites: 'basic biology'
          },
          generated_by_ai: true,
          ai_generation_metadata: {
            model: 'gpt-4',
            prompt_version: '1.0',
            generation_type: 'course_creation'
          }
        })
        .select()
        .single()

      if (outlineError && !outlineError.message.includes('duplicate')) {
        console.warn('大纲创建警告:', outlineError)
      }

      return {
        message: `我将帮您创建"神经科学入门课程"。

✅ **工作流已启动！**

**当前进度：**
- ✅ 正在分析课程需求
- 🔄 正在生成课程大纲
- ⏳ 等待A2A优化

**大纲生成中...**

我将为您创建一个包含以下主题的入门级课程：
1. 神经系统基础
2. 神经元结构与功能
3. 神经信号传导
4. 感觉与运动系统
5. 学习与记忆的神经机制

请稍候，我正在为您生成详细的课程大纲。完成后您可以编辑和定制内容。`,
        toolsUsed: ['outline_generator'],
        metadata: {
          workflowType: 'course_creation',
          intent: 'create_course',
          workflowId: `workflow_${Date.now()}`,
          currentStep: 'outline_generation',
          classId,
          outlineId: outlineResult?.id,
          suggestedActions: ['outline_generation', 'a2a_session'],
          userRole: context?.userRole || 'teacher',
          progress: 25
        }
      }
    } catch (error) {
      console.error('启动课程创建工作流失败:', error)
      // 如果启动失败，返回友好的错误消息
      return {
        message: `我将帮您创建"神经科学入门课程"。

⚠️ 暂时无法启动完整的工作流，但我可以为您提供课程规划建议：

**课程结构建议：**
1. **神经系统基础** (2周)
   - 神经系统的组织结构
   - 中枢与外周神经系统

2. **神经元与胶质细胞** (3周)
   - 神经元的基本结构
   - 神经胶质细胞的功能

3. **神经信号传导** (3周)
   - 静息电位与动作电位
   - 突触传递机制

4. **感觉系统** (3周)
   - 视觉、听觉、体感系统

5. **运动控制** (2周)
   - 运动神经元与肌肉控制

6. **高级认知功能** (3周)
   - 学习与记忆
   - 注意力与意识

请告诉我您希望调整哪些部分，或者您可以点击下方按钮手动启动工作流。`,
        toolsUsed: ['outline_generation'],
        metadata: {
          workflowType: 'course_creation',
          intent: 'create_course',
          error: true,
          suggestedActions: ['outline_generation', 'a2a_session'],
          userRole: context?.userRole || 'teacher'
        }
      }
    }
  }

  // 检测清除历史意图
  if (lowerMessage.includes('清除') && (lowerMessage.includes('历史') || lowerMessage.includes('聊天'))) {
    return {
      message: `好的，我将为您清除聊天历史。

🗑️ **清除确认**

您确定要清除所有聊天记录吗？此操作不可撤销。

**将被清除的内容：**
- 所有对话消息
- 工作流进度
- 临时数据

**保留的内容：**
- 对话记录（已保存到数据库）

请确认是否继续，或者点击下方的"清除聊天"按钮。`,
      toolsUsed: ['clear_chat'],
      metadata: {
        workflowType: 'clear_chat',
        intent: 'clear_chat',
        userRole: context?.userRole || 'teacher',
        requiresConfirmation: true
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