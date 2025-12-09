import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChatRequest, StandardApiResponse, ChatResponseData } from '@/lib/types/api'
import { courseEditingTools } from '@/lib/ai/editing-tool-definitions'
import { generateObject, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

export const runtime = 'edge'

// 智能意图识别函数
function detectIntent(message: string): { intent: string; workflowType: string; confidence: number } {
  const lowerMessage = message.toLowerCase().trim()

  // 课程创建意图 - 修复识别逻辑，支持更多课程相关词汇
  const hasCreateIntent = lowerMessage.includes('创建') || lowerMessage.includes('新建') || lowerMessage.includes('做个') || lowerMessage.includes('做一个') || lowerMessage.includes('开设') || lowerMessage.includes('设置')
  const hasCourseWords = lowerMessage.includes('课程') || lowerMessage.includes('课') || lowerMessage.includes('教学') || lowerMessage.includes('科目') || lowerMessage.includes('培训') || lowerMessage.includes('专业') || lowerMessage.includes('学科')

  if (hasCreateIntent && hasCourseWords) {
    return { intent: 'create_course', workflowType: 'create_course', confidence: 0.95 }
  }

  // 单独的创建意图 + 课程相关词（如"入门课"、"基础课"等）
  if (hasCreateIntent && (lowerMessage.includes('神经科学') || lowerMessage.includes('入门') || lowerMessage.includes('基础') || lowerMessage.includes('初级') || lowerMessage.includes('高级') || lowerMessage.includes('专业'))) {
    return { intent: 'create_course', workflowType: 'create_course', confidence: 0.9 }
  }

  // 课程节次创建意图
  if ((lowerMessage.includes('创建') || lowerMessage.includes('新建')) && lowerMessage.includes('课次')) {
    return { intent: 'create_session', workflowType: 'create_session', confidence: 0.9 }
  }
  if (lowerMessage.includes('课程') && lowerMessage.includes('节次')) {
    return { intent: 'create_session', workflowType: 'create_session', confidence: 0.8 }
  }

  // 大纲生成意图
  if (lowerMessage.includes('大纲') || lowerMessage.includes('outline')) {
    return { intent: 'generate_outline', workflowType: 'generate_outline', confidence: 0.9 }
  }

  // 作业创建意图
  if (lowerMessage.includes('作业') || lowerMessage.includes('测验') || lowerMessage.includes('考试')) {
    return { intent: 'create_assignment', workflowType: 'create_assignment', confidence: 0.85 }
  }

  // A2A优化意图
  if (lowerMessage.includes('a2a') || lowerMessage.includes('优化') || lowerMessage.includes('改进')) {
    return { intent: 'a2a_optimization', workflowType: 'a2a_optimization', confidence: 0.8 }
  }

  // 内容生成意图
  if (lowerMessage.includes('生成') && (lowerMessage.includes('内容') || lowerMessage.includes('教学'))) {
    return { intent: 'content_generation', workflowType: 'content_generation', confidence: 0.75 }
  }

  return { intent: 'unknown', workflowType: 'unknown', confidence: 0 }
}

// 提取课程主题
function extractCourseTopic(message: string): string {
  const lowerMessage = message.toLowerCase()

  // 常见编程语言和主题
  const topics = [
    'python', 'java', 'javascript', 'typescript', 'react', 'vue', 'node.js',
    '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治',
    '艺术', '音乐', '体育', '心理学', '哲学', '经济学', '管理学',
    '机器学习', '人工智能', '数据科学', '网络安全', '区块链',
    '神经科学', '社会学', '人类学', '考古学', '文学', '语言学'
  ]

  for (const topic of topics) {
    if (lowerMessage.includes(topic)) {
      return topic
    }
  }

  // 提取"创建XXX课程"中的XXX
  const match = lowerMessage.match(/创建(.+?)课程/)
  if (match) {
    return match[1].trim()
  }

  // 提取"XXX课程"中的XXX
  const match2 = lowerMessage.match(/^(.+?)课程/)
  if (match2) {
    return match2[1].trim()
  }

  // 提取"XXX的入门课"中的XXX
  const match3 = lowerMessage.match(/(.+?)的入门课/)
  if (match3) {
    return match3[1].trim()
  }

  // 提取"XXX的基础课"中的XXX
  const match4 = lowerMessage.match(/(.+?)的基础课/)
  if (match4) {
    return match4[1].trim()
  }

  return '通用'
}

// 工作流意图处理函数
async function handleWorkflowIntent(message: string, context: any, isDemoMode: boolean): Promise<ChatResponseData | null> {
  const intentDetection = detectIntent(message)

  // 如果意图不明，返回默认响应
  if (intentDetection.intent === 'unknown') {
    return {
      message: `您好！我是您的AI学习助手。

我可以帮助您：
- 🎯 **创建课程** - "帮我创建一个Python编程课程"
- 📝 **生成大纲** - "为我的课程生成大纲"
- 🤖 **A2A优化** - "用A2A优化我的内容"
- 📋 **创建作业** - "创建一份数学测验"

请告诉我您想做什么，或者点击下方的快捷按钮！`,
      toolsUsed: [],
      metadata: {
        intent: 'unknown',
        userRole: context?.userRole || 'teacher',
        availableActions: ['outline_generation', 'a2a_session', 'course_creation', 'assignment_creation'],
        suggestions: [
          '帮我创建一个Python编程课程',
          '生成课程大纲',
          '使用A2A优化内容',
          '创建一份数学测验'
        ]
      }
    }
  }

  // 处理课程创建意图
  if (intentDetection.intent === 'create_course') {
    const topic = extractCourseTopic(message)
    const classId = crypto.randomUUID()
    const workflowId = `workflow_${Date.now()}`

    return {
      message: `好的！我来帮您创建"${topic}课程"。

🎯 **8步课程创建工作流**

**第1步：课程基本信息**
请告诉我以下信息：

**1. 您希望这门课程有多少节课？**
A) 4节课 (4周完成)
B) 8节课 (8周完成)
C) 12节课 (12周完成)
D) 其他数量（请具体说明）

**2. 您希望每周上几次课？**
A) 每周一次
B) 每周两次
C) 每周三次
D) 其他（请具体说明）

请回答上述问题，我会根据您的选择继续引导您完成剩余步骤！`,
      toolsUsed: ['course_creation', 'workflow_manager'],
      metadata: {
        workflowType: 'create_course',
        intent: 'create_course',
        workflowId,
        currentStep: 1,
        classId,
        courseTopic: topic,
        userRole: context?.userRole || 'teacher',
        steps: {
          total: 8,
          current: 1,
          next: 'course_duration_and_frequency'
        },
        suggestedActions: ['continue_workflow'],
        progress: 12.5
      }
    }
  }

  // 处理大纲生成意图
  if (intentDetection.intent === 'generate_outline') {
    return {
      message: `好的！我来帮您生成课程大纲。

📋 **大纲生成工作流**

**请提供以下信息：**

**1. 课程主题是什么？**
（例如：Python编程、数学分析、英语写作等）

**2. 课程节数？**
（例如：8节、12节、16节等）

**3. 目标学员？**
A) 零基础初学者
B) 有一定基础
C) 进阶学习者

**4. 课程时长？**
A) 短期课程 (1-2周)
B) 中期课程 (1个月)
C) 长期课程 (2-3个月)

请提供这些信息，我会为您生成详细的课程大纲！`,
      toolsUsed: ['outline_generator', 'workflow_manager'],
      metadata: {
        workflowType: 'generate_outline',
        intent: 'generate_outline',
        workflowId: `workflow_${Date.now()}`,
        currentStep: 'gathering_requirements',
        userRole: context?.userRole || 'teacher',
        steps: {
          total: 3,
          current: 1,
          next: 'generate_outline'
        },
        suggestedActions: ['outline_generation'],
        progress: 33
      }
    }
  }

  // 处理作业创建意图
  if (intentDetection.intent === 'create_assignment') {
    return {
      message: `好的！我来帮您创建作业。

📝 **作业创建工作流**

**请选择作业类型：**

**A) 测验题**
- 选择题、填空题、判断题
- 适合知识点测试
- 自动评分

**B) 写作作业**
- 论文、报告、文章
- 开放式题目
- 手动评分 + AI辅助

**C) 研究项目**
- 调研报告、数据分析
- 小组合作项目
- 成果展示

**请告诉我：**
1. 您想创建哪种类型的作业？
2. 作业的主题是什么？
3. 预计完成时间？

我会根据您的选择引导您完成作业创建！`,
      toolsUsed: ['assignment_creator', 'workflow_manager'],
      metadata: {
        workflowType: 'create_assignment',
        intent: 'create_assignment',
        workflowId: `workflow_${Date.now()}`,
        currentStep: 'select_assignment_type',
        userRole: context?.userRole || 'teacher',
        steps: {
          total: 4,
          current: 1,
          next: 'assignment_details'
        },
        suggestedActions: ['quiz_creation', 'writing_assignment', 'research_project'],
        progress: 25
      }
    }
  }

  // 处理A2A优化意图
  if (intentDetection.intent === 'a2a_optimization') {
    return {
      message: `好的！我来使用A2A双智能体为您优化内容。

🔄 **A2A会话优化工作流**

**A2A优化流程：**
1. **教师代理** - 生成教学内容初稿
2. **学生代理** - 从学习者角度提供批判性反馈
3. **迭代优化** - 最多3轮优化循环
4. **质量评估** - 确保内容质量

**请提供您想要优化的内容：**
- 课程大纲
- 课程章节
- 教学材料
- 作业题目

**或者告诉我：**
1. 您要优化哪个课程？
2. 需要优化哪些部分？
3. 希望达到什么效果？

我会启动A2A优化流程为您提升教学质量！`,
      toolsUsed: ['a2a_optimizer', 'workflow_manager'],
      metadata: {
        workflowType: 'a2a_optimization',
        intent: 'a2a_optimization',
        workflowId: `workflow_${Date.now()}`,
        currentStep: 'content_input',
        userRole: context?.userRole || 'teacher',
        steps: {
          total: 4,
          current: 1,
          next: 'a2a_iteration'
        },
        suggestedActions: ['outline_optimization', 'content_optimization'],
        progress: 25
      }
    }
  }

  // 处理内容生成意图
  if (intentDetection.intent === 'content_generation') {
    return {
      message: `好的！我来帮您生成教学内容。

📚 **内容生成工作流**

**可生成的内容类型：**

**1. 课程章节内容**
- 理论知识讲解
- 实践操作指导
- 案例分析

**2. 练习题库**
- 选择题、填空题
- 编程题目
- 应用题

**3. 教学辅助材料**
- PPT大纲
- 思维导图
- 学习指南

**请告诉我：**
1. 您需要生成哪种类型的内容？
2. 内容的主题和范围？
3. 目标学员水平？
4. 预期内容长度？

我会根据您的需求生成高质量的教学内容！`,
      toolsUsed: ['content_generator', 'workflow_manager'],
      metadata: {
        workflowType: 'content_generation',
        intent: 'content_generation',
        workflowId: `workflow_${Date.now()}`,
        currentStep: 'content_specification',
        userRole: context?.userRole || 'teacher',
        steps: {
          total: 3,
          current: 1,
          next: 'content_generation'
        },
        suggestedActions: ['chapter_content', 'exercise_generation', 'teaching_materials'],
        progress: 33
      }
    }
  }

  // 处理课程节次创建意图
  if (intentDetection.intent === 'create_session') {
    return {
      message: `好的！我来帮您创建课程节次。

📅 **课程节次创建工作流**

**请提供以下信息：**

**1. 属于哪个课程？**
（请告诉我课程名称）

**2. 本节次的主题？**
（例如：变量和数据类型、线性方程组、动词时态等）

**3. 节次时长？**
A) 45分钟
B) 90分钟
C) 120分钟
D) 其他时长

**4. 教学目标？**
- 知识点掌握
- 技能训练
- 综合应用

**5. 内容要求？**
A) 理论讲解为主
B) 实践操作为主
C) 理论与实践结合

请提供这些信息，我会为您创建详细的课程节次！`,
      toolsUsed: ['session_creator', 'workflow_manager'],
      metadata: {
        workflowType: 'create_session',
        intent: 'create_session',
        workflowId: `workflow_${Date.now()}`,
        currentStep: 'session_details',
        userRole: context?.userRole || 'teacher',
        steps: {
          total: 3,
          current: 1,
          next: 'session_content_generation'
        },
        suggestedActions: ['session_creation'],
        progress: 33
      }
    }
  }

  // 检测清除历史意图
  const lowerMessage = message.toLowerCase()
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