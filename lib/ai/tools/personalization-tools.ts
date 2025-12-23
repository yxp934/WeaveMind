/**
 * Phase 6: AI Personalization Tools
 *
 * 高级个性化建议工具，包括个性化推荐、内容难度适配和学习提醒
 * 基于用户画像和行为数据提供智能个性化服务
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
 * Tool 13: generate_personalized_recommendations
 * 生成个性化推荐
 */
export const generatePersonalizedRecommendationsTool = tool({
  description: '基于用户画像和历史行为生成个性化课程推荐和学习建议',
  inputSchema: z.object({
    userId: z.string().describe('用户ID'),
    userProfile: z.object({
      demographics: z.object({
        age: z.number().optional(),
        education_level: z.string().optional(),
        profession: z.string().optional(),
        location: z.string().optional(),
      }).optional().describe('人口统计信息'),
      learningPreferences: z.object({
        preferred_learning_style: z.enum(['visual', 'auditory', 'kinesthetic', 'reading', 'mixed']).optional(),
        pace_preference: z.enum(['slow', 'moderate', 'fast']).optional(),
        time_availability: z.number().optional().describe('每周可用学习时间（小时）'),
        device_preference: z.enum(['desktop', 'mobile', 'tablet', 'mixed']).optional(),
      }).optional().describe('学习偏好'),
      skillProfile: z.object({
        current_skills: z.array(z.string()).optional(),
        skill_levels: z.record(z.string(), z.number()).optional().describe('技能水平（1-5）'),
        learning_goals: z.array(z.object({
          goal: z.string(),
          priority: z.enum(['high', 'medium', 'low']),
          target_date: z.string().datetime().optional(),
        })).optional().describe('学习目标'),
      }).optional().describe('技能画像'),
    }).optional().describe('用户画像'),
    behaviorHistory: z.object({
      coursesCompleted: z.array(z.object({
        courseId: z.string(),
        title: z.string(),
        completionDate: z.string().datetime(),
        rating: z.number().optional(),
        difficulty: z.enum(['too_easy', 'just_right', 'too_hard']).optional(),
        timeSpent: z.number().optional(),
      })).optional().describe('已完成课程'),
      coursesInProgress: z.array(z.object({
        courseId: z.string(),
        title: z.string(),
        progress: z.number(),
        currentChapter: z.string().optional(),
      })).optional().describe('进行中课程'),
      interactionPatterns: z.object({
        average_session_length: z.number().optional(),
        preferred_study_times: z.array(z.number()).optional().describe('偏好学习时间（小时）'),
        feature_usage: z.record(z.string(), z.number()).optional().describe('功能使用频率'),
        engagement_score: z.number().optional().describe('参与度得分'),
      }).optional().describe('交互模式'),
    }).optional().describe('行为历史'),
    context: z.object({
      organizationId: z.string().optional().describe('组织ID'),
      role: z.enum(['student', 'teacher', 'admin']).optional().describe('用户角色'),
      currentSession: z.object({
        timestamp: z.string().datetime(),
        currentActivity: z.string().optional(),
        recentActions: z.array(z.string()).optional(),
      }).optional().describe('当前会话'),
    }).optional().describe('上下文信息'),
    recommendationTypes: z.array(z.enum(['courses', 'activities', 'study_groups', 'resources', 'career_path', 'skill_development'])).optional().describe('推荐类型'),
  }),
  execute: async ({ userId, userProfile, behaviorHistory, context, recommendationTypes }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 获取用户基本信息和设置
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    // 获取组织信息和课程数据
    let organizationContext = null
    if (context?.organizationId) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', context.organizationId)
        .single()

      organizationContext = orgData
    }

    // 获取可用课程列表
    const { data: availableCourses } = await supabase
      .from('courses')
      .select(`
        id, title, description, difficulty_level, estimated_duration, tags,
        requirements, learning_objectives,
        chapters (id, title, order_index),
        classes (id, name, organization_id)
      `)
      .eq('is_published', true)

    // 获取学习活动历史
    const { data: learningEvents } = await supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    // 构建用户画像综合分析
    const comprehensiveProfile = buildComprehensiveProfile(
      userProfile,
      userSettings || [],
      behaviorHistory,
      learningEvents || []
    )

    const prompt = `作为个性化推荐系统专家，请基于以下用户数据生成精准的个性化推荐：

【用户画像】
${JSON.stringify(comprehensiveProfile, null, 2)}

【组织上下文】
${JSON.stringify(organizationContext, null, 2)}

【可用资源】
课程数量：${availableCourses?.length || 0}
${availableCourses?.slice(0, 5).map(c => `- ${c.title} (${c.difficulty_level})`).join('\n') || '无课程数据'}

【推荐类型要求】
${recommendationTypes ? recommendationTypes.join(', ') : '全部类型'}

【个性化分析要求】
1. 深度理解用户需求和偏好
2. 考虑技能发展轨迹和职业目标
3. 平衡挑战性与可实现性
4. 提供多元化学习路径
5. 考虑社交学习和协作机会

请以JSON格式输出：
{
  "personalization_score": 0.0-1.0,
  "user_archetype": "用户原型描述",
  "recommendations": {
    "courses": [
      {
        "course_id": "课程ID",
        "title": "课程标题",
        "description": "课程描述",
        "relevance_score": 0.0-1.0,
        "match_reasons": ["匹配原因1", "匹配原因2"],
        "difficulty_appropriateness": "too_easy|just_right|too_hard",
        "estimated_completion_time": "预计完成时间",
        "learning_objectives_alignment": ["目标对齐1", "目标对齐2"],
        "prerequisite_check": {
          "meets_requirements": true/false,
          "gap_analysis": ["技能差距1", "技能差距2"]
        },
        "personalization_factors": {
          "style_match": "学习风格匹配度",
          "pace_suitability": "节奏适合度",
          "context_relevance": "上下文相关性"
        }
      }
    ],
    "activities": [
      {
        "activity_id": "活动ID",
        "title": "活动标题",
        "type": "活动类型",
        "description": "活动描述",
        "relevance_score": 0.0-1.0,
        "skill_development_focus": ["技能发展重点1", "技能发展重点2"],
        "estimated_duration": "预计时长",
        "group_size": "小组规模",
        "collaboration_potential": "协作潜力评估"
      }
    ],
    "study_groups": [
      {
        "group_id": "学习小组ID",
        "name": "小组名称",
        "description": "小组描述",
        "member_count": "成员数量",
        "focus_area": "重点领域",
        "meeting_schedule": "会议安排",
        "compatibility_score": 0.0-1.0,
        "join_benefits": ["加入好处1", "加入好处2"]
      }
    ],
    "resources": [
      {
        "resource_id": "资源ID",
        "title": "资源标题",
        "type": "资源类型",
        "description": "资源描述",
        "relevance_score": 0.0-1.0,
        "accessibility": "可访问性",
        "cost": "free|paid|subscription",
        "personalization_reason": "个性化推荐理由"
      }
    ],
    "career_path": [
      {
        "pathway_name": "职业路径名称",
        "description": "路径描述",
        "required_skills": ["必需技能1", "必需技能2"],
        "current_readiness": 0.0-1.0,
        "next_steps": ["下一步1", "下一步2"],
        "timeline": "时间线",
        "success_metrics": ["成功指标1", "成功指标2"]
      }
    ],
    "skill_development": [
      {
        "skill": "技能名称",
        "current_level": 1-5,
        "target_level": 1-5,
        "development_plan": {
          "phases": [
            {
              "phase": "阶段名称",
              "activities": ["活动1", "活动2"],
              "timeline": "时间线"
            }
          ]
        },
        "priority": "high|medium|low",
        "market_value": "市场价值评估"
      }
    ]
  },
  "learning_journey": {
    "immediate_next_steps": ["即时下一步1", "即时下一步2"],
    "short_term_goals": ["短期目标1", "短期目标2"],
    "long_term_vision": "长期愿景",
    "milestone_timeline": [
      {
        "milestone": "里程碑",
        "target_date": "目标日期",
        "success_criteria": ["成功标准1", "成功标准2"]
      }
    ]
  },
  "personalization_insights": [
    {
      "insight": "个性化洞察",
      "evidence": "支持证据",
      "actionable_implication": "可行动含义"
    }
  ],
  "recommendation_confidence": {
    "overall_confidence": 0.0-1.0,
    "data_sufficiency": 0.0-1.0,
    "prediction_reliability": 0.0-1.0,
    "confidence_factors": ["信心因素1", "信心因素2"]
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.6,
        maxOutputTokens: 3500,
      })

      const aiData = extractJson(aiResponse)

      // 过滤和组织推荐结果
      const filteredRecommendations = filterRecommendationsByType(
        aiData.recommendations,
        recommendationTypes
      )

      // 计算推荐多样性得分
      const diversityScore = calculateRecommendationDiversity(filteredRecommendations)

      return {
        success: true,
        message: '个性化推荐生成完成',
        data: {
          personalization_score: aiData.personalization_score,
          user_archetype: aiData.user_archetype,
          recommendations: filteredRecommendations,
          learning_journey: aiData.learning_journey,
          personalization_insights: aiData.personalization_insights,
          recommendation_confidence: {
            ...aiData.recommendation_confidence,
            diversity_score: diversityScore,
          },
          implementation_guidance: generateImplementationGuidance(aiData),
          analysis_metadata: {
            user_id: userId,
            profile_completeness: calculateProfileCompleteness(comprehensiveProfile),
            available_resources: availableCourses?.length || 0,
            recommendation_count: Object.values(filteredRecommendations).flat().length,
            analysis_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`个性化推荐生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

/**
 * Tool 14: adapt_content_difficulty
 * 内容难度适配
 */
export const adaptContentDifficultyTool = tool({
  description: '基于用户能力水平智能调整内容难度，提供个性化学习体验',
  inputSchema: z.object({
    userId: z.string().describe('用户ID'),
    contentId: z.string().describe('内容ID'),
    contentType: z.enum(['course', 'chapter', 'component', 'assessment']).describe('内容类型'),
    currentDifficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('当前难度'),
    userCapabilityProfile: z.object({
      skillLevels: z.record(z.string(), z.number()).describe('各技能水平（1-5）'),
      learningVelocity: z.enum(['slow', 'moderate', 'fast']).describe('学习速度'),
      retentionRate: z.number().min(0).max(1).describe('知识保持率'),
      frustrationTolerance: z.enum(['low', 'medium', 'high']).describe('挫折容忍度'),
      motivationLevel: z.enum(['low', 'medium', 'high']).describe('动机水平'),
      priorKnowledge: z.record(z.string(), z.boolean()).optional().describe('先验知识'),
    }).describe('用户能力画像'),
    adaptationGoals: z.array(z.object({
      goal: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
      targetLevel: z.number().optional().describe('目标水平（1-5）'),
    })).optional().describe('适配目标'),
    constraints: z.object({
      timeLimit: z.number().optional().describe('时间限制（小时）'),
      resourceAvailability: z.array(z.string()).optional().describe('可用资源'),
      accessibilityNeeds: z.array(z.string()).optional().describe('无障碍需求'),
    }).optional().describe('约束条件'),
  }),
  execute: async ({ userId, contentId, contentType, currentDifficulty, userCapabilityProfile, adaptationGoals, constraints }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 获取内容详情
    const contentQuery = supabase
      .from(contentType === 'course' ? 'courses' :
                   contentType === 'chapter' ? 'chapters' :
                   contentType === 'component' ? 'components' : 'assessments')
      .select('*')
      .eq('id', contentId)

    const { data: content } = await contentQuery.single()

    if (!content) {
      throw new Error(`${contentType}内容未找到`)
    }

    // 获取用户学习历史
    const { data: userHistory } = await supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    // 获取相关评估数据
    const { data: assessmentData } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', userId)
      .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())

    // 分析用户学习模式
    const learningPattern = analyzeLearningPattern(userHistory || [], assessmentData || [])

    const prompt = `作为学习内容适配专家，请基于用户能力分析和内容特征提供难度适配建议：

【用户能力画像】
${JSON.stringify(userCapabilityProfile, null, 2)}

【内容信息】
内容ID：${contentId}
内容类型：${contentType}
当前难度：${currentDifficulty}
${contentType === 'course' ? `课程标题：${content.title}` :
  contentType === 'chapter' ? `章节标题：${content.title}` :
  contentType === 'component' ? `组件类型：${content.type}` : '评估类型：quiz'}

【学习模式分析】
${JSON.stringify(learningPattern, null, 2)}

【适配目标】
${JSON.stringify(adaptationGoals, null, 2)}

【约束条件】
${JSON.stringify(constraints, null, 2)}

【适配要求】
1. 确保内容挑战性与用户能力匹配
2. 保持学习动机和参与度
3. 提供适当的支架和支撑
4. 优化认知负荷分配
5. 支持个性化学习路径

请以JSON格式输出：
{
  "difficulty_assessment": {
    "current_appropriateness": "too_easy|just_right|too_hard",
    "optimal_difficulty_level": "beginner|intermediate|advanced",
    "complexity_score": 0.0-1.0,
    "challenge_sweet_spot": 0.0-1.0,
    "adaptation_urgency": "immediate|soon|later|none"
  },
  "content_modifications": [
    {
      "modification_type": "modification_type",
      "description": "修改描述",
      "implementation": "实施方法",
      "expected_impact": "预期影响",
      "difficulty_adjustment": "难度调整量",
      "priority": "high|medium|low"
    }
  ],
  "scaffolding_strategies": [
    {
      "strategy": "支架策略",
      "description": "策略描述",
      "target_skill": "目标技能",
      "implementation_steps": ["步骤1", "步骤2"],
      "fade_out_plan": "逐步退出计划"
    }
  ],
  "alternative_versions": [
    {
      "version_name": "版本名称",
      "difficulty_level": "beginner|intermediate|advanced",
      "modifications": ["修改1", "修改2"],
      "target_audience": "目标受众",
      "success_criteria": ["成功标准1", "成功标准2"]
    }
  ],
  "adaptive_elements": [
    {
      "element": "自适应元素",
      "trigger_conditions": ["触发条件1", "触发条件2"],
      "adaptation_mechanism": "适配机制",
      "monitoring_metrics": ["监控指标1", "监控指标2"]
    }
  ],
  "personalization_factors": {
    "pace_adjustments": "节奏调整建议",
    "explanation_depth": "解释深度",
    "example_complexity": "示例复杂度",
    "practice_frequency": "练习频率",
    "feedback_timing": "反馈时机"
  },
  "success_prediction": {
    "completion_probability": 0.0-1.0,
    "engagement_forecast": "参与度预测",
    "learning_outcome_expectation": "学习成果预期",
    "risk_factors": ["风险因素1", "风险因素2"],
    "mitigation_strategies": ["缓解策略1", "缓解策略2"]
  },
  "implementation_roadmap": {
    "immediate_changes": ["立即修改1", "立即修改2"],
    "progressive_adaptations": ["渐进适配1", "渐进适配2"],
    "monitoring_checkpoints": ["监控检查点1", "监控检查点2"],
    "success_evaluation_criteria": ["成功评估标准1", "成功评估标准2"]
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.4,
        maxOutputTokens: 2800,
      })

      const aiData = extractJson(aiResponse)

      // 生成适配后的内容配置
      const adaptedContentConfig = generateAdaptedContentConfig(
        content,
        aiData,
        userCapabilityProfile,
        constraints
      )

      // 计算适配效果预测
      const adaptationEffectiveness = calculateAdaptationEffectiveness(
        userCapabilityProfile,
        aiData.difficulty_assessment,
        learningPattern
      )

      return {
        success: true,
        message: '内容难度适配完成',
        data: {
          difficulty_assessment: aiData.difficulty_assessment,
          content_modifications: aiData.content_modifications,
          scaffolding_strategies: aiData.scaffolding_strategies,
          alternative_versions: aiData.alternative_versions,
          adaptive_elements: aiData.adaptive_elements,
          personalization_factors: aiData.personalization_factors,
          success_prediction: aiData.success_prediction,
          implementation_roadmap: aiData.implementation_roadmap,
          adapted_content_config: adaptedContentConfig,
          adaptation_effectiveness: adaptationEffectiveness,
          adaptation_metadata: {
            user_id: userId,
            content_id: contentId,
            content_type: contentType,
            adaptation_complexity: calculateAdaptationComplexity(aiData),
            expected_improvement: adaptationEffectiveness.improvement_score,
            adaptation_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`内容难度适配失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

/**
 * Tool 15: create_study_reminders
 * 创建学习提醒
 */
export const createStudyRemindersTool = tool({
  description: '基于学习计划和用户偏好创建智能学习提醒和時間管理建议',
  inputSchema: z.object({
    userId: z.string().describe('用户ID'),
    studyPlan: z.object({
      learningObjectives: z.array(z.object({
        objective: z.string(),
        targetDate: z.string().datetime(),
        priority: z.enum(['high', 'medium', 'low']),
        estimatedHours: z.number(),
      })).describe('学习目标'),
      schedule: z.object({
        preferredStudyTimes: z.array(z.object({
          day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
          startTime: z.string(),
          endTime: z.string(),
          sessionType: z.enum(['deep_work', 'review', 'practice', 'assessment']).optional(),
        })).describe('偏好学习时间'),
        studyFrequency: z.enum(['daily', 'weekly', 'bi_weekly', 'monthly']).describe('学习频率'),
        sessionDuration: z.number().describe('单次学习时长（分钟）'),
      }).describe('学习计划'),
      currentProgress: z.object({
        completedObjectives: z.array(z.string()).optional(),
        overallProgress: z.number().min(0).max(1),
        timeSpent: z.number().describe('已用时间（小时）'),
        adherenceRate: z.number().min(0).max(1).describe('计划遵循率'),
      }).optional().describe('当前进度'),
    }).describe('学习计划'),
    userPreferences: z.object({
      reminderTypes: z.array(z.enum(['push', 'email', 'sms', 'in_app'])).describe('提醒类型'),
      reminderTiming: z.enum(['immediate', '15min_before', '1hour_before', '1day_before']).describe('提醒时机'),
      learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']).describe('学习风格'),
      motivationFactors: z.array(z.string()).optional().describe('激励因素'),
      stressTriggers: z.array(z.string()).optional().describe('压力触发器'),
    }).describe('用户偏好'),
    contextualFactors: z.object({
      timezone: z.string().describe('用户时区'),
      workSchedule: z.object({
        workDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])),
        workHours: z.object({
          start: z.string(),
          end: z.string(),
        }),
      }).optional().describe('工作时间'),
      lifeEvents: z.array(z.string()).optional().describe('生活事件'),
      healthConsiderations: z.array(z.string()).optional().describe('健康考虑'),
    }).describe('上下文因素'),
    behavioralPatterns: z.object({
      peakPerformanceHours: z.array(z.number()).optional().describe('最佳表现时间'),
      procrastinationPatterns: z.array(z.object({
        situation: z.string(),
        frequency: z.number(),
      })).optional().describe('拖延模式'),
      motivationFluctuations: z.array(z.object({
        timeOfDay: z.string(),
        motivationLevel: z.enum(['low', 'medium', 'high']),
      })).optional().describe('动机波动'),
    }).optional().describe('行为模式'),
  }),
  execute: async ({ userId, studyPlan, userPreferences, contextualFactors, behavioralPatterns }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 获取用户历史提醒设置和响应数据
    const { data: reminderHistory } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('setting_category', 'reminders')
      .eq('is_active', true)

    // 获取最近的学习活动和完成情况
    const { data: recentActivities } = await supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    // 获取组织设置和日历集成
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('setting_category', 'notifications')
      .eq('is_active', true)

    // 分析用户提醒响应模式
    const reminderResponsePattern = analyzeReminderResponsePattern(
      reminderHistory || [],
      recentActivities || []
    )

    const prompt = `作为学习提醒和時間管理专家，请基于以下信息创建个性化的学习提醒系统：

【学习计划】
${JSON.stringify(studyPlan, null, 2)}

【用户偏好】
${JSON.stringify(userPreferences, null, 2)}

【上下文因素】
${JSON.stringify(contextualFactors, null, 2)}

【行为模式】
${JSON.stringify(behavioralPatterns, null, 2)}

【提醒响应模式】
${JSON.stringify(reminderResponsePattern, null, 2)}

【提醒设计要求】
1. 基于用户生物节律和行为模式
2. 平衡提醒频率与避免打扰
3. 提供个性化激励和鼓励
4. 集成时间管理和生产力技巧
5. 支持渐进式习惯建立

请以JSON格式输出：
{
  "reminder_system": {
    "primary_reminders": [
      {
        "reminder_id": "提醒ID",
        "title": "提醒标题",
        "description": "提醒描述",
        "trigger_type": "schedule|milestone|behavior",
        "trigger_conditions": ["触发条件1", "触发条件2"],
        "delivery_methods": ["delivery_method1", "delivery_method2"],
        "timing": "timing_details",
        "content_personalization": "内容个性化"
      }
    ],
    "secondary_reminders": [
      {
        "reminder_id": "提醒ID",
        "title": "提醒标题",
        "trigger_type": "schedule|milestone|behavior",
        "purpose": "purpose_description",
        "urgency_level": "low|medium|high"
      }
    ]
  },
  "time_management_strategy": {
    "optimal_study_schedule": [
      {
        "day": "monday",
        "sessions": [
          {
            "start_time": "开始时间",
            "duration": "持续时间",
            "activity_type": "活动类型",
            "preparation_time": "准备时间",
            "recovery_time": "恢复时间"
          }
        ]
      }
    ],
    "productivity_techniques": [
      {
        "technique": "技巧名称",
        "description": "技巧描述",
        "implementation": "实施方法",
        "expected_benefits": ["预期收益1", "预期收益2"],
        "suitable_for": "适合场景"
      }
    ],
    "habit_building_plan": [
      {
        "habit": "习惯名称",
        "current_level": "current_level",
        "target_level": "target_level",
        "building_strategy": "建立策略",
        "milestone_rewards": ["里程碑奖励1", "里程碑奖励2"],
        "tracking_method": "跟踪方法"
      }
    ]
  },
  "motivation_support": {
    "motivational_triggers": [
      {
        "trigger": "激励触发器",
        "content": "激励内容",
        "delivery_method": "delivery_method",
        "timing": "时机",
        "expected_impact": "预期影响"
      }
    ],
    "encouragement_strategies": [
      {
        "strategy": "鼓励策略",
        "situation": "适用情况",
        "implementation": "实施方法",
        "success_indicators": ["成功指标1", "成功指标2"]
      }
    ],
    "stress_management": [
      {
        "technique": "技巧名称",
        "description": "技巧描述",
        "when_to_use": "使用时机",
        "implementation_steps": ["步骤1", "步骤2"]
      }
    ]
  },
  "adaptive_reminders": [
    {
      "scenario": "场景描述",
      "adaptation_type": "adaptation_type",
      "trigger_conditions": ["触发条件1", "触发条件2"],
      "adaptation_response": "适配响应",
      "learning_feedback_integration": "学习反馈整合"
    }
  ],
  "progress_milestones": [
    {
      "milestone": "里程碑",
      "target_date": "目标日期",
      "success_criteria": ["成功标准1", "成功标准2"],
      "celebration_plan": "庆祝计划",
      "next_phase_preparation": "下一阶段准备"
    }
  ],
  "implementation_roadmap": {
    "week_1_focus": ["第1周重点1", "第1周重点2"],
    "month_1_goals": ["第1月目标1", "第1月目标2"],
    "quarterly_objectives": ["季度目标1", "季度目标2"],
    "long_term_vision": "长期愿景"
  },
  "monitoring_and_optimization": {
    "key_metrics": ["关键指标1", "关键指标2"],
    "adjustment_triggers": ["调整触发器1", "调整触发器2"],
    "optimization_schedule": "优化安排",
    "success_evaluation_criteria": ["成功评估标准1", "成功评估标准2"]
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.5,
        maxOutputTokens: 3200,
      })

      const aiData = extractJson(aiResponse)

      // 生成具体的提醒配置
      const reminderConfigs = generateReminderConfigs(
        aiData.reminder_system,
        userPreferences,
        contextualFactors
      )

      // 计算提醒系统的有效性预测
      const reminderEffectiveness = calculateReminderEffectiveness(
        userPreferences,
        behavioralPatterns,
        aiData.reminder_system
      )

      return {
        success: true,
        message: '学习提醒系统创建完成',
        data: {
          reminder_system: aiData.reminder_system,
          time_management_strategy: aiData.time_management_strategy,
          motivation_support: aiData.motivation_support,
          adaptive_reminders: aiData.adaptive_reminders,
          progress_milestones: aiData.progress_milestones,
          implementation_roadmap: aiData.implementation_roadmap,
          monitoring_and_optimization: aiData.monitoring_and_optimization,
          reminder_configs: reminderConfigs,
          reminder_effectiveness: reminderEffectiveness,
          reminder_metadata: {
            user_id: userId,
            plan_complexity: calculatePlanComplexity(studyPlan),
            personalization_level: calculatePersonalizationLevel(userPreferences, behavioralPatterns),
            expected_adherence: reminderEffectiveness.predicted_adherence_rate,
            creation_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`学习提醒创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

// 辅助函数

function buildComprehensiveProfile(userProfile: any, userSettings: any[], behaviorHistory: any, learningEvents: any[]) {
  const profile = {
    demographics: userProfile?.demographics || {},
    learningPreferences: userProfile?.learningPreferences || {},
    skillProfile: userProfile?.skillProfile || {},
    settings: userSettings.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {}),
    behaviorHistory: behaviorHistory || {},
    learningEvents: learningEvents || [],
  }

  // 从学习事件中提取行为模式
  let activityPatterns: any = {}
  if (learningEvents.length > 0) {
    activityPatterns = learningEvents.reduce((acc: any, event: any) => {
      const hour = new Date(event.created_at).getHours()
      acc.preferredHours = acc.preferredHours || {}
      acc.preferredHours[hour] = (acc.preferredHours[hour] || 0) + 1
      return acc
    }, {})
  }

  (profile as any).behaviorPatterns = activityPatterns

  return profile
}

function filterRecommendationsByType(recommendations: any, requestedTypes: string[] | undefined) {
  if (!requestedTypes) return recommendations

  const filtered: any = {}
  requestedTypes.forEach(type => {
    if (recommendations[type]) {
      filtered[type] = recommendations[type]
    }
  })

  return filtered
}

function calculateRecommendationDiversity(recommendations: any) {
  const allRecommendations = Object.values(recommendations).flat() as any[]
  const typeCount = new Set(allRecommendations.map(r => r.type || r.activityType || r.resourceType)).size
  const totalCount = allRecommendations.length

  return totalCount > 0 ? typeCount / totalCount : 0
}

function calculateProfileCompleteness(profile: any) {
  let completeness = 0
  let maxScore = 0

  // 人口统计信息 (20%)
  maxScore += 20
  if (profile.demographics && Object.keys(profile.demographics).length > 0) {
    completeness += 20
  }

  // 学习偏好 (25%)
  maxScore += 25
  if (profile.learningPreferences && Object.keys(profile.learningPreferences).length > 0) {
    completeness += 25
  }

  // 技能画像 (25%)
  maxScore += 25
  if (profile.skillProfile && Object.keys(profile.skillProfile).length > 0) {
    completeness += 25
  }

  // 行为历史 (20%)
  maxScore += 20
  if (profile.behaviorHistory && Object.keys(profile.behaviorHistory).length > 0) {
    completeness += 20
  }

  // 学习事件 (10%)
  maxScore += 10
  if (profile.learningEvents && profile.learningEvents.length > 0) {
    completeness += Math.min(profile.learningEvents.length / 50 * 10, 10)
  }

  return completeness / maxScore
}

function generateImplementationGuidance(aiData: any) {
  return {
    immediate_actions: aiData.learning_journey?.immediate_next_steps || [],
    priority_focus: aiData.personalization_insights?.slice(0, 3) || [],
    success_metrics: aiData.recommendation_confidence?.confidence_factors || [],
    review_schedule: '建议每2周评估一次推荐效果并调整策略',
  }
}

function analyzeLearningPattern(learningEvents: any[], assessmentData: any[]) {
  const pattern = {
    completion_rate: 0,
    average_session_time: 0,
    preferred_activities: [] as string[],
    difficulty_preference: 'moderate',
    consistency_score: 0,
  }

  if (learningEvents.length > 0) {
    // 计算完成率
    const completedEvents = learningEvents.filter(e => e.event_type === 'activity_completed')
    pattern.completion_rate = completedEvents.length / learningEvents.length

    // 分析偏好活动
    const activityCounts = learningEvents.reduce((acc: any, event: any) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {})
    pattern.preferred_activities = Object.entries(activityCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([activity]) => activity as string)
  }

  if (assessmentData.length > 0) {
    // 分析难度偏好
    const difficultyScores = assessmentData
      .filter(s => s.score && s.assignment_id)
      .map(s => ({
        difficulty: s.assignment_id.includes('hard') ? 'hard' : s.score > 0.8 ? 'easy' : 'moderate',
        score: s.score
      }))

    if (difficultyScores.length > 0) {
      const avgScoreByDifficulty = difficultyScores.reduce((acc: any, item: any) => {
        acc[item.difficulty] = acc[item.difficulty] || []
        acc[item.difficulty].push(item.score)
        return acc
      }, {})

      const difficultyAverages = Object.entries(avgScoreByDifficulty).map(([diff, scores]) => ({
        difficulty: diff,
        average: (scores as number[]).reduce((sum, score) => sum + score, 0) / (scores as number[]).length
      }))

      const bestDifficulty = difficultyAverages.sort((a, b) => b.average - a.average)[0]
      pattern.difficulty_preference = bestDifficulty?.difficulty || 'moderate'
    }
  }

  return pattern
}

function generateAdaptedContentConfig(content: any, aiData: any, userCapabilityProfile: any, constraints: any) {
  const config = {
    base_content: content,
    adaptations: aiData.content_modifications,
    scaffolding: aiData.scaffolding_strategies,
    adaptive_elements: aiData.adaptive_elements,
    personalization: aiData.personalization_factors,
    alternative_versions: aiData.alternative_versions,
    implementation_status: 'ready_for_implementation',
    monitoring_requirements: aiData.adaptive_elements?.map((element: any) => element.monitoring_metrics) || [],
  }

  return config
}

function calculateAdaptationEffectiveness(userCapabilityProfile: any, difficultyAssessment: any, learningPattern: any) {
  let effectivenessScore = 0.5

  // 基于用户能力与难度匹配度
  const capabilityAverage = Object.values(userCapabilityProfile.skillLevels).reduce((sum: number, level: any) => sum + level, 0) / Object.keys(userCapabilityProfile.skillLevels).length
  const difficultyMapping = { beginner: 1, intermediate: 2, advanced: 3 }
  const currentDifficultyLevel = difficultyMapping[difficultyAssessment.current_appropriateness === 'too_easy' ? 'beginner' :
                                                               difficultyAssessment.current_appropriateness === 'too_hard' ? 'advanced' : 'intermediate']

  const difficultyMatch = 1 - Math.abs(capabilityAverage - currentDifficultyLevel) / 3
  effectivenessScore += difficultyMatch * 0.3

  // 基于学习模式一致性
  if (learningPattern.completion_rate > 0.8) effectivenessScore += 0.2
  if (learningPattern.consistency_score > 0.7) effectivenessScore += 0.2

  return {
    effectiveness_score: Math.min(effectivenessScore, 1.0),
    improvement_score: effectivenessScore - 0.5,
    key_factors: [
      '用户能力与内容难度匹配度',
      '学习模式一致性',
      '个性化适配策略',
    ],
  }
}

function calculateAdaptationComplexity(aiData: any) {
  let complexity = 0

  complexity += aiData.content_modifications?.length * 0.2 || 0
  complexity += aiData.scaffolding_strategies?.length * 0.25 || 0
  complexity += aiData.adaptive_elements?.length * 0.3 || 0
  complexity += aiData.alternative_versions?.length * 0.15 || 0

  return Math.min(complexity, 1.0)
}

function analyzeReminderResponsePattern(reminderHistory: any[], recentActivities: any[]) {
  const pattern = {
    response_rate: 0.5,
    preferred_timing: 'afternoon',
    effective_reminder_types: [] as string[],
    procrastination_triggers: [] as string[],
    motivation_peaks: [] as string[],
  }

  if (recentActivities.length > 0) {
    // 分析活动时间和响应模式
    const hourlyActivity = recentActivities.reduce((acc: any, activity: any) => {
      const hour = new Date(activity.created_at).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {})

    const peakHours = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))

    pattern.preferred_timing = peakHours.length > 0 ?
      (peakHours[0] < 12 ? 'morning' : peakHours[0] < 18 ? 'afternoon' : 'evening') : 'afternoon'
  }

  return pattern
}

function generateReminderConfigs(reminderSystem: any, userPreferences: any, contextualFactors: any) {
  const configs: any[] = []

  // 生成主要提醒配置
  reminderSystem.primary_reminders?.forEach((reminder: any) => {
    configs.push({
      reminder_id: reminder.reminder_id,
      user_id: '', // 将在调用时设置
      reminder_type: reminder.trigger_type,
      title: reminder.title,
      description: reminder.description,
      delivery_methods: reminder.delivery_methods,
      trigger_conditions: reminder.trigger_conditions,
      timing_config: reminder.timing,
      is_active: true,
      created_at: new Date().toISOString(),
    })
  })

  return configs
}

function calculateReminderEffectiveness(userPreferences: any, behavioralPatterns: any, reminderSystem: any) {
  let effectiveness = 0.5

  // 基于用户偏好匹配度
  const preferenceMatch = userPreferences.reminderTypes?.length || 1
  effectiveness += Math.min(preferenceMatch / 3, 0.2)

  // 基于行为模式适配度
  if (behavioralPatterns?.peakPerformanceHours?.length > 0) {
    effectiveness += 0.15
  }

  // 基于提醒系统设计质量
  if (reminderSystem.primary_reminders?.length >= 3) {
    effectiveness += 0.15
  }

  return {
    effectiveness_score: Math.min(effectiveness, 1.0),
    predicted_adherence_rate: effectiveness * 0.8,
    key_success_factors: [
      '提醒时机匹配用户生物节律',
      '多渠道提醒确保触达',
      '个性化内容提升参与度',
    ],
  }
}

function calculatePlanComplexity(studyPlan: any) {
  let complexity = 0

  complexity += (studyPlan.learningObjectives?.length || 0) * 0.2
  complexity += (studyPlan.schedule?.preferredStudyTimes?.length || 0) * 0.15
  complexity += studyPlan.schedule?.sessionDuration ? Math.min(studyPlan.schedule.sessionDuration / 120, 1) * 0.3 : 0

  return Math.min(complexity, 1.0)
}

function calculatePersonalizationLevel(userPreferences: any, behavioralPatterns: any) {
  let personalization = 0

  personalization += (userPreferences.reminderTypes?.length || 0) * 0.2
  personalization += (behavioralPatterns?.peakPerformanceHours?.length || 0) * 0.3
  personalization += (behavioralPatterns?.motivationFluctuations?.length || 0) * 0.25
  personalization += (userPreferences.motivationFactors?.length || 0) * 0.25

  return Math.min(personalization, 1.0)
}

/**
 * 个性化建议工具集合
 */
export const personalizationTools = {
  generatePersonalizedRecommendations: generatePersonalizedRecommendationsTool,
  adaptContentDifficulty: adaptContentDifficultyTool,
  createStudyReminders: createStudyRemindersTool,
}
