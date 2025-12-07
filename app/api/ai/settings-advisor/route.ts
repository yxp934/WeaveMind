import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SettingsAdvisorRequest, StandardApiResponse, SettingsAdvisorResponseData } from '@/lib/types/api'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

// 初始化OpenAI客户端
const openai = createOpenAI({
  apiKey: process.env.VERCEL_GAI_API_KEY,
})

// 设置顾问请求验证模式
const settingsAdvisorRequestSchema = z.object({
  action: z.enum(['optimize_learning_path', 'recommend_notifications', 'personalize_interface', 'analyze_usage']),
  userId: z.string().uuid().optional(),
  context: z.object({
    userRole: z.enum(['teacher', 'student', 'self_learner']),
    organizationId: z.string().uuid()
  }),
  preferences: z.object({
    learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading_writing']).optional(),
    difficulty: z.string().optional(),
    interests: z.array(z.string()).optional()
  }).optional()
})

/**
 * 设置优化顾问API端点
 * 提供AI驱动的个性化设置建议和学习路径优化
 */
export async function POST(request: NextRequest): Promise<NextResponse<StandardApiResponse<SettingsAdvisorResponseData>>> {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  let user: any = null
  let action: string = ''
  let context: any = null
  let preferences: any = null
  let userId: string | undefined

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
    const validation = settingsAdvisorRequestSchema.safeParse(body)

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
    userId = validatedData.userId
    context = validatedData.context
    preferences = validatedData.preferences
    const targetUserId = userId || user.id

    // 3. 验证用户权限
    if (userId && userId !== user.id) {
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', context.organizationId)
        .eq('user_id', user.id)
        .single()

      if (!orgMember || !['owner', 'teacher'].includes(orgMember.role)) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '无权查看其他用户的设置'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId
          }
        }, { status: 403 })
      }
    }

    // 4. 根据操作类型执行相应逻辑
    let responseData: SettingsAdvisorResponseData

    switch (action) {
      case 'optimize_learning_path':
        responseData = await optimizeLearningPath({
          supabase,
          user,
          targetUserId,
          context,
          preferences
        })
        break

      case 'recommend_notifications':
        responseData = await recommendNotifications({
          supabase,
          user,
          targetUserId,
          context,
          preferences
        })
        break

      case 'personalize_interface':
        responseData = await personalizeInterface({
          supabase,
          user,
          targetUserId,
          context,
          preferences
        })
        break

      case 'analyze_usage':
        responseData = await analyzeUsage({
          supabase,
          user,
          targetUserId,
          context,
          preferences
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
      action: `settings_${action}`,
      input: { action, userId: targetUserId, context, preferences },
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
    console.error(`Settings Advisor Error [${requestId}]:`, error)

    // 记录错误日志
    await logAIUsage({
      userId: user?.id,
      organizationId: context?.organizationId,
      requestId,
      action: `settings_${action}`,
      input: { action, userId, context, preferences },
      output: null,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    })

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '设置顾问服务处理失败',
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
 * 优化学习路径
 */
async function optimizeLearningPath({
  supabase,
  user,
  targetUserId,
  context,
  preferences
}: {
  supabase: any
  user: any
  targetUserId: string
  context: any
  preferences?: any
}): Promise<SettingsAdvisorResponseData> {
  // 获取用户当前学习路径
  const { data: pathways } = await supabase
    .from('self_learner_pathways')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })

  // 获取用户活动历史
  const { data: activities } = await supabase
    .from('self_learner_activities')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(100)

  // 获取课程进度
  const { data: progress } = await supabase
    .from('learning_events')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(50)

  // 获取收藏内容
  const { data: favorites } = await supabase
    .from('self_learner_favorites')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })

  const userProfile = {
    pathways: pathways || [],
    recentActivities: activities?.slice(0, 10) || [],
    learningProgress: progress || [],
    favorites: favorites || [],
    preferences: preferences || {},
    userRole: context.userRole
  }

  const prompt = `基于以下用户学习数据，提供学习路径优化建议：

用户角色: ${context.userRole}
学习偏好: ${JSON.stringify(preferences)}

学习路径: ${userProfile.pathways.map((p: any) => `${p.title} (${p.difficulty_level})`).join(', ') || '无'}
近期活动: ${userProfile.recentActivities.map((a: any) => `${a.activity_type} - ${a.created_at}`).join(', ') || '无'}
学习进度: ${userProfile.learningProgress.length} 个学习事件
收藏内容: ${userProfile.favorites.length} 个收藏

请分析用户的学习模式并提供：
1. 当前学习阶段评估
2. 下一步学习建议
3. 预计完成时间
4. 难度调整建议

以JSON格式返回优化结果。`

  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: z.object({
      learning_path: z.object({
        current_stage: z.string(),
        next_steps: z.array(z.string()),
        estimated_completion: z.string(),
        difficulty_adjustments: z.array(z.string())
      })
    }),
    prompt
  })

  return {
    learning_path: object.learning_path
  }
}

