import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DiscussionAssistantRequest, StandardApiResponse, DiscussionAssistantResponseData } from '@/lib/types/api'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

// 初始化OpenAI客户端
const openai = createOpenAI({
  apiKey: process.env.VERCEL_GAI_API_KEY,
})

// 讨论助手请求验证模式
const discussionRequestSchema = z.object({
  action: z.enum(['suggest_topics', 'analyze_engagement', 'suggest_replies', 'moderate_discussion']),
  courseId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  context: z.object({
    userRole: z.enum(['teacher', 'student', 'self_learner']),
    organizationId: z.string().uuid()
  }),
  parameters: z.record(z.string(), z.any()).optional()
})

/**
 * 讨论管理助手API端点
 * 提供AI驱动的讨论管理功能，包括主题建议、参与度分析和回复推荐
 */
export async function POST(request: NextRequest): Promise<NextResponse<StandardApiResponse<DiscussionAssistantResponseData>>> {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  let user: any = null
  let action: string = ''
  let context: any = null
  let courseId: string | undefined
  let classId: string | undefined
  let threadId: string | undefined
  let parameters: any = null

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
    const validation = discussionRequestSchema.safeParse(body)

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

    const validatedData = validation.data
    action = validatedData.action
    courseId = validatedData.courseId
    classId = validatedData.classId
    threadId = validatedData.threadId
    context = validatedData.context
    parameters = validatedData.parameters

    // 3. 验证用户权限
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

    // 4. 根据操作类型执行相应逻辑
    let responseData: DiscussionAssistantResponseData

    switch (action) {
      case 'suggest_topics':
        responseData = await suggestDiscussionTopics({
          supabase,
          user,
          courseId,
          classId,
          context,
          parameters
        })
        break

      case 'analyze_engagement':
        responseData = await analyzeDiscussionEngagement({
          supabase,
          user,
          threadId,
          courseId,
          classId,
          context,
          parameters
        })
        break

      case 'suggest_replies':
        responseData = await suggestReplies({
          supabase,
          user,
          threadId,
          context,
          parameters
        })
        break

      case 'moderate_discussion':
        responseData = await moderateDiscussion({
          supabase,
          user,
          threadId,
          context,
          parameters
        })
        break

      default:
        throw new Error(`不支持的操作类型: ${action}`)
    }

    // 5. 记录使用日志
    await logAIUsage({
      userId: user.id,
      organizationId: context.organizationId,
      requestId,
      action: `discussion_${action}`,
      input: { action, courseId, classId, threadId, context, parameters },
      output: responseData,
      processingTimeMs: Date.now() - startTime
    })

    // 6. 返回成功响应
    return NextResponse.json({
      success: true,
      data: responseData,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    })

  } catch (error: any) {
    console.error(`Discussion Assistant Error [${requestId}]:`, error)

    // 记录错误日志
    await logAIUsage({
      userId: user?.id,
      organizationId: context?.organizationId,
      requestId,
      action: `discussion_${action}`,
      input: { action, courseId, classId, threadId, context, parameters },
      output: null,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    })

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '讨论助手服务处理失败',
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
 * 建议讨论主题
 */
async function suggestDiscussionTopics({
  supabase,
  user,
  courseId,
  classId,
  context,
  parameters
}: {
  supabase: any
  user: any
  courseId?: string
  classId?: string
  context: any
  parameters?: any
}): Promise<DiscussionAssistantResponseData> {
  let courseContent = ''
  let classInfo = null

  // 获取课程内容
  if (courseId) {
    const { data: course } = await supabase
      .from('courses')
      .select('title, description, chapters')
      .eq('id', courseId)
      .single()

    if (course) {
      courseContent = `课程: ${course.title}\n描述: ${course.description}\n章节数量: ${course.chapters?.length || 0}`
    }
  }

  // 获取班级信息
  if (classId) {
    const { data: classData } = await supabase
      .from('classes')
      .select('name, description, subject')
      .eq('id', classId)
      .single()

    classInfo = classData
  }

  const prompt = `作为${context.userRole}，请基于以下信息建议5-8个有意义的讨论主题：

课程信息: ${courseContent}
班级信息: ${classInfo ? `${classInfo.name} - ${classInfo.description}` : '未指定'}

要求:
- 主题应该促进深度思考和积极参与
- 适合${context.userRole === 'teacher' ? '教师引导' : '学生参与'}
- 考虑学习目标和认知发展
- 提供简要的主题描述和讨论方向

请以JSON格式返回，包含suggestions数组。`

  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: z.object({
      suggestions: z.array(z.object({
        title: z.string(),
        description: z.string(),
        discussion_points: z.array(z.string()),
        estimated_duration: z.string(),
        difficulty_level: z.enum(['easy', 'medium', 'hard'])
      }))
    }),
    prompt
  })

  return {
    suggestions: object.suggestions.map(s => s.title)
  }
}

