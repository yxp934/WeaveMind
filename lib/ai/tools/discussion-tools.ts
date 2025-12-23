/**
 * Phase 6: AI Discussion Management Tools
 *
 * 高级讨论管理工具，包括话题创建、参与度分析和内容审核
 * 集成到现有AI系统中，支持智能讨论引导和优化
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
 * Tool 1: create_discussion_thread
 * 创建新的讨论主题，自动生成引导问题和讨论规则
 */
export const createDiscussionThreadTool = tool({
  description: '创建新的讨论主题，自动生成讨论引导问题和设置讨论规则',
  inputSchema: z.object({
    classId: z.string().describe('班级ID'),
    courseId: z.string().optional().describe('课程ID（可选）'),
    title: z.string().describe('讨论主题标题'),
    description: z.string().optional().describe('讨论主题描述'),
    tags: z.array(z.string()).optional().describe('讨论标签'),
    type: z.enum(['general', 'course', 'assignment', 'announcement']).default('general'),
    targetAudience: z.string().optional().describe('目标受众'),
    difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('难度级别'),
  }),
  execute: async ({ classId, courseId, title, description, tags = [], type, targetAudience, difficultyLevel }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 获取班级和课程信息
    const { data: classData } = await supabase
      .from('classes')
      .select('organization_id, name')
      .eq('id', classId)
      .single()

    let courseData = null
    if (courseId) {
      const { data } = await supabase
        .from('courses')
        .select('title, description, requirements')
        .eq('id', courseId)
        .single()
      courseData = data
    }

    // 使用AI生成讨论引导问题和规则
    const prompt = `你是一位经验丰富的教学设计师。请为以下讨论主题生成引导问题和讨论规则：

【讨论主题】
标题：${title}
描述：${description || '无'}
类型：${type}
目标受众：${targetAudience || '所有学生'}
难度级别：${difficultyLevel || '中等'}
${courseData ? `课程信息：${courseData.title} - ${courseData.description || '无描述'}` : ''}

【要求】
1. 生成5-7个引导性问题，促进深度思考和讨论
2. 制定3-5条讨论规则，确保讨论质量和尊重
3. 提供讨论建议，帮助学生更好地参与

请以JSON格式输出：
{
  "guidance_questions": [
    {
      "question": "问题内容",
      "type": "open_ended|reflective|analytical|creative",
      "expected_duration": "预计讨论时间",
      "follow_up_questions": ["后续问题1", "后续问题2"]
    }
  ],
  "discussion_rules": [
    {
      "rule": "规则描述",
      "rationale": "制定理由",
      "examples": ["例子1", "例子2"]
    }
  ],
  "discussion_tips": [
    {
      "tip": "建议内容",
      "context": "适用场景"
    }
  ]
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.7,
        maxOutputTokens: 1500,
      })

      const aiData = extractJson(aiResponse)

      // 创建讨论主题
      const { data: thread, error } = await supabase
        .from('discussion_threads')
        .insert({
          class_id: classId,
          course_id: courseId,
          organization_id: classData?.organization_id,
          title,
          description: description || '',
          type,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          metadata: {
            guidance_questions: aiData.guidance_questions,
            discussion_rules: aiData.discussion_rules,
            discussion_tips: aiData.discussion_tips,
            tags,
            target_audience: targetAudience,
            difficulty_level: difficultyLevel,
          },
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: '讨论主题创建成功，AI已生成引导问题和建议',
        data: {
          thread,
          ai_generated_content: aiData,
        },
      }
    } catch (error) {
      // 如果AI生成失败，创建基本讨论主题
      const { data: thread, error: createError } = await supabase
        .from('discussion_threads')
        .insert({
          class_id: classId,
          course_id: courseId,
          organization_id: classData?.organization_id,
          title,
          description: description || '',
          type,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          metadata: {
            tags,
            target_audience: targetAudience,
            difficulty_level: difficultyLevel,
          },
        })
        .select()
        .single()

      if (createError) throw createError

      return {
        success: true,
        message: '讨论主题创建成功（使用基础设置）',
        data: {
          thread,
          ai_generated_content: null,
        },
      }
    }
  },
})

/**
 * Tool 2: suggest_discussion_topics
 * 基于课程内容智能建议讨论话题
 */
export const suggestDiscussionTopicsTool = tool({
  description: '基于课程内容智能生成相关的讨论话题',
  inputSchema: z.object({
    courseId: z.string().describe('课程ID'),
    targetAudience: z.string().describe('目标受众'),
    topicCount: z.number().min(1).max(10).default(5).describe('建议话题数量'),
    focusAreas: z.array(z.string()).optional().describe('关注领域'),
    difficultyRange: z.object({
      min: z.number().min(1).max(5).default(1),
      max: z.number().min(1).max(5).default(5),
    }).optional().describe('难度范围'),
  }),
  execute: async ({ courseId, targetAudience, topicCount, focusAreas, difficultyRange }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 获取课程内容
    const { data: course } = await supabase
      .from('courses')
      .select(`
        id, title, description, requirements,
        chapters (
          id, title, description, order_index,
          components (id, type, content, order_index)
        )
      `)
      .eq('id', courseId)
      .single()

    if (!course) {
      throw new Error('课程未找到')
    }

    // 构建课程内容摘要
    const contentSummary = course.chapters?.map((chapter: any) => ({
      title: chapter.title,
      description: chapter.description,
      components: chapter.components?.map((comp: any) => ({
        type: comp.type,
        content: comp.content,
      })) || [],
    })) || []

    const prompt = `你是一位教学设计专家。基于以下课程内容，为目标受众"${targetAudience}"生成${topicCount}个高质量的讨论话题：

【课程信息】
标题：${course.title}
描述：${course.description || '无'}
需求：${JSON.stringify(course.requirements, null, 2)}

【课程内容】
${JSON.stringify(contentSummary, null, 2)}

${focusAreas ? `【关注领域】\n${focusAreas.join(', ')}` : ''}
${difficultyRange ? `【难度范围】\n${difficultyRange.min} - ${difficultyRange.max}` : ''}

【要求】
1. 话题应该促进深度思考和批判性思维
2. 适合目标受众的知识水平和兴趣
3. 能够引发多样化的观点和讨论
4. 与课程内容紧密相关
5. 具有实际应用价值

请以JSON格式输出：
{
  "topics": [
    {
      "title": "话题标题",
      "description": "话题描述",
      "category": "理论讨论|实践应用|案例分析|创新思维|批判性思考",
      "difficulty_level": 1-5,
      "estimated_duration": "预计讨论时间",
      "learning_objectives": ["目标1", "目标2"],
      "starter_questions": ["引导问题1", "引导问题2"],
      "potential_outcomes": ["预期结果1", "预期结果2"],
      "related_chapters": ["相关章节1", "相关章节2"]
    }
  ],
  "implementation_suggestions": {
    "discussion_format": "建议的讨论形式",
    "time_allocation": "时间分配建议",
    "facilitation_tips": "引导技巧"
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.8,
        maxOutputTokens: 2000,
      })

      const aiData = extractJson(aiResponse)

      return {
        success: true,
        message: `成功生成${aiData.topics.length}个讨论话题建议`,
        data: {
          topics: aiData.topics,
          implementation_suggestions: aiData.implementation_suggestions,
          course_info: {
            id: course.id,
            title: course.title,
            chapter_count: course.chapters?.length || 0,
          },
        },
      }
    } catch (error) {
      throw new Error(`AI话题生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },
})

/**
 * Tool 3: analyze_discussion_engagement
 * 分析讨论参与度，生成改进建议
 */
export const analyzeDiscussionEngagementTool = tool({
  description: '分析讨论参与度，生成参与度报告和改进建议',
  inputSchema: z.object({
    threadId: z.string().describe('讨论主题ID'),
    timeRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional().describe('时间范围'),
    includeAnonymous: z.boolean().default(true).describe('是否包含匿名用户'),
    analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed').describe('分析深度'),
  }),
  execute: async ({ threadId, timeRange, includeAnonymous, analysisDepth }) => {
    const supabase = createAdminClient()
    // 使用全局统一的 openai 客户端

    // 获取讨论主题信息
    const { data: thread } = await supabase
      .from('discussion_threads')
      .select(`
        *,
        classes(name, organization_id),
        courses(title)
      `)
      .eq('id', threadId)
      .single()

    if (!thread) {
      throw new Error('讨论主题未找到')
    }

    // 构建查询条件
    let postsQuery = supabase
      .from('discussion_posts')
      .select(`
        *,
        users(email, raw_user_meta_data),
        discussion_posts!parent_post_id(id, content, created_at)
      `)
      .eq('thread_id', threadId)

    if (timeRange) {
      postsQuery = postsQuery
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)
    }

    const { data: posts } = await postsQuery.order('created_at', { ascending: true })

    // 获取参与统计
    const { data: participants } = await supabase
      .from('discussion_participants')
      .select(`
        *,
        users(email, raw_user_meta_data)
      `)
      .eq('thread_id', threadId)

    if (!posts || posts.length === 0) {
      return {
        success: true,
        message: '指定时间范围内没有帖子数据',
        data: {
          thread_info: thread,
          engagement_metrics: {
            total_posts: 0,
            unique_participants: 0,
            average_posts_per_user: 0,
            engagement_rate: 0,
          },
          recommendations: ['暂无足够数据进行分析，建议增加讨论活动'],
        },
      }
    }

    // 计算基础指标
    const totalPosts = posts.length
    const uniqueParticipants = new Set(posts.map(p => p.user_id)).size
    const averagePostsPerUser = totalPosts / uniqueParticipants
    const totalParticipants = participants?.length || 0
    const engagementRate = totalParticipants > 0 ? (uniqueParticipants / totalParticipants) * 100 : 0

    // 分析用户行为模式
    const userActivity = posts.reduce((acc: any, post) => {
      const userId = post.user_id
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          post_count: 0,
          first_post_time: post.created_at,
          last_post_time: post.created_at,
          total_words: 0,
          has_replies: false,
          reply_count: 0,
        }
      }

      acc[userId].post_count++
      acc[userId].last_post_time = post.created_at
      acc[userId].total_words += post.content?.length || 0

      if (post.parent_post_id) {
        acc[userId].has_replies = true
        acc[userId].reply_count++
      }

      return acc
    }, {})

    // 时间分析
    const timeAnalysis = posts.reduce((acc: any, post) => {
      const hour = new Date(post.created_at).getHours()
      if (!acc[hour]) {
        acc[hour] = 0
      }
      acc[hour]++
      return acc
    }, {})

    // 构建AI分析提示
    const analysisData = {
      thread_info: {
        title: thread.title,
        type: thread.type,
        course_title: thread.courses?.title,
        class_name: thread.classes?.name,
        total_posts: totalPosts,
        unique_participants: uniqueParticipants,
        total_participants: totalParticipants,
        engagement_rate: engagementRate,
        average_posts_per_user: averagePostsPerUser,
      },
      user_activity: Object.values(userActivity),
      time_distribution: timeAnalysis,
      post_types: posts.reduce((acc: any, post) => {
        const type = post.post_type || 'text'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {}),
      recent_posts: posts.slice(-10).map(p => ({
        content: p.content?.substring(0, 200) + '...',
        created_at: p.created_at,
        has_replies: !!p.parent_post_id,
      })),
    }

    const prompt = `作为教育数据分析专家，请分析以下讨论参与度数据并提供改进建议：

【讨论信息】
${JSON.stringify(analysisData.thread_info, null, 2)}

【用户活动数据】
${JSON.stringify(analysisData.user_activity.slice(0, 10), null, 2)}

【时间分布】
${JSON.stringify(analysisData.time_distribution, null, 2)}

【分析深度】${analysisDepth}

请基于${analysisDepth}级别提供：
1. 参与度评估（1-10分）
2. 关键发现和趋势
3. 问题和挑战识别
4. 具体改进建议
5. 行动计划

请以JSON格式输出：
{
  "engagement_score": 1-10,
  "key_findings": [
    {
      "finding": "发现内容",
      "impact": "影响程度",
      "evidence": "支持证据"
    }
  ],
  "challenges_identified": [
    {
      "challenge": "挑战描述",
      "severity": "low|medium|high",
      "possible_causes": ["原因1", "原因2"]
    }
  ],
  "recommendations": [
    {
      "recommendation": "建议内容",
      "priority": "high|medium|low",
      "expected_impact": "预期影响",
      "implementation_steps": ["步骤1", "步骤2"],
      "timeline": "实施时间"
    }
  ],
  "action_plan": {
    "immediate_actions": ["立即行动1", "立即行动2"],
    "short_term_goals": ["短期目标1", "短期目标2"],
    "long_term_objectives": ["长期目标1", "长期目标2"]
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.3,
        maxOutputTokens: 1500,
      })

      const aiData = extractJson(aiResponse)

      return {
        success: true,
        message: '讨论参与度分析完成',
        data: {
          thread_info: thread,
          engagement_metrics: {
            total_posts: totalPosts,
            unique_participants: uniqueParticipants,
            total_participants: totalParticipants,
            engagement_rate: engagementRate,
            average_posts_per_user: averagePostsPerUser,
            engagement_score: aiData.engagement_score,
          },
          analysis: aiData,
          raw_data: {
            user_activity_count: Object.keys(userActivity).length,
            time_range_analyzed: timeRange || '全部时间',
            post_types: analysisData.post_types,
          },
        },
      }
    } catch (error) {
      // 如果AI分析失败，返回基础分析
      return {
        success: true,
        message: '基础分析完成（AI详细分析暂时不可用）',
        data: {
          thread_info: thread,
          engagement_metrics: {
            total_posts: totalPosts,
            unique_participants: uniqueParticipants,
            total_participants: totalParticipants,
            engagement_rate: engagementRate,
            average_posts_per_user: averagePostsPerUser,
            engagement_score: engagementRate > 70 ? 8 : engagementRate > 50 ? 6 : 4,
          },
          analysis: {
            key_findings: [
              {
                finding: `当前参与率为${engagementRate.toFixed(1)}%`,
                impact: engagementRate > 70 ? 'high' : engagementRate > 50 ? 'medium' : 'low',
                evidence: `${uniqueParticipants}人参与，共${totalPosts}个帖子`,
              },
            ],
            recommendations: [
              {
                recommendation: '增加互动引导和提示',
                priority: 'high',
                expected_impact: '提高参与度',
                implementation_steps: ['发布引导问题', '定期回复学生帖子'],
                timeline: '1周内',
              },
            ],
          },
        },
      }
    }
  },
})