/**
 * 推荐通知设置
 */
async function recommendNotifications({
  supabase,
  user,
  targetUserId,
  context,
  preferences
}: {
  supabase: any
  user: any
  targetUserId: string
  context: any
  preferences?: any
}): Promise<SettingsAdvisorResponseData> {
  // 获取当前通知偏好
  const { data: currentSettings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('setting_category', 'notifications')

  // 获取用户活动模式
  const { data: activities } = await supabase
    .from('self_learner_activities')
    .select('activity_type, created_at, metadata')
    .eq('user_id', targetUserId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 最近30天

  const activityPattern = {
    currentSettings: currentSettings || [],
    recentActivityCount: activities?.length || 0,
    mostActiveHours: calculateMostActiveHours(activities || []),
    activityTypes: [...new Set(activities?.map((a: any) => a.activity_type) || [])]
  }

  const prompt = `基于以下用户通知偏好和活动模式，推荐个性化通知设置：

用户角色: ${context.userRole}
当前通知设置数量: ${activityPattern.currentSettings.length}
近期活动频率: ${activityPattern.recentActivityCount} 次/30天
最活跃时段: ${activityPattern.mostActiveHours}
主要活动类型: ${activityPattern.activityTypes.join(', ')}

考虑因素:
- ${context.userRole === 'teacher' ? '教师需要关注课程管理和学生进度' : '学生需要关注学习进度和截止日期'}
- 用户活跃时间段
- 活动类型偏好
- 学习效率优化

请推荐通知设置，包括：
1. 通知类型和频率
2. 最佳通知时间
3. 通知渠道选择
4. 优先级设置

以JSON格式返回推荐结果。`

  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: z.object({
      recommendations: z.array(z.object({
        setting_category: z.string(),
        setting_key: z.string(),
        current_value: z.any(),
        recommended_value: z.any(),
        reasoning: z.string(),
        priority: z.enum(['low', 'medium', 'high'])
      }))
    }),
    prompt
  })

  return {
    recommendations: object.recommendations
  }
}

/**
 * 个性化界面建议
 */
async function personalizeInterface({
  supabase,
  user,
  targetUserId,
  context,
  preferences
}: {
  supabase: any
  user: any
  targetUserId: string
  context: any
  preferences?: any
}): Promise<SettingsAdvisorResponseData> {
  // 获取当前界面设置
  const { data: interfaceSettings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('setting_category', 'interface')

  // 获取用户学习风格偏好
  const { data: learningStyle } = await supabase
    .from('user_settings')
    .select('setting_value')
    .eq('user_id', targetUserId)
    .eq('setting_key', 'learning_style')
    .single()

  const interfaceProfile = {
    currentSettings: interfaceSettings || [],
    learningStyle: learningStyle?.setting_value || preferences?.learningStyle || 'visual',
    userRole: context.userRole
  }

  const prompt = `基于以下用户界面偏好和角色，提供界面个性化建议：

用户角色: ${context.userRole}
学习风格: ${interfaceProfile.learningStyle}
当前界面设置: ${interfaceProfile.currentSettings.length} 项

${context.userRole === 'teacher' ? '教师界面建议考虑: 课程管理效率、数据展示清晰度、快速操作访问' : '学生界面建议考虑: 学习专注度、信息层次清晰、交互友好性'}

学习风格特点:
- visual: 偏好图表、颜色、视觉元素
- auditory: 偏好音频提示、语音导航
- kinesthetic: 偏好交互操作、拖拽功能
- reading_writing: 偏好文本内容、文字描述

请推荐界面个性化设置，包括：
1. 主题和颜色方案
2. 布局和导航方式
3. 内容显示偏好
4. 交互元素调整

以JSON格式返回推荐结果。`

  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: z.object({
      recommendations: z.array(z.object({
        setting_category: z.string(),
        setting_key: z.string(),
        current_value: z.any(),
        recommended_value: z.any(),
        reasoning: z.string(),
        priority: z.enum(['low', 'medium', 'high'])
      }))
    }),
    prompt
  })

  return {
    recommendations: object.recommendations
  }
}