/**
 * 分析讨论参与度
 */
async function analyzeDiscussionEngagement({
  supabase,
  user,
  threadId,
  courseId,
  classId,
  context,
  parameters
}: {
  supabase: any
  user: any
  threadId?: string
  courseId?: string
  classId?: string
  context: any
  parameters?: any
}): Promise<DiscussionAssistantResponseData> {
  let whereClause = 'organization_id = $1'
  let params: any[] = [context.organizationId]

  if (threadId) {
    whereClause += ' AND id = $2'
    params.push(threadId)
  } else if (courseId) {
    whereClause += ' AND course_id = $2'
    params.push(courseId)
  } else if (classId) {
    whereClause += ' AND class_id = $2'
    params.push(classId)
  }

  // 获取讨论线程数据
  const { data: threads } = await supabase
    .rpc('get_discussion_threads_analysis', {
      organization_id: context.organizationId,
      filter_thread_id: threadId,
      filter_course_id: courseId,
      filter_class_id: classId
    })

  // 获取参与数据
  const { data: participants } = await supabase
    .from('discussion_participants')
    .select(`
      user_id,
      posts_count,
      last_activity_at,
      role,
      users!inner(email, raw_user_meta_data)
    `)
    .eq('organization_id', context.organizationId)
    .order('posts_count', { ascending: false })

  // 使用AI分析参与度
  const analysisPrompt = `分析以下讨论参与数据，提供参与度评估和改进建议：

线程数量: ${threads?.length || 0}
参与人数: ${participants?.length || 0}

参与详情:
${participants?.map((p: any) => `- 用户 ${p.user_id}: ${p.posts_count} 帖子, 角色: ${p.role}, 最后活动: ${p.last_activity_at}`).join('\n') || '无数据'}

请从以下角度分析:
1. 整体参与度评分 (1-10分)
2. 活跃用户识别
3. 沉默用户识别
4. 参与度提升建议
5. 讨论质量评估

以JSON格式返回分析结果。`

  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: z.object({
      engagement_score: z.number().min(1).max(10),
      recommendations: z.array(z.string()),
      participants: z.array(z.object({
        user_id: z.string(),
        activity_level: z.number().min(1).max(10),
        role: z.string()
      }))
    }),
    prompt: analysisPrompt
  })

  return {
    analysis: object
  }
}

/**
 * 建议回复内容
 */
async function suggestReplies({
  supabase,
  user,
  threadId,
  context,
  parameters
}: {
  supabase: any
  user: any
  threadId?: string
  context: any
  parameters?: any
}): Promise<DiscussionAssistantResponseData> {
  const { originalPost, replyTo } = parameters || {}

  if (!originalPost) {
    throw new Error('缺少原始帖子内容')
  }

  const prompt = `作为${context.userRole}，请为以下讨论帖子提供3-5个高质量回复建议：

原始帖子: "${originalPost}"
${replyTo ? `回复对象: "${replyTo}"` : ''}

要求:
- 回复应该促进有意义的讨论
- 体现${context.userRole === 'teacher' ? '专业引导' : '深度思考'}
- 考虑不同观点和角度
- 保持积极和建设性的语调
- 提供具体的理由和论证

每个回复包含: 内容、理由分析、语调建议
以JSON格式返回。`

  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: z.object({
      replies: z.array(z.object({
        content: z.string(),
        reasoning: z.string(),
        tone: z.enum(['friendly', 'professional', 'enthusiastic', 'thoughtful', 'supportive'])
      }))
    }),
    prompt
  })

  return {
    replies: object.replies
  }
}

/**
 * 讨论内容审核
 */
async function moderateDiscussion({
  supabase,
  user,
  threadId,
  context,
  parameters
}: {
  supabase: any
  user: any
  threadId?: string
  context: any
  parameters?: any
}): Promise<DiscussionAssistantResponseData> {
  const { contentToReview } = parameters || {}

  if (!contentToReview) {
    throw new Error('缺少待审核内容')
  }

  const prompt = `作为讨论内容审核员，请分析以下内容并提供审核建议：

待审核内容: "${contentToReview}"

请检查:
1. 是否包含不当言论或攻击性内容
2. 是否偏离讨论主题
3. 是否存在垃圾信息或广告
4. 语言是否恰当
5. 是否需要补充信息

以JSON格式返回审核结果，包含标记内容和推荐操作。`

  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: z.object({
      flagged_content: z.array(z.string()),
      recommended_actions: z.array(z.enum(['approve', 'warn', 'remove', 'request_edit', 'escalate']))
    }),
    prompt
  })

  return {
    moderation: object
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