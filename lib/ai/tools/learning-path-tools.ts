/**
 * Phase 6: AI Learning Path Tools
 *
 * 高级学习路径工具，包括路径创建、进度优化、资源推荐和效率分析
 * 基于学习科学原理提供个性化学习路径管理
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'
const MODEL_NAME = 'meituan/longcat-flash-chat'

function ensureGatewayClient() {
  const gatewayKey = process.env.VERCEL_GATEWAY_KEY
  if (!gatewayKey) {
    throw new Error('AI Gateway not configured (VERCEL_GATEWAY_KEY missing)')
  }
  return createOpenAI({ apiKey: gatewayKey, baseURL: GATEWAY_BASE_URL })
}

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
 * Tool 9: create_learning_pathway
 * 创建个性化学习路径
 */
export const createLearningPathwayTool = tool({
  description: '基于学习目标、先修知识和可用时间自动生成个性化学习路径',
  inputSchema: z.object({
    userId: z.string().describe('用户ID'),
    learningObjectives: z.array(z.object({
      objective: z.string().describe('学习目标'),
      priority: z.enum(['high', 'medium', 'low']),
      targetCompletionDate: z.string().datetime().optional(),
      successCriteria: z.array(z.string()).optional().describe('成功标准'),
    })).describe('学习目标'),
    prerequisiteKnowledge: z.array(z.object({
      topic: z.string().describe('主题'),
      proficiencyLevel: z.enum(['none', 'basic', 'intermediate', 'advanced']),
      lastStudied: z.string().datetime().optional(),
    })).describe('先修知识'),
    availableTime: z.object({
      dailyHours: z.number().min(0).max(24),
      weeklyDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])),
      sessionPreference: z.enum(['short', 'medium', 'long']).default('medium'),
      flexibility: z.enum(['fixed', 'flexible', 'very_flexible']).default('flexible'),
    }).describe('可用时间'),
    learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading', 'mixed']).optional().describe('学习风格'),
    constraints: z.object({
      maxDuration: z.number().optional().describe('最大持续时间（天）'),
      budget: z.number().optional().describe('预算限制'),
      equipmentAccess: z.array(z.string()).optional().describe('可用设备'),
      language: z.string().optional().describe('学习语言'),
    }).optional().describe('约束条件'),
  }),
  execute: async ({ userId, learningObjectives, prerequisiteKnowledge, availableTime, learningStyle, constraints }) => {
    const supabase = createAdminClient()
    const openai = ensureGatewayClient()

    // 获取用户历史学习数据
    const { data: userHistory } = await supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // 最近90天
      .order('created_at', { ascending: false })

    // 获取可用的课程资源
    const { data: availableCourses } = await supabase
      .from('courses')
      .select(`
        id, title, description, difficulty_level, estimated_duration,
        chapters (id, title, description, order_index),
        requirements
      `)
      .eq('is_published', true)

    // 分析用户学习能力
    const learningCapacity = analyzeUserLearningCapacity(userHistory || [], prerequisiteKnowledge)

    const prompt = `作为学习路径设计专家，请基于以下信息创建个性化学习路径：

【用户信息】
用户ID：${userId}
学习风格：${learningStyle || '未指定'}

【学习目标】
${JSON.stringify(learningObjectives, null, 2)}

【先修知识】
${JSON.stringify(prerequisiteKnowledge, null, 2)}

【可用时间】
${JSON.stringify(availableTime, null, 2)}

【约束条件】
${JSON.stringify(constraints, null, 2)}

【学习能力分析】
${JSON.stringify(learningCapacity, null, 2)}

【可用课程资源】
${JSON.stringify(availableCourses?.slice(0, 10), null, 2)}

【路径设计要求】
1. 基于学习科学原理设计
2. 考虑认知负荷和记忆曲线
3. 提供多元化学习活动
4. 包含评估和反馈机制
5. 支持个性化调整

请以JSON格式输出：
{
  "pathway_overview": {
    "title": "路径标题",
    "description": "路径描述",
    "total_duration": "总持续时间",
    "difficulty_progression": "难度进展",
    "success_probability": 0.0-1.0
  },
  "learning_phases": [
    {
      "phase_id": "阶段ID",
      "title": "阶段标题",
      "description": "阶段描述",
      "objectives": ["阶段目标1", "阶段目标2"],
      "estimated_duration": "预计时间",
      "difficulty_level": "难度级别",
      "prerequisites": ["先修要求1", "先修要求2"],
      "activities": [
        {
          "activity_id": "活动ID",
          "type": "activity_type",
          "title": "活动标题",
          "description": "活动描述",
          "estimated_duration": "预计时长",
          "resources_required": ["所需资源1", "所需资源2"],
          "assessment_criteria": ["评估标准1", "评估标准2"]
        }
      ]
    }
  ],
  "resource_mapping": [
    {
      "objective": "学习目标",
      "recommended_courses": ["推荐课程1", "推荐课程2"],
      "supplementary_resources": ["补充资源1", "补充资源2"],
      "practice_activities": ["练习活动1", "练习活动2"]
    }
  ],
  "schedule_template": {
    "weekly_schedule": [
      {
        "day": "monday",
        "sessions": [
          {
            "start_time": "开始时间",
            "duration": "持续时间",
            "activity_type": "活动类型",
            "focus_area": "重点领域"
          }
        ]
      }
    ],
    "milestone_dates": [
      {
        "milestone": "里程碑",
        "target_date": "目标日期",
        "success_criteria": ["成功标准1", "成功标准2"]
      }
    ]
  },
  "adaptation_strategies": [
    {
      "scenario": "场景描述",
      "triggers": ["触发条件1", "触发条件2"],
      "adaptations": ["适应策略1", "适应策略2"],
      "success_metrics": ["成功指标1", "成功指标2"]
    }
  ],
  "progress_tracking": {
    "key_metrics": ["关键指标1", "关键指标2"],
    "checkpoints": [
      {
        "checkpoint": "检查点",
        "frequency": "检查频率",
        "evaluation_method": "评估方法",
        "success_threshold": "成功阈值"
      }
    ],
    "adjustment_triggers": ["调整触发器1", "调整触发器2"]
  },
  "motivational_elements": [
    {
      "element": "激励元素",
      "implementation": "实施方法",
      "expected_impact": "预期影响",
      "timing": "时机"
    }
  ]
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai(MODEL_NAME),
        prompt,
        temperature: 0.6,
        maxTokens: 3000,
      })

      const aiData = extractJson(aiResponse)

      // 创建学习路径记录
      const { data: pathway, error } = await supabase
        .from('self_learner_pathways')
        .insert({
          user_id: userId,
          title: aiData.pathway_overview.title,
          description: aiData.pathway_overview.description,
          total_duration: aiData.pathway_overview.total_duration,
          difficulty_progression: aiData.pathway_overview.difficulty_progression,
          learning_phases: aiData.learning_phases,
          resource_mapping: aiData.resource_mapping,
          schedule_template: aiData.schedule_template,
          adaptation_strategies: aiData.adaptation_strategies,
          progress_tracking: aiData.progress_tracking,
          motivational_elements: aiData.motivational_elements,
          metadata: {
            learning_objectives: learningObjectives,
            prerequisite_knowledge: prerequisiteKnowledge,
            available_time: availableTime,
            learning_style: learningStyle,
            constraints: constraints,
            success_probability: aiData.pathway_overview.success_probability,
          },
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: '个性化学习路径创建成功',
        data: {
          pathway_id: pathway.id,
          pathway_overview: aiData.pathway_overview,
          learning_phases: aiData.learning_phases,
          resource_mapping: aiData.resource_mapping,
          schedule_template: aiData.schedule_template,
          adaptation_strategies: aiData.adaptation_strategies,
          progress_tracking: aiData.progress_tracking,
          motivational_elements: aiData.motivational_elements,
          implementation_recommendations: generateImplementationRecommendations(aiData),
          analysis_metadata: {
            user_id: userId,
            learning_capacity_score: learningCapacity.score,
            available_resources_count: availableCourses?.length || 0,
            pathway_complexity: calculatePathwayComplexity(aiData),
            creation_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`学习路径创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

/**
 * Tool 10: optimize_pathway_progress
 * 优化学习路径进度
 */
export const optimizePathwayProgressTool = tool({
  description: '分析当前学习路径进度，提供进度优化和调整建议',
  inputSchema: z.object({
    pathwayId: z.string().describe('学习路径ID'),
    userId: z.string().describe('用户ID'),
    currentProgress: z.object({
      completedActivities: z.array(z.object({
        activityId: z.string(),
        completedAt: z.string().datetime(),
        timeSpent: z.number().optional(),
        performanceScore: z.number().optional(),
        difficulties: z.array(z.string()).optional(),
      })).describe('已完成活动'),
      currentPhase: z.string().describe('当前阶段'),
      overallProgress: z.number().min(0).max(1).describe('总体进度'),
      timeSpent: z.number().describe('总用时（小时）'),
      adherenceRate: z.number().min(0).max(1).describe('计划遵循率'),
    }).describe('当前进度'),
    challenges: z.array(z.object({
      challenge: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      duration: z.number().describe('持续时间（天）'),
      impact: z.enum(['minimal', 'moderate', 'significant']),
    })).optional().describe('遇到的挑战'),
    preferences: z.object({
      pacePreference: z.enum(['slower', 'current', 'faster']).optional(),
      difficultyPreference: z.enum(['easier', 'maintain', 'more_challenging']).optional(),
      focusAreas: z.array(z.string()).optional(),
    }).optional().describe('用户偏好变化'),
  }),
  execute: async ({ pathwayId, userId, currentProgress, challenges, preferences }) => {
    const supabase = createAdminClient()
    const openai = ensureGatewayClient()

    // 获取原始路径信息
    const { data: pathway } = await supabase
      .from('self_learner_pathways')
      .select('*')
      .eq('id', pathwayId)
      .eq('user_id', userId)
      .single()

    if (!pathway) {
      throw new Error('学习路径未找到')
    }

    // 获取相关学习事件
    const { data: recentEvents } = await supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    // 分析进度模式
    const progressAnalysis = analyzeProgressPatterns(currentProgress, recentEvents || [])

    const prompt = `作为学习进度优化专家，请分析以下学习路径进度并提供优化建议：

【路径信息】
路径ID：${pathwayId}
路径标题：${pathway.title}
当前阶段：${currentProgress.currentPhase}

【当前进度】
${JSON.stringify(currentProgress, null, 2)}

【进度分析】
${JSON.stringify(progressAnalysis, null, 2)}

${challenges ? `【遇到的挑战】\n${JSON.stringify(challenges, null, 2)}` : '无重大挑战'}
${preferences ? `【偏好变化】\n${JSON.stringify(preferences, null, 2)}` : '无偏好变化'}

【原始路径结构】
${JSON.stringify({
  phases: pathway.learning_phases,
  schedule: pathway.schedule_template,
  adaptation_strategies: pathway.adaptation_strategies,
}, null, 2)}

【优化要求】
1. 识别进度瓶颈和优化机会
2. 提供个性化调整建议
3. 重新平衡学习负担
4. 优化时间分配和难度
5. 增强学习动机和参与度

请以JSON格式输出：
{
  "progress_assessment": {
    "overall_health": "excellent|good|fair|poor",
    "pace_appropriateness": "too_slow|appropriate|too_fast",
    "engagement_level": "high|medium|low",
    "completion_probability": 0.0-1.0,
    "key_strengths": ["优势1", "优势2"],
    "improvement_areas": ["改进领域1", "改进领域2"]
  },
  "optimization_recommendations": [
    {
      "category": "优化类别",
      "current_issue": "当前问题",
      "recommended_change": "建议修改",
      "expected_impact": "预期影响",
      "implementation_priority": "high|medium|low",
      "implementation_steps": ["步骤1", "步骤2"],
      "success_metrics": ["成功指标1", "成功指标2"]
    }
  ],
  "schedule_adjustments": {
    "revised_timeline": [
      {
        "phase": "阶段名称",
        "original_duration": "原始时长",
        "revised_duration": "修订时长",
        "adjusted_activities": ["调整活动1", "调整活动2"],
        "rationale": "调整理由"
      }
    ],
    "priority_rebalancing": [
      {
        "activity": "活动名称",
        "current_priority": "当前优先级",
        "revised_priority": "修订优先级",
        "reason": "调整原因"
      }
    ],
    "resource_reallocation": [
      {
        "area": "资源领域",
        "current_allocation": "当前分配",
        "recommended_allocation": "推荐分配",
        "justification": "理由说明"
      }
    ]
  },
  "difficulty_adjustments": [
    {
      "component": "组件名称",
      "current_difficulty": "当前难度",
      "adjusted_difficulty": "调整后难度",
      "adjustment_reason": "调整原因",
      "support_strategies": ["支持策略1", "支持策略2"]
    }
  ],
  "motivational_interventions": [
    {
      "strategy": "激励策略",
      "target_issue": "目标问题",
      "implementation": "实施方法",
      "expected_outcome": "预期结果",
      "timeline": "实施时间"
    }
  ],
  "risk_mitigation": [
    {
      "risk": "风险描述",
      "probability": "low|medium|high",
      "impact": "影响程度",
      "mitigation_plan": "缓解计划",
      "monitoring_indicators": ["监控指标1", "监控指标2"]
    }
  ],
  "success_prediction": {
    "completion_likelihood": 0.0-1.0,
    "time_to_completion": "预计完成时间",
    "quality_score": 1-10,
    "confidence_factors": ["信心因素1", "信心因素2"]
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai(MODEL_NAME),
        prompt,
        temperature: 0.4,
        maxTokens: 2500,
      })

      const aiData = extractJson(aiResponse)

      // 更新学习路径的优化建议
      const { data: updatedPathway, error } = await supabase
        .from('self_learner_pathways')
        .update({
          progress_tracking: {
            ...pathway.progress_tracking,
            optimization_recommendations: aiData.optimization_recommendations,
            last_optimization: new Date().toISOString(),
          },
          metadata: {
            ...pathway.metadata,
            last_progress_analysis: new Date().toISOString(),
            optimization_applied: true,
          },
        })
        .eq('id', pathwayId)
        .select()
        .single()

      if (error) throw error

      // 记录进度优化活动
      await supabase
        .from('self_learner_activities')
        .insert({
          pathway_id: pathwayId,
          user_id: userId,
          activity_type: 'progress_optimization',
          description: '学习路径进度优化',
          metadata: {
            optimization_recommendations: aiData.optimization_recommendations,
            schedule_adjustments: aiData.schedule_adjustments,
            difficulty_adjustments: aiData.difficulty_adjustments,
            progress_assessment: aiData.progress_assessment,
          },
          created_at: new Date().toISOString(),
        })

      return {
        success: true,
        message: '学习路径进度优化完成',
        data: {
          pathway_id: pathwayId,
          progress_assessment: aiData.progress_assessment,
          optimization_recommendations: aiData.optimization_recommendations,
          schedule_adjustments: aiData.schedule_adjustments,
          difficulty_adjustments: aiData.difficulty_adjustments,
          motivational_interventions: aiData.motivational_interventions,
          risk_mitigation: aiData.risk_mitigation,
          success_prediction: aiData.success_prediction,
          implementation_roadmap: createImplementationRoadmap(aiData),
          analysis_metadata: {
            user_id: userId,
            current_progress_percentage: currentProgress.overallProgress * 100,
            challenges_count: challenges?.length || 0,
            optimization_complexity: calculateOptimizationComplexity(aiData),
            analysis_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`路径进度优化失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

/**
 * Tool 11: suggest_learning_resources
 * 学习资源推荐
 */
export const suggestLearningResourcesTool = tool({
  description: '基于学习主题和难度级别智能推荐相关学习资源',
  inputSchema: z.object({
    learningTopic: z.string().describe('学习主题'),
    currentLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe('当前水平'),
    targetLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe('目标水平'),
    learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading', 'mixed']).optional().describe('学习风格'),
    timeAvailable: z.object({
      totalHours: z.number().describe('可用总时间'),
      sessionLength: z.number().describe('单次学习时长'),
      frequency: z.enum(['daily', 'weekly', 'bi_weekly', 'monthly']).describe('学习频率'),
    }).describe('时间安排'),
    resourceTypes: z.array(z.enum(['video', 'article', 'interactive', 'book', 'course', 'exercise', 'simulation'])).optional().describe('偏好资源类型'),
    constraints: z.object({
      language: z.string().optional().describe('语言偏好'),
      accessibility: z.array(z.string()).optional().describe('无障碍需求'),
      technologyRequirements: z.array(z.string()).optional().describe('技术要求'),
      budget: z.enum(['free', 'low_cost', 'premium']).optional().describe('预算考虑'),
    }).optional().describe('约束条件'),
  }),
  execute: async ({ learningTopic, currentLevel, targetLevel, learningStyle, timeAvailable, resourceTypes, constraints }) => {
    const supabase = createAdminClient()
    const openai = ensureGatewayClient()

    // 搜索相关的现有课程资源
    const { data: existingCourses } = await supabase
      .from('courses')
      .select(`
        id, title, description, difficulty_level, estimated_duration,
        chapters (id, title, description),
        components (id, type, content)
      `)
      .or(`title.ilike.%${learningTopic}%,description.ilike.%${learningTopic}%`)
      .eq('is_published', true)

    // 搜索相关的学习材料和文件
    const { data: learningFiles } = await supabase
      .from('files')
      .select(`
        id, filename, file_path, file_type, file_size,
        courses(title)
      `)
      .or(`filename.ilike.%${learningTopic}%,metadata->>description.ilike.%${learningTopic}%`)

    const prompt = `作为学习资源专家，请为以下学习需求推荐优质资源：

【学习需求】
主题：${learningTopic}
当前水平：${currentLevel}
目标水平：${targetLevel}
学习风格：${learningStyle || '未指定'}

【时间安排】
${JSON.stringify(timeAvailable, null, 2)}

【资源偏好】
${resourceTypes ? resourceTypes.join(', ') : '无特定偏好'}

【约束条件】
${JSON.stringify(constraints, null, 2)}

【现有资源】
课程：${existingCourses?.length || 0}个相关课程
文件：${learningFiles?.length || 0}个相关文件

【推荐要求】
1. 基于学习科学原理排序
2. 考虑认知负荷和记忆曲线
3. 提供多元化学习体验
4. 支持个性化学习路径
5. 确保资源质量和相关性

请以JSON格式输出：
{
  "resource_recommendations": [
    {
      "resource_id": "资源ID",
      "title": "资源标题",
      "type": "资源类型",
      "description": "资源描述",
      "difficulty_match": "难度匹配度",
      "relevance_score": 0.0-1.0,
      "estimated_time": "预计时间",
      "learning_objectives": ["学习目标1", "学习目标2"],
      "prerequisites": ["先修要求1", "先修要求2"],
      "accessibility_features": ["无障碍功能1", "无障碍功能2"],
      "cost": "free|low_cost|premium",
      "rating": 1-5,
      "review_summary": "评价摘要"
    }
  ],
  "learning_sequence": [
    {
      "sequence_order": 1,
      "resource_id": "资源ID",
      "phase": "学习阶段",
      "rationale": "排序理由",
      "expected_outcomes": ["预期结果1", "预期结果2"]
    }
  ],
  "resource_categories": {
    "core_resources": ["核心资源1", "核心资源2"],
    "supplementary_resources": ["补充资源1", "补充资源2"],
    "practice_resources": ["练习资源1", "练习资源2"],
    "assessment_resources": ["评估资源1", "评估资源2"]
  },
  "alternative_pathways": [
    {
      "pathway_name": "路径名称",
      "description": "路径描述",
      "resource_sequence": ["资源序列1", "资源序列2"],
      "target_audience": "目标受众",
      "estimated_completion": "预计完成时间"
    }
  ],
  "integration_strategies": [
    {
      "strategy": "整合策略",
      "description": "策略描述",
      "implementation": "实施方法",
      "expected_benefits": ["预期收益1", "预期收益2"]
    }
  ],
  "quality_assurance": {
    "resource_evaluation_criteria": ["评估标准1", "评估标准2"],
    "reliability_indicators": ["可靠性指标1", "可靠性指标2"],
    "update_frequency": "更新频率",
    "user_feedback_integration": "用户反馈整合方式"
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai(MODEL_NAME),
        prompt,
        temperature: 0.5,
        maxTokens: 2200,
      })

      const aiData = extractJson(aiResponse)

      // 匹配现有资源
      const matchedResources = matchExistingResources(
        aiData.resource_recommendations,
        existingCourses || [],
        learningFiles || []
      )

      return {
        success: true,
        message: '学习资源推荐完成',
        data: {
          resource_recommendations: aiData.resource_recommendations,
          learning_sequence: aiData.learning_sequence,
          resource_categories: aiData.resource_categories,
          alternative_pathways: aiData.alternative_pathways,
          integration_strategies: aiData.integration_strategies,
          quality_assurance: aiData.quality_assurance,
          matched_existing_resources: matchedResources,
          recommendation_metadata: {
            learning_topic: learningTopic,
            difficulty_progression: `${currentLevel} → ${targetLevel}`,
            learning_style: learningStyle,
            time_constraints: timeAvailable,
            resource_diversity_score: calculateResourceDiversity(aiData.resource_recommendations),
            recommendation_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`学习资源推荐失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

/**
 * Tool 12: analyze_learning_efficiency
 * 学习效率分析
 */
export const analyzeLearningEfficiencyTool = tool({
  description: '分析学习活动数据和时间记录，评估学习效率并提供改进建议',
  inputSchema: z.object({
    userId: z.string().describe('用户ID'),
    timeRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).describe('分析时间范围'),
    learningActivities: z.array(z.object({
      activityId: z.string(),
      activityType: z.string(),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      duration: z.number().describe('学习时长（分钟）'),
      focusLevel: z.enum(['high', 'medium', 'low']),
      interruptions: z.number().default(0),
      outcome: z.object({
        completed: z.boolean(),
        comprehensionScore: z.number().optional(),
        retentionScore: z.number().optional(),
        satisfactionRating: z.number().optional(),
      }).optional(),
      context: z.object({
        environment: z.string().optional(),
        toolsUsed: z.array(z.string()).optional(),
        resourceType: z.string().optional(),
      }).optional(),
    })).describe('学习活动数据'),
    performanceMetrics: z.object({
      quizScores: z.array(z.number()).optional(),
      assignmentGrades: z.array(z.number()).optional(),
      completionRates: z.array(z.number()).optional(),
      timeToMastery: z.array(z.number()).optional(),
    }).optional().describe('性能指标'),
  }),
  execute: async ({ userId, timeRange, learningActivities, performanceMetrics }) => {
    const supabase = createAdminClient()
    const openai = ensureGatewayClient()

    // 获取补充的学习事件数据
    const { data: learningEvents } = await supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end)
      .order('created_at', { ascending: true })

    // 获取用户设置信息
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('setting_category', 'learning')
      .eq('is_active', true)

    // 综合分析数据
    const combinedActivities = mergeActivityData(learningActivities, learningEvents || [])

    // 计算效率指标
    const efficiencyMetrics = calculateEfficiencyMetrics(combinedActivities, performanceMetrics)

    const prompt = `作为学习效率分析专家，请深入分析以下学习数据并提供优化建议：

【分析范围】
用户ID：${userId}
时间范围：${timeRange.start} 至 ${timeRange.end}
分析活动数：${combinedActivities.length}

【学习活动数据】
${JSON.stringify(combinedActivities.slice(0, 20), null, 2)}

【性能指标】
${JSON.stringify(performanceMetrics, null, 2)}

【用户设置偏好】
${JSON.stringify(userSettings?.slice(0, 10), null, 2)}

【效率指标】
${JSON.stringify(efficiencyMetrics, null, 2)}

【分析要求】
1. 识别高效和低效的学习模式
2. 分析时间利用效率
3. 评估学习质量与效率的关系
4. 提供个性化改进建议
5. 预测效率提升潜力

请以JSON格式输出：
{
  "efficiency_overview": {
    "overall_efficiency_score": 1-10,
    "time_utilization_rate": 0.0-1.0,
    "learning_productivity": 1-10,
    "focus_consistency": 0.0-1.0,
    "efficiency_trend": "improving|stable|declining"
  },
  "time_analysis": {
    "optimal_session_length": "最佳会话时长",
    "peak_performance_hours": ["高峰表现时间1", "高峰表现时间2"],
    "interruption_impact": "中断影响分析",
    "break_effectiveness": "休息效果评估",
    "time_waste_patterns": ["时间浪费模式1", "时间浪费模式2"]
  },
  "learning_patterns": {
    "most_efficient_activities": ["最高效活动1", "最高效活动2"],
    "least_efficient_activities": ["最低效活动1", "最低效活动2"],
    "optimal_sequence": ["最佳序列1", "最佳序列2"],
    "fatigue_patterns": "疲劳模式分析",
    "motivation_correlation": "动机相关性分析"
  },
  "quality_efficiency_relationship": {
    "high_quality_high_efficiency": "高质量高效率比例",
    "quality_vs_time_correlation": "质量与时间相关性",
    "sweet_spot_identification": "最佳平衡点识别",
    "diminishing_returns_analysis": "收益递减分析"
  },
  "environmental_factors": {
    "optimal_conditions": "最优条件",
    "productivity_killers": ["效率杀手1", "效率杀手2"],
    "context_dependencies": ["上下文依赖1", "上下文依赖2"],
    "tool_effectiveness": "工具效果评估"
  },
  "improvement_recommendations": [
    {
      "category": "改进类别",
      "current_efficiency": "当前效率",
      "target_efficiency": "目标效率",
      "strategies": ["策略1", "策略2"],
      "implementation_priority": "high|medium|low",
      "expected_improvement": "预期改进",
      "implementation_timeline": "实施时间线"
    }
  ],
  "personalized_optimizations": [
    {
      "optimization": "个性化优化",
      "rationale": "优化理由",
      "customization_level": "high|medium|low",
      "success_probability": 0.0-1.0,
      "monitoring_approach": "监控方法"
    }
  ],
  "predictive_insights": {
    "efficiency_forecast": "效率预测",
    "improvement_trajectory": "改进轨迹",
    "potential_challenges": ["潜在挑战1", "潜在挑战2"],
    "success_factors": ["成功因素1", "成功因素2"]
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai(MODEL_NAME),
        prompt,
        temperature: 0.3,
        maxTokens: 2800,
      })

      const aiData = extractJson(aiResponse)

      // 记录效率分析结果
      await supabase
        .from('self_learner_activities')
        .insert({
          pathway_id: null, // 效率分析可能不关联特定路径
          user_id: userId,
          activity_type: 'efficiency_analysis',
          description: '学习效率分析',
          metadata: {
            time_range: timeRange,
            efficiency_overview: aiData.efficiency_overview,
            improvement_recommendations: aiData.improvement_recommendations,
            personalized_optimizations: aiData.personalized_optimizations,
            analysis_timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        })

      return {
        success: true,
        message: '学习效率分析完成',
        data: {
          efficiency_overview: aiData.efficiency_overview,
          time_analysis: aiData.time_analysis,
          learning_patterns: aiData.learning_patterns,
          quality_efficiency_relationship: aiData.quality_efficiency_relationship,
          environmental_factors: aiData.environmental_factors,
          improvement_recommendations: aiData.improvement_recommendations,
          personalized_optimizations: aiData.personalized_optimizations,
          predictive_insights: aiData.predictive_insights,
          efficiency_metrics: efficiencyMetrics,
          analysis_metadata: {
            user_id: userId,
            time_range: timeRange,
            activities_analyzed: combinedActivities.length,
            analysis_depth: 'comprehensive',
            efficiency_score: aiData.efficiency_overview.overall_efficiency_score,
            analysis_timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      throw new Error(`学习效率分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

// 辅助函数

function analyzeUserLearningCapacity(userHistory: any[], prerequisiteKnowledge: any[]) {
  const capacity = {
    score: 0.5,
    strengths: [] as string[],
    areas_for_improvement: [] as string[],
    learning_velocity: 'moderate',
    retention_rate: 0.5,
  }

  if (userHistory.length > 0) {
    // 分析学习历史
    const completedActivities = userHistory.filter(h => h.event_type === 'activity_completed')
    const completionRate = completedActivities.length / userHistory.length
    capacity.score = Math.min(completionRate * 1.2, 1.0) // 标准化到0-1

    // 分析学习速度
    const recentActivities = userHistory.slice(0, 20) // 最近20个活动
    if (recentActivities.length >= 5) {
      const timeSpan = new Date(recentActivities[0].created_at).getTime() - new Date(recentActivities[recentActivities.length - 1].created_at).getTime()
      const activitiesPerDay = recentActivities.length / (timeSpan / (1000 * 60 * 60 * 24))

      if (activitiesPerDay > 5) capacity.learning_velocity = 'fast'
      else if (activitiesPerDay < 1) capacity.learning_velocity = 'slow'
    }
  }

  return capacity
}

function generateImplementationRecommendations(aiData: any) {
  const recommendations = []

  // 基于路径复杂度给出实施建议
  if (aiData.learning_phases.length > 5) {
    recommendations.push({
      type: 'complexity_management',
      recommendation: '建议分阶段实施，每完成2-3个阶段后进行进度评估和调整',
      priority: 'high',
    })
  }

  // 基于资源数量给出资源管理建议
  if (aiData.resource_mapping.length > 10) {
    recommendations.push({
      type: 'resource_optimization',
      recommendation: '建议优先使用核心资源，避免资源过载',
      priority: 'medium',
    })
  }

  return recommendations
}

function calculatePathwayComplexity(aiData: any) {
  let complexity = 0

  // 基于阶段数量
  complexity += aiData.learning_phases.length * 0.2

  // 基于活动数量
  const totalActivities = aiData.learning_phases.reduce((sum: number, phase: any) => sum + phase.activities.length, 0)
  complexity += totalActivities * 0.1

  // 基于适应策略数量
  complexity += aiData.adaptation_strategies.length * 0.3

  return Math.min(complexity, 1.0)
}

function analyzeProgressPatterns(currentProgress: any, recentEvents: any[]) {
  const patterns = {
    consistency_score: 0.5,
    momentum: 'stable',
    challenge_response: 'adaptive',
    time_efficiency: 'average',
  }

  // 计算一致性得分
  const completionIntervals = []
  for (let i = 1; i < currentProgress.completedActivities.length; i++) {
    const interval = new Date(currentProgress.completedActivities[i].completedAt).getTime() -
                   new Date(currentProgress.completedActivities[i-1].completedAt).getTime()
    completionIntervals.push(interval)
  }

  if (completionIntervals.length > 0) {
    const avgInterval = completionIntervals.reduce((sum, interval) => sum + interval, 0) / completionIntervals.length
    const variance = completionIntervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / completionIntervals.length
    const consistency = 1 / (1 + Math.sqrt(variance) / avgInterval)
    patterns.consistency_score = consistency
  }

  // 分析动力趋势
  const recentCompletions = currentProgress.completedActivities.slice(-5)
  if (recentCompletions.length >= 3) {
    const recentIntervals = []
    for (let i = 1; i < recentCompletions.length; i++) {
      const interval = new Date(recentCompletions[i].completedAt).getTime() -
                     new Date(recentCompletions[i-1].completedAt).getTime()
      recentIntervals.push(interval)
    }

    const recentAvg = recentIntervals.reduce((sum, interval) => sum + interval, 0) / recentIntervals.length
    if (recentAvg < avgInterval * 0.8) patterns.momentum = 'accelerating'
    else if (recentAvg > avgInterval * 1.2) patterns.momentum = 'decelerating'
  }

  return patterns
}

function calculateOptimizationComplexity(aiData: any) {
  let complexity = 0

  complexity += aiData.optimization_recommendations.length * 0.2
  complexity += aiData.schedule_adjustments.revised_timeline?.length * 0.15 || 0
  complexity += aiData.difficulty_adjustments?.length * 0.25 || 0
  complexity += aiData.motivational_interventions?.length * 0.3 || 0

  return Math.min(complexity, 1.0)
}

function createImplementationRoadmap(aiData: any) {
  const roadmap = {
    immediate_actions: aiData.optimization_recommendations
      .filter((rec: any) => rec.implementation_priority === 'high')
      .map((rec: any) => rec.implementation_steps),
    short_term_goals: aiData.schedule_adjustments?.revised_timeline?.slice(0, 3) || [],
    long_term_vision: aiData.success_prediction,
  }

  return roadmap
}

function matchExistingResources(recommendations: any[], existingCourses: any[], learningFiles: any[]) {
  const matched = {
    courses: [] as any[],
    files: [] as any[],
    external_resources: [] as any[],
  }

  recommendations.forEach(rec => {
    // 匹配 const course现有课程
   Match = existingCourses.find(course =>
      course.title.toLowerCase().includes(rec.title.toLowerCase()) ||
      rec.title.toLowerCase().includes(course.title.toLowerCase())
    )

    if (courseMatch) {
      matched.courses.push({
        ...rec,
        existing_course_id: courseMatch.id,
        existing_course_title: courseMatch.title,
      })
    } else {
      matched.external_resources.push(rec)
    }

    // 匹配现有文件
    const fileMatch = learningFiles.find(file =>
      file.filename.toLowerCase().includes(rec.title.toLowerCase())
    )

    if (fileMatch) {
      matched.files.push({
        ...rec,
        existing_file_id: fileMatch.id,
        existing_file_name: fileMatch.filename,
      })
    }
  })

  return matched
}

function calculateResourceDiversity(recommendations: any[]) {
  const typeCount = new Set(recommendations.map(r => r.type)).size
  const totalCount = recommendations.length
  return typeCount / totalCount
}

function mergeActivityData(providedActivities: any[], databaseEvents: any[]) {
  // 合并用户提供的数据和数据库事件
  const merged = [...providedActivities]

  // 将数据库事件转换为统一格式
  databaseEvents.forEach(event => {
    if (event.event_type && event.duration) {
      merged.push({
        activityId: event.id,
        activityType: event.event_type,
        startTime: event.created_at,
        endTime: event.created_at,
        duration: event.duration,
        focusLevel: 'medium', // 默认值
        interruptions: 0,
        outcome: {
          completed: event.event_type === 'activity_completed',
        },
      })
    }
  })

  return merged.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
}

function calculateEfficiencyMetrics(activities: any[], performanceMetrics: any) {
  const metrics = {
    average_session_duration: 0,
    completion_rate: 0,
    focus_score: 0,
    interruption_rate: 0,
    productivity_score: 0,
  }

  if (activities.length > 0) {
    // 计算平均会话时长
    const totalDuration = activities.reduce((sum, activity) => sum + activity.duration, 0)
    metrics.average_session_duration = totalDuration / activities.length

    // 计算完成率
    const completedActivities = activities.filter(activity =>
      activity.outcome?.completed === true
    ).length
    metrics.completion_rate = completedActivities / activities.length

    // 计算专注度得分
    const focusScores = activities.map(activity => {
      switch (activity.focusLevel) {
        case 'high': return 1.0
        case 'medium': return 0.6
        case 'low': return 0.3
        default: return 0.5
      }
    })
    metrics.focus_score = focusScores.reduce((sum, score) => sum + score, 0) / focusScores.length

    // 计算中断率
    const totalInterruptions = activities.reduce((sum, activity) => sum + activity.interruptions, 0)
    metrics.interruption_rate = activities.length > 0 ? totalInterruptions / activities.length : 0

    // 综合生产力得分
    metrics.productivity_score = (
      metrics.completion_rate * 0.4 +
      metrics.focus_score * 0.3 +
      (1 - metrics.interruption_rate) * 0.2 +
      Math.min(metrics.average_session_duration / 120, 1) * 0.1 // 标准化会话时长
    )
  }

  return metrics
}

/**
 * 学习路径工具集合
 */
export const learningPathTools = {
  createLearningPathway: createLearningPathwayTool,
  optimizePathwayProgress: optimizePathwayProgressTool,
  suggestLearningResources: suggestLearningResourcesTool,
  analyzeLearningEfficiency: analyzeLearningEfficiencyTool,
}