/**
 * Tool 4: moderate_discussion_content
 * 智能内容审核和优化建议
 */
export const moderateDiscussionContentTool = tool({
  description: '智能审核讨论内容，检测不当内容并提供改进建议',
  inputSchema: z.object({
    content: z.string().describe('待审核的内容'),
    context: z.object({
      threadId: z.string().optional().describe('讨论主题ID'),
      postType: z.enum(['text', 'markdown', 'code']).default('text'),
      userRole: z.enum(['student', 'teacher', 'admin']).describe('用户角色'),
      courseLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('课程级别'),
    }).describe('内容上下文'),
    moderationLevel: z.enum(['basic', 'strict', 'custom']).default('basic').describe('审核级别'),
    customRules: z.array(z.string()).optional().describe('自定义审核规则'),
  }),
  execute: async ({ content, context, moderationLevel, customRules }) => {
    // 使用全局统一的 openai 客户端

    // 构建审核提示
    let prompt = `作为内容审核专家，请对以下讨论内容进行审核：

【待审核内容】
${content}

【上下文信息】
讨论主题ID：${context.threadId || '未提供'}
内容类型：${context.postType}
用户角色：${context.userRole}
课程级别：${context.courseLevel || '未指定'}
审核级别：${moderationLevel}

【审核要求】
1. 检测不当内容（仇恨言论、骚扰、垃圾信息等）
2. 评估内容质量和相关性
3. 检查语言规范和礼貌性
4. 识别可能的改进建议

${customRules ? `【自定义规则】\n${customRules.join('\n')}` : ''}`

    if (moderationLevel === 'strict') {
      prompt += `\n【严格审核标准】
- 严格检查所有可能冒犯的内容
- 关注文化敏感性和包容性
- 强制语言规范检查`
    }

    prompt += `\n请以JSON格式输出审核结果：
{
  "moderation_result": {
    "status": "approved|flagged|rejected",
    "confidence": 0.0-1.0,
    "risk_level": "low|medium|high"
  },
  "content_analysis": {
    "language_quality": "excellent|good|fair|poor",
    "relevance": "high|medium|low",
    "constructiveness": "high|medium|low",
    "clarity": "clear|unclear",
    "tone": "positive|neutral|negative"
  },
  "issues_detected": [
    {
      "issue": "问题描述",
      "severity": "minor|major|critical",
      "category": "language|safety|relevance|quality",
      "suggested_action": "建议处理方式"
    }
  ],
  "improvement_suggestions": [
    {
      "suggestion": "改进建议",
      "category": "content|language|structure",
      "priority": "high|medium|low",
      "example": "具体示例"
    }
  ],
  "alternative_phrasing": [
    {
      "original": "原始内容",
      "improved": "改进版本",
      "reason": "改进原因"
    }
  ],
  "educational_value": {
    "learning_relevance": "high|medium|low",
    "discussion_enhancement": "high|medium|low",
    "peer_learning_potential": "high|medium|low"
  }
}`

    try {
      const { text: aiResponse } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.2,
        maxOutputTokens: 1200,
      })

      const aiData = extractJson(aiResponse)

      // 根据审核结果确定最终状态
      const { status, risk_level } = aiData.moderation_result
      const hasCriticalIssues = aiData.issues_detected?.some((issue: any) => issue.severity === 'critical')
      const hasMajorIssues = aiData.issues_detected?.some((issue: any) => issue.severity === 'major')

      let finalStatus = status
      if (hasCriticalIssues) {
        finalStatus = 'rejected'
      } else if (hasMajorIssues && moderationLevel === 'strict') {
        finalStatus = 'flagged'
      }

      // 记录审核日志（如果提供了threadId）
      if (context.threadId) {
        try {
          const supabase = createAdminClient()
          await supabase
            .from('discussion_moderation_logs')
            .insert({
              thread_id: context.threadId,
              content_hash: Buffer.from(content).toString('base64'),
              moderation_result: aiData.moderation_result,
              issues_detected: aiData.issues_detected,
              final_status: finalStatus,
              created_at: new Date().toISOString(),
            })
        } catch (error) {
          // 忽略日志记录错误
          console.warn('Failed to log moderation:', error)
        }
      }

      return {
        success: true,
        message: '内容审核完成',
        data: {
          moderation_result: {
            ...aiData.moderation_result,
            final_status: finalStatus,
          },
          content_analysis: aiData.content_analysis,
          issues_detected: aiData.issues_detected || [],
          improvement_suggestions: aiData.improvement_suggestions || [],
          alternative_phrasing: aiData.alternative_phrasing || [],
          educational_value: aiData.educational_value,
          processing_info: {
            moderation_level: moderationLevel,
            user_role: context.userRole,
            timestamp: new Date().toISOString(),
          },
        },
      }
    } catch (error) {
      // 如果AI审核失败，返回基础审核结果
      const basicChecks = {
        contains_profanity: /[脏话|垃圾|傻瓜]/i.test(content),
        too_short: content.length < 10,
        too_long: content.length > 5000,
        has_spam: /(.)\1{4,}/.test(content),
      }

      const issues = []
      if (basicChecks.contains_profanity) {
        issues.push({
          issue: '检测到不当语言',
          severity: 'major' as const,
          category: 'safety' as const,
          suggested_action: '建议修改语言',
        })
      }
      if (basicChecks.too_short) {
        issues.push({
          issue: '内容过短，可能缺乏价值',
          severity: 'minor' as const,
          category: 'quality' as const,
          suggested_action: '建议补充更多内容',
        })
      }
      if (basicChecks.too_long) {
        issues.push({
          issue: '内容过长，可能影响阅读',
          severity: 'minor' as const,
          category: 'quality' as const,
          suggested_action: '建议分段或总结要点',
        })
      }
      if (basicChecks.has_spam) {
        issues.push({
          issue: '检测到重复字符，可能为垃圾信息',
          severity: 'major' as const,
          category: 'safety' as const,
          suggested_action: '建议检查并清理',
        })
      }

      return {
        success: true,
        message: '基础内容审核完成',
        data: {
          moderation_result: {
            status: issues.some(i => i.severity === 'major') ? 'flagged' : 'approved',
            confidence: 0.6,
            risk_level: issues.some(i => i.severity === 'major') ? 'medium' : 'low',
            final_status: issues.some(i => i.severity === 'major') ? 'flagged' : 'approved',
          },
          content_analysis: {
            language_quality: basicChecks.contains_profanity ? 'poor' : 'good',
            relevance: 'unknown',
            constructiveness: 'unknown',
            clarity: basicChecks.too_short ? 'unclear' : 'clear',
            tone: 'neutral',
          },
          issues_detected: issues,
          improvement_suggestions: [
            {
              suggestion: '请确保内容尊重他人且具有建设性',
              category: 'content',
              priority: 'high',
              example: '使用积极、建设性的语言',
            },
          ],
          alternative_phrasing: [],
          educational_value: {
            learning_relevance: 'unknown',
            discussion_enhancement: 'unknown',
            peer_learning_potential: 'unknown',
          },
          processing_info: {
            moderation_level: 'basic_fallback',
            user_role: context.userRole,
            timestamp: new Date().toISOString(),
          },
        },
      }
    }
  },
})

/**
 * 讨论管理工具集合
 */
export const discussionManagementTools = {
  createDiscussionThread: createDiscussionThreadTool,
  suggestDiscussionTopics: suggestDiscussionTopicsTool,
  analyzeDiscussionEngagement: analyzeDiscussionEngagementTool,
  moderateDiscussionContent: moderateDiscussionContentTool,
}
