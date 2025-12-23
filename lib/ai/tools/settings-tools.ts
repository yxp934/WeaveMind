/**
 * Phase 6: AI Settings Optimization Tools
 *
 * 高级设置优化工具，包括用户偏好分析、个性化设置建议和使用模式分析
 * 基于用户行为数据提供智能优化建议
 */

import { tool } from 'ai'
import { z } from 'zod'
import { generateText } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createGatewayOpenAI, DEFAULT_MODEL } from '../langgraph/config/openai-gateway'

// 使用统一的 Gateway 配置
const openai = createGatewayOpenAI()

function extractJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/[{\[][\s\S]*[}\]]/)
    if (match) return JSON.parse(match[0])
    throw new Error('Failed to parse JSON from AI response')
  }
}

/**
 * Tool 5: optimize_user_settings
 * 优化用户设置，基于行为数据提供个性化建议
 */
export const optimizeUserSettingsTool = tool({
  description: '基于用户行为数据优化设置，提供个性化设置建议和效率优化',
  inputSchema: z.object({
    userId: z.string().describe('用户ID'),
    organizationId: z.string().optional().describe('组织ID'),
    currentSettings: z.array(z.object({
      setting_category: z.string(),
      setting_key: z.string(),
      setting_value: z.any(),
      last_updated: z.string().optional(),
    })).optional().describe('当前设置'),
    behaviorData: z.object({
      activityLogs: z.array(z.object({
        activity_type: z.string(),
        timestamp: z.string(),
        duration: z.number().optional(),
        outcome: z.string().optional(),
      })).optional().describe('活动日志'),
      preferences: z.array(z.object({
        feature: z.string(),
        usage_frequency: z.number(),
        satisfaction_score: z.number().optional(),
      })).optional().describe('功能偏好'),
      performanceMetrics: z.object({
        average_session_duration: z.number().optional(),
        feature_adoption_rate: z.number().optional(),
        completion_rate: z.number().optional(),
        error_rate: z.number().optional(),
      }).optional().describe('性能指标'),
    }).optional().describe('行为数据'),
    optimizationGoals: z.array(z.string()).optional().describe('优化目标'),
  }),
  execute: async ({ userId, organizationId, currentSettings, behaviorData, optimizationGoals }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 获取当前设置
    let userSettings = currentSettings
    if (!userSettings) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('setting_category').order('setting_key')

      userSettings = settings || []
    }

    // 获取学习活动数据
    let learningEvents = []
    if (behaviorData?.activityLogs) {
      learningEvents = behaviorData.activityLogs
    } else {
      const { data: events } = await supabase
        .from('learning_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 最近30天
        .order('created_at', { ascending: false })
        .limit(100)

      learningEvents = events || []
    }

    // 获取用户角色和组织信息
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role, organizations(name)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    // 分析用户行为模式
    const behaviorAnalysis = analyzeUserBehavior(learningEvents, userSettings)

    // 构建AI分析提示
    const analysisData = {
      user_profile: {
        user_id: userId,
        organization_id: organizationId,
        role: orgMember?.role || 'student',
        organization_name: (orgMember?.organizations as any)?.name || 'Unknown',
        current_settings_count: userSettings?.length || 0,
      },
      current_settings: userSettings?.reduce((acc: any, setting: any) => {
        if (!acc[setting.setting_category]) {
          acc[setting.setting_category] = {}
        }
        acc[setting.setting_category][setting.setting_key] = setting.setting_value
        return acc
      }, {}) || {},
      behavior_analysis: behaviorAnalysis,
      optimization_goals: optimizationGoals || ['提升用户体验', '提高学习效率', '个性化定制'],
    }

    const prompt = `作为用户体验优化专家，请基于以下用户数据分析和优化建议：

【用户画像】
${JSON.stringify(analysisData.user_profile, null, 2)}

【当前设置】
${JSON.stringify(analysisData.current_settings, null, 2)}

【行为分析】
${JSON.stringify(analysisData.behavior_analysis, null, 2)}

【优化目标】
${analysisData.optimization_goals.join(', ')}

【分析要求】
1. 识别当前设置的优化机会
2. 基于行为模式推荐个性化设置
3. 提升用户体验和效率
4. 解决已知问题和痛点

请以JSON格式输出：
{
  "optimization_summary": {
    "current_efficiency_score": 1-10,
    "optimization_potential": 1-10,
    "priority_areas": ["重点优化领域1", "重点优化领域2"]
  },
  "recommended_changes": [
    {
      "setting_category": "设置类别",
      "setting_key": "设置键",
      "current_value": "当前值",
      "recommended_value": "推荐值",
      "confidence": 0.0-1.0,
      "reason": "推荐理由",
      "expected_benefit": "预期收益",
      "implementation_priority": "high|medium|low"
    }
  ],
  "new_settings_suggestions": [
    {
      "setting_category": "新设置类别",
      "setting_key": "新设置键",
      "recommended_value": "推荐值",
      "rationale": "设置理由",
      "configuration_options": ["选项1", "选项2"]
    }
  ],
  "efficiency_improvements": [
    {
      "area": "改进领域",
      "current_issue": "当前问题",
      "proposed_solution": "解决方案",
      "expected_impact": "预期影响",
      "implementation_effort": "low|medium|high"
    }
  ],
  "personalization_insights": [
    {
      "insight": "个性化洞察",
      "evidence": "支持证据",
      "recommendation": "相关建议"
    }
  ],
  "implementation_roadmap": {
    "immediate_changes": ["立即修改1", "立即修改2"],
    "short_term_optimizations": ["短期优化1", "短期优化2"],
    "long_term_customizations": ["长期定制1", "长期定制2"]
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.4,
        maxOutputTokens: 2000,
      })

      const aiData = extractJson(aiResponse)

      // 应用优化建议
      const optimizedSettings = applyOptimizationSettings(userSettings || [], aiData.recommended_changes)

      return {
        success: true,
        message: '用户设置优化分析完成',
        data: {
          optimization_summary: aiData.optimization_summary,
          recommended_changes: aiData.recommended_changes,
          new_settings_suggestions: aiData.new_settings_suggestions,
          efficiency_improvements: aiData.efficiency_improvements,
          personalization_insights: aiData.personalization_insights,
          implementation_roadmap: aiData.implementation_roadmap,
          optimized_settings: optimizedSettings,
          analysis_metadata: {
            user_id: userId,
            settings_analyzed: userSettings?.length || 0,
            behavior_data_points: learningEvents.length,
            analysis_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`设置优化分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

/**
 * Tool 6: suggest_learning_preferences
 * 学习偏好建议，基于学习历史和目标
 */
export const suggestLearningPreferencesTool = tool({
  description: '基于学习历史和目标提供个性化学习路径建议',
  inputSchema: z.object({
    userId: z.string().describe('用户ID'),
    learningHistory: z.array(z.object({
      course_id: z.string(),
      course_title: z.string(),
      completion_status: z.enum(['completed', 'in_progress', 'dropped']),
      completion_date: z.string().optional(),
      time_spent: z.number().optional(),
      score: z.number().optional(),
      difficulty_rating: z.number().optional(),
      engagement_level: z.number().optional(),
    })).optional().describe('学习历史'),
    learningGoals: z.array(z.object({
      goal: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
      target_date: z.string().optional(),
      progress: z.number().optional(),
    })).optional().describe('学习目标'),
    currentCourses: z.array(z.object({
      course_id: z.string(),
      title: z.string(),
      progress: z.number(),
      next_chapter: z.string().optional(),
    })).optional().describe('当前课程'),
    preferredLearningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']).optional().describe('学习风格偏好'),
  }),
  execute: async ({ userId, learningHistory, learningGoals, currentCourses, preferredLearningStyle }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 获取学习历史数据
    let userLearningHistory = learningHistory
    if (!userLearningHistory) {
      const { data: courses } = await supabase
        .from('class_members')
        .select(`
          *,
          classes (
            courses (
              id, title, description, difficulty_level
            )
          )
        `)
        .eq('user_id', userId)

      const { data: submissions } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', userId)

      // 构建学习历史
      userLearningHistory = (courses || []).map((cm: any) => ({
        course_id: cm.classes?.courses?.id || '',
        course_title: cm.classes?.courses?.title || '',
        completion_status: cm.status === 'active' ? 'in_progress' : 'dropped',
        time_spent: cm.joined_at ? (Date.now() - new Date(cm.joined_at).getTime()) / (1000 * 60 * 60) : 0,
        engagement_level: 0.5, // 默认值
      }))
    }

    // 获取学习目标
    let userLearningGoals = learningGoals
    if (!userLearningGoals) {
      // 从用户设置中获取学习目标
      const { data: goals } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('setting_category', 'learning')
        .eq('setting_key', 'goals')
        .single()

      if (goals?.setting_value) {
        userLearningGoals = goals.setting_value
      }
    }

    // 获取当前课程进度
    let userCurrentCourses = currentCourses
    if (!userCurrentCourses) {
      const { data: activeCourses } = await supabase
        .from('class_members')
        .select(`
          *,
          classes (
            courses (id, title)
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')

      userCurrentCourses = (activeCourses || []).map((ac: any) => ({
        course_id: ac.classes?.courses?.id || '',
        title: ac.classes?.courses?.title || '',
        progress: 0, // 需要从其他地方获取进度
        next_chapter: undefined,
      }))
    }

    // 分析学习模式
    const learningPatternAnalysis = analyzeLearningPatterns(userLearningHistory, userCurrentCourses)

    const prompt = `作为学习科学专家，请基于以下学习数据提供个性化学习偏好建议：

【学习历史】
${JSON.stringify(userLearningHistory, null, 2)}

【学习目标】
${JSON.stringify(userLearningGoals, null, 2)}

【当前课程】
${JSON.stringify(userCurrentCourses, null, 2)}

【学习风格偏好】${preferredLearningStyle || '未指定'}

【学习模式分析】
${JSON.stringify(learningPatternAnalysis, null, 2)}

【分析要求】
1. 识别最佳学习时间和频率
2. 推荐适合的学习方法和资源类型
3. 优化学习路径和节奏
4. 提供个性化学习建议

请以JSON格式输出：
{
  "learning_preferences": {
    "optimal_study_times": ["最佳学习时间1", "最佳学习时间2"],
    "preferred_content_types": ["偏好内容类型1", "偏好内容类型2"],
    "optimal_session_length": "最佳学习时长",
    "break_frequency": "建议休息频率",
    "learning_pace": "slow|moderate|fast",
    "assessment_preferences": ["评估方式1", "评估方式2"]
  },
  "personalized_recommendations": [
    {
      "category": "推荐类别",
      "recommendation": "具体建议",
      "rationale": "推荐理由",
      "implementation": "实施方法",
      "expected_benefit": "预期收益"
    }
  ],
  "learning_path_optimization": {
    "next_steps": ["下一步行动1", "下一步行动2"],
    "skill_gaps_to_address": ["待提升技能1", "待提升技能2"],
    "recommended_resources": [
      {
        "type": "资源类型",
        "title": "资源标题",
        "description": "资源描述",
        "priority": "high|medium|low"
      }
    ]
  },
  "motivation_strategies": [
    {
      "strategy": "激励策略",
      "application": "应用场景",
      "expected_impact": "预期影响"
    }
  ],
  "progress_tracking_suggestions": [
    {
      "metric": "跟踪指标",
      "tracking_method": "跟踪方法",
      "frequency": "跟踪频率",
      "visualization": "可视化方式"
    }
  ]
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.5,
        maxOutputTokens: 1800,
      })

      const aiData = extractJson(aiResponse)

      return {
        success: true,
        message: '学习偏好建议生成完成',
        data: {
          learning_preferences: aiData.learning_preferences,
          personalized_recommendations: aiData.personalized_recommendations,
          learning_path_optimization: aiData.learning_path_optimization,
          motivation_strategies: aiData.motivation_strategies,
          progress_tracking_suggestions: aiData.progress_tracking_suggestions,
          analysis_metadata: {
            user_id: userId,
            learning_history_items: userLearningHistory?.length || 0,
            current_courses_count: userCurrentCourses?.length || 0,
            learning_goals_count: userLearningGoals?.length || 0,
            analysis_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`学习偏好建议生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

/**
 * Tool 7: analyze_usage_patterns
 * 使用模式分析，生成使用报告和优化建议
 */
export const analyzeUsagePatternsTool = tool({
  description: '分析用户使用模式，生成使用报告和优化建议',
  inputSchema: z.object({
    userId: z.string().describe('用户ID'),
    timeRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional().describe('分析时间范围'),
    includeFeatures: z.array(z.string()).optional().describe('包含的功能'),
    analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed').describe('分析深度'),
  }),
  execute: async ({ userId, timeRange, includeFeatures, analysisDepth }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 设置默认时间范围（最近30天）
    const endTime = timeRange?.end || new Date().toISOString()
    const startTime = timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // 获取学习活动数据
    const { data: learningEvents } = await supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startTime)
      .lte('created_at', endTime)
      .order('created_at', { ascending: true })

    // 获取用户设置使用情况
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    // 获取课程参与情况
    const { data: classMemberships } = await supabase
      .from('class_members')
      .select(`
        *,
        classes (
          name,
          courses (id, title)
        )
      `)
      .eq('user_id', userId)

    // 获取作业提交情况
    const { data: submissions } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', userId)
      .gte('created_at', startTime)
      .lte('created_at', endTime)

    // 获取讨论参与情况
    const { data: discussionPosts } = await supabase
      .from('discussion_posts')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startTime)
      .lte('created_at', endTime)

    // 分析使用模式
    const usagePattern = analyzeUserUsagePatterns({
      learningEvents: learningEvents || [],
      userSettings: userSettings || [],
      classMemberships: classMemberships || [],
      submissions: submissions || [],
      discussionPosts: discussionPosts || [],
    })

    const prompt = `作为用户行为分析专家，请分析以下使用数据并提供优化建议：

【用户基本信息】
用户ID：${userId}
分析时间范围：${startTime} 至 ${endTime}
分析深度：${analysisDepth}

【使用模式数据】
${JSON.stringify(usagePattern, null, 2)}

${includeFeatures ? `【重点分析功能】\n${includeFeatures.join(', ')}` : ''}

【分析要求】
1. 识别使用习惯和偏好
2. 发现效率瓶颈和优化机会
3. 提供个性化改进建议
4. 预测未来使用趋势

请以JSON格式输出：
{
  "usage_summary": {
    "total_activity_score": 1-10,
    "engagement_level": "high|medium|low",
    "feature_adoption_rate": 0.0-1.0,
    "productivity_score": 1-10
  },
  "usage_patterns": {
    "peak_activity_hours": ["高峰时间1", "高峰时间2"],
    "preferred_features": ["偏好功能1", "偏好功能2"],
    "session_patterns": {
      "average_session_duration": "平均会话时长",
      "session_frequency": "会话频率",
      "break_patterns": "休息模式"
    },
    "content_preferences": {
      "preferred_content_types": ["偏好内容类型1", "偏好内容类型2"],
      "difficulty_preference": "难度偏好",
      "learning_pace": "学习节奏"
    }
  },
  "performance_insights": [
    {
      "area": "表现领域",
      "current_performance": "当前表现",
      "benchmark_comparison": "基准比较",
      "improvement_potential": "改进潜力",
      "key_factors": ["关键因素1", "关键因素2"]
    }
  ],
  "optimization_recommendations": [
    {
      "category": "优化类别",
      "recommendation": "具体建议",
      "impact": "预期影响",
      "effort_required": "所需努力",
      "priority": "high|medium|low",
      "implementation_steps": ["步骤1", "步骤2"]
    }
  ],
  "behavioral_insights": [
    {
      "insight": "行为洞察",
      "implication": "含义",
      "actionable_recommendation": "可行动建议"
    }
  ],
  "future_predictions": {
    "likely_behavior_changes": ["可能的行为变化1", "可能的行为变化2"],
    "recommended_interventions": ["建议干预1", "建议干预2"],
    "success_probability": 0.0-1.0
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.3,
        maxOutputTokens: 2000,
      })

      const aiData = extractJson(aiResponse)

      return {
        success: true,
        message: '使用模式分析完成',
        data: {
          usage_summary: aiData.usage_summary,
          usage_patterns: aiData.usage_patterns,
          performance_insights: aiData.performance_insights,
          optimization_recommendations: aiData.optimization_recommendations,
          behavioral_insights: aiData.behavioral_insights,
          future_predictions: aiData.future_predictions,
          raw_data_summary: {
            learning_events_count: learningEvents?.length || 0,
            submissions_count: submissions?.length || 0,
            discussion_posts_count: discussionPosts?.length || 0,
            active_settings_count: userSettings?.length || 0,
            class_memberships_count: classMemberships?.length || 0,
          },
          analysis_metadata: {
            user_id: userId,
            time_range: { start: startTime, end: endTime },
            analysis_depth: analysisDepth,
            analysis_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`使用模式分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

/**
 * Tool 8: recommend_notification_settings
 * 通知设置推荐，基于用户角色和活动类型
 */
export const recommendNotificationSettingsTool = tool({
  description: '基于用户角色和活动类型智能推荐通知设置',
  inputSchema: z.object({
    userId: z.string().describe('用户ID'),
    userRole: z.enum(['student', 'teacher', 'admin']).describe('用户角色'),
    organizationId: z.string().describe('组织ID'),
    activityTypes: z.array(z.string()).optional().describe('活动类型'),
    currentPreferences: z.object({
      email_enabled: z.boolean().optional(),
      push_enabled: z.boolean().optional(),
      in_app_enabled: z.boolean().optional(),
      frequency: z.enum(['immediate', 'daily', 'weekly', 'monthly']).optional(),
    }).optional().describe('当前偏好'),
    timezone: z.string().optional().describe('用户时区'),
    workingHours: z.object({
      start: z.string().describe('工作开始时间'),
      end: z.string().describe('工作结束时间'),
    }).optional().describe('工作时间'),
  }),
  execute: async ({ userId, userRole, organizationId, activityTypes, currentPreferences, timezone, workingHours }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 获取用户组织信息
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role, organizations(name, settings)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    // 获取用户当前通知设置
    const { data: notificationSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('setting_category', 'notifications')
      .eq('is_active', true)

    // 获取最近活动数据（用于分析用户活跃时间）
    const { data: recentActivity } = await supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 最近7天
      .order('created_at', { ascending: true })

    // 分析用户活跃模式
    const activePattern = analyzeUserActivePattern(recentActivity || [])

    // 确定相关活动类型
    const relevantActivityTypes = activityTypes || getDefaultActivityTypesForRole(userRole)

    const prompt = `作为通知策略专家，请为以下用户推荐最优通知设置：

【用户信息】
用户ID：${userId}
角色：${userRole}
组织：${(orgMember?.organizations as any)?.name || 'Unknown'}
时区：${timezone || '默认时区'}

【当前设置】
${JSON.stringify(currentPreferences, null, 2)}
${notificationSettings ? `现有通知设置：\n${JSON.stringify(notificationSettings, null, 2)}` : '无现有通知设置'}

【活跃模式分析】
${JSON.stringify(activePattern, null, 2)}

【相关活动类型】
${relevantActivityTypes.join(', ')}

【工作时间】
${workingHours ? `${workingHours.start} - ${workingHours.end}` : '未设置'}

【推荐要求】
1. 平衡通知及时性与避免干扰
2. 根据用户角色和活跃模式个性化
3. 考虑工作时间和时区
4. 优化通知频率和渠道

请以JSON格式输出：
{
  "notification_recommendations": {
    "email_settings": {
      "enabled": true/false,
      "frequency": "immediate|daily|weekly|monthly",
      "digest_time": "推荐发送时间",
      "include_attachments": true/false
    },
    "push_settings": {
      "enabled": true/false,
      "quiet_hours": {
        "start": "免打扰开始时间",
        "end": "免打扰结束时间"
      },
      "urgency_filter": "all|important|urgent_only"
    },
    "in_app_settings": {
      "enabled": true/false,
      "show_badge": true/false,
      "sound_enabled": true/false,
      "preview_length": "预览长度"
    }
  },
  "activity_specific_settings": [
    {
      "activity_type": "活动类型",
      "priority": "high|medium|low",
      "notification_channels": ["email", "push", "in_app"],
      "frequency": "immediate|hourly|daily|weekly",
      "conditions": ["触发条件1", "触发条件2"]
    }
  ],
  "optimization_suggestions": [
    {
      "area": "优化领域",
      "current_issue": "当前问题",
      "recommended_change": "建议修改",
      "expected_benefit": "预期收益",
      "implementation_difficulty": "low|medium|high"
    }
  ],
  "personalization_insights": [
    {
      "insight": "个性化洞察",
      "recommendation": "相关建议",
      "reasoning": "推理过程"
    }
  ],
  "implementation_plan": {
    "immediate_changes": ["立即修改1", "立即修改2"],
    "gradual_optimizations": ["渐进优化1", "渐进优化2"],
    "monitoring_metrics": ["监控指标1", "监控指标2"]
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.4,
        maxOutputTokens: 1800,
      })

      const aiData = extractJson(aiResponse)

      // 构建完整的通知设置配置
      const recommendedSettings = buildNotificationSettings(aiData.notification_recommendations, userId)

      return {
        success: true,
        message: '通知设置推荐完成',
        data: {
          notification_recommendations: aiData.notification_recommendations,
          activity_specific_settings: aiData.activity_specific_settings,
          optimization_suggestions: aiData.optimization_suggestions,
          personalization_insights: aiData.personalization_insights,
          implementation_plan: aiData.implementation_plan,
          recommended_settings: recommendedSettings,
          analysis_metadata: {
            user_id: userId,
            user_role: userRole,
            active_pattern_analysis: activePattern,
            relevant_activities: relevantActivityTypes,
            recommendation_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`通知设置推荐失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

// 辅助函数

function analyzeUserBehavior(learningEvents: any[], userSettings: any[]) {
  const behavior = {
    total_activities: learningEvents.length,
    activity_types: learningEvents.reduce((acc: any, event: any) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {}),
    time_distribution: learningEvents.reduce((acc: any, event: any) => {
      const hour = new Date(event.created_at).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {}),
    completion_rate: 0,
    average_session_duration: 0,
  }

  // 计算完成率
  const completedActivities = learningEvents.filter(e => e.event_type === 'course_completed')
  behavior.completion_rate = learningEvents.length > 0 ? completedActivities.length / learningEvents.length : 0

  return behavior
}

function analyzeLearningPatterns(learningHistory: any[], currentCourses: any[]) {
  const patterns = {
    course_completion_rate: 0,
    average_course_duration: 0,
    preferred_difficulty: 'moderate',
    learning_consistency: 0,
    engagement_trend: 'stable',
  }

  if (learningHistory.length > 0) {
    const completedCourses = learningHistory.filter(c => c.completion_status === 'completed')
    patterns.course_completion_rate = completedCourses.length / learningHistory.length

    // 分析难度偏好
    const difficultyRatings = learningHistory
      .filter(c => c.difficulty_rating)
      .map(c => c.difficulty_rating)

    if (difficultyRatings.length > 0) {
      const avgDifficulty = difficultyRatings.reduce((sum, rating) => sum + rating, 0) / difficultyRatings.length
      patterns.preferred_difficulty = avgDifficulty > 4 ? 'challenging' : avgDifficulty < 3 ? 'easy' : 'moderate'
    }
  }

  return patterns
}

function analyzeUserUsagePatterns(data: any) {
  const patterns = {
    total_activities: data.learningEvents.length,
    feature_usage: {
      courses: data.classMemberships.length,
      submissions: data.submissions.length,
      discussions: data.discussionPosts.length,
      settings_configured: data.userSettings.length,
    },
    time_distribution: data.learningEvents.reduce((acc: any, event: any) => {
      const hour = new Date(event.created_at).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {}),
    engagement_level: calculateEngagementLevel(data),
  }

  return patterns
}

function calculateEngagementLevel(data: any) {
  const totalActivities = data.learningEvents.length
  const recentActivities = data.learningEvents.filter((e: any) =>
    new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length

  if (totalActivities === 0) return 'low'
  if (recentActivities / totalActivities > 0.3) return 'high'
  if (recentActivities / totalActivities > 0.1) return 'medium'
  return 'low'
}

function analyzeUserActivePattern(activities: any[]) {
  const pattern = {
    peak_hours: [] as number[],
    daily_average: 0,
    weekly_trend: 'stable',
    most_active_day: 'monday',
  }

  if (activities.length === 0) return pattern

  // 分析每小时活动分布
  const hourlyDistribution = activities.reduce((acc: any, activity: any) => {
    const hour = new Date(activity.created_at).getHours()
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {})

  // 找出高峰时间
  const sortedHours = Object.entries(hourlyDistribution)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([hour]) => parseInt(hour))

  pattern.peak_hours = sortedHours
  pattern.daily_average = activities.length / 7

  return pattern
}

function getDefaultActivityTypesForRole(role: string): string[] {
  switch (role) {
    case 'student':
      return [
        'course_updates',
        'assignment_due',
        'new_materials',
        'discussion_replies',
        'grades_posted',
        'announcements',
      ]
    case 'teacher':
      return [
        'student_submissions',
        'course_analytics',
        'system_updates',
        'student_questions',
        'grade_reminders',
      ]
    case 'admin':
      return [
        'system_alerts',
        'user_activities',
        'security_notifications',
        'system_updates',
        'compliance_alerts',
      ]
    default:
      return ['general_notifications']
  }
}

function applyOptimizationSettings(currentSettings: any[], recommendedChanges: any[]) {
  // 应用优化建议到当前设置
  const optimizedSettings = [...currentSettings]

  recommendedChanges.forEach((change: any) => {
    const existingIndex = optimizedSettings.findIndex(
      s => s.setting_category === change.setting_category && s.setting_key === change.setting_key
    )

    if (existingIndex >= 0) {
      optimizedSettings[existingIndex] = {
        ...optimizedSettings[existingIndex],
        setting_value: change.recommended_value,
        updated_at: new Date().toISOString(),
      }
    } else {
      optimizedSettings.push({
        setting_category: change.setting_category,
        setting_key: change.setting_key,
        setting_value: change.recommended_value,
        is_active: true,
        created_at: new Date().toISOString(),
      })
    }
  })

  return optimizedSettings
}

function buildNotificationSettings(recommendations: any, userId: string) {
  const settings = []

  // 邮件设置
  if (recommendations.email_settings) {
    settings.push({
      user_id: userId,
      setting_category: 'notifications',
      setting_key: 'email_enabled',
      setting_value: recommendations.email_settings.enabled,
      data_type: 'boolean',
      description: '启用邮件通知',
    })

    settings.push({
      user_id: userId,
      setting_category: 'notifications',
      setting_key: 'email_frequency',
      setting_value: recommendations.email_settings.frequency,
      data_type: 'string',
      description: '邮件通知频率',
    })
  }

  // 推送设置
  if (recommendations.push_settings) {
    settings.push({
      user_id: userId,
      setting_category: 'notifications',
      setting_key: 'push_enabled',
      setting_value: recommendations.push_settings.enabled,
      data_type: 'boolean',
      description: '启用推送通知',
    })
  }

  // 应用内通知设置
  if (recommendations.in_app_settings) {
    settings.push({
      user_id: userId,
      setting_category: 'notifications',
      setting_key: 'in_app_enabled',
      setting_value: recommendations.in_app_settings.enabled,
      data_type: 'boolean',
      description: '启用应用内通知',
    })
  }

  return settings
}

/**
 * 设置优化工具集合
 */
export const settingsOptimizationTools = {
  optimizeUserSettings: optimizeUserSettingsTool,
  suggestLearningPreferences: suggestLearningPreferencesTool,
  analyzeUsagePatterns: analyzeUsagePatternsTool,
  recommendNotificationSettings: recommendNotificationSettingsTool,
}