/**
 * 分析使用情况
 */
async function analyzeUsage({
  supabase,
  user,
  targetUserId,
  context,
  preferences
}: {
  supabase: any
  user: any
  targetUserId: string
  context: any
  preferences?: any
}): Promise<SettingsAdvisorResponseData> {
  // 获取最近30天的活动数据
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: activities } = await supabase
    .from('self_learner_activities')
    .select('*')
    .eq('user_id', targetUserId)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  // 获取学习会话数据
  const { data: sessions } = await supabase
    .from('learning_events')
    .select('*')
    .eq('user_id', targetUserId)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  // 分析使用模式
  const usageStats = calculateUsageStats(activities || [], sessions || [])

  const prompt = `分析以下用户30天使用数据，提供使用情况分析和改进建议：

用户角色: ${context.userRole}
总学习会话: ${usageStats.totalSessions}
平均会话时长: ${usageStats.averageSessionDuration} 分钟
最常用功能: ${usageStats.mostUsedFeatures.join(', ') || '无'}
学习进度: ${usageStats.learningVelocity}

使用时间分布:
${Object.entries(usageStats.hourlyDistribution).map(([hour, count]) => `${hour}:00 - ${count} 次`).join('\n') || '无数据'}

活动类型分布:
${Object.entries(usageStats.activityDistribution).map(([type, count]) => `${type}: ${count} 次`).join('\n') || '无数据'}

请提供:
1. 使用效率评估
2. 学习习惯分析
3. 改进建议
4. 个性化推荐

以JSON格式返回分析结果。`

  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: z.object({
      usage_analysis: z.object({
        total_sessions: z.number(),
        average_session_duration: z.number(),
        most_used_features: z.array(z.string()),
        learning_velocity: z.enum(['slow', 'normal', 'fast']),
        recommendations: z.array(z.string())
      })
    }),
    prompt
  })

  return {
    usage_analysis: object.usage_analysis
  }
}

/**
 * 计算最活跃时段
 */
function calculateMostActiveHours(activities: any[]): string {
  const hourCounts: { [key: number]: number } = {}

  activities.forEach(activity => {
    const hour = new Date(activity.created_at).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })

  const sortedHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => `${hour}:00-${parseInt(hour) + 1}:00`)

  return sortedHours.join(', ') || '无明确模式'
}

/**
 * 计算使用统计
 */
function calculateUsageStats(activities: any[], sessions: any[]) {
  const sessionDurations: number[] = []
  const featureUsage: { [key: string]: number } = {}
  const hourlyDistribution: { [key: string]: number } = {}
  const activityDistribution: { [key: string]: number } = {}

  // 处理会话数据
  sessions.forEach(session => {
    const startTime = new Date(session.created_at).getTime()
    const endTime = new Date(session.updated_at || session.created_at).getTime()
    const duration = (endTime - startTime) / (1000 * 60) // 转换为分钟
    sessionDurations.push(duration)

    const hour = new Date(session.created_at).getHours()
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
  })

  // 处理活动数据
  activities.forEach(activity => {
    const activityType = activity.activity_type
    activityDistribution[activityType] = (activityDistribution[activityType] || 0) + 1

    if (activity.metadata?.feature) {
      const feature = activity.metadata.feature
      featureUsage[feature] = (featureUsage[feature] || 0) + 1
    }
  })

  return {
    totalSessions: sessions.length,
    averageSessionDuration: sessionDurations.length > 0
      ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
      : 0,
    mostUsedFeatures: Object.entries(featureUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature),
    hourlyDistribution,
    activityDistribution,
    learningVelocity: sessions.length > 20 ? 'fast' : sessions.length > 10 ? 'normal' : 'slow'
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