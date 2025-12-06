/**
 * Phase 6: AI Tools Registry Initializer
 *
 * 工具注册表初始化脚本
 * 自动注册所有15个高级AI工具到注册表中
 */

import {
  toolRegistry,
  ToolCategory,
  ToolPriority,
  ToolStatus,
  AIToolDefinition,
} from './index'

// 导入所有工具模块
import {
  discussionManagementTools,
  settingsOptimizationTools,
  learningPathTools,
  personalizationTools,
} from './index'

/**
 * 工具定义配置
 */
const TOOL_DEFINITIONS: Array<{
  id: string
  name: string
  description: string
  category: ToolCategory
  priority: ToolPriority
  tool: any
  tags: string[]
  estimatedExecutionTime: number
  rateLimitPerMinute: number
  requiredPermissions: string[]
  dependencies: string[]
  metadata: {
    complexity: 'simple' | 'moderate' | 'complex' | 'advanced'
    useCases: string[]
    successMetrics: string[]
    failureRecovery: string[]
    cacheStrategy?: 'none' | 'short' | 'medium' | 'long'
  }
}> = [
  // 讨论管理工具 (4个)
  {
    id: 'create_discussion_thread',
    name: '创建讨论主题',
    description: '创建新的讨论主题，自动生成讨论引导问题和设置讨论规则',
    category: ToolCategory.DISCUSSION_MANAGEMENT,
    priority: ToolPriority.MEDIUM,
    tool: discussionManagementTools.createDiscussionThread,
    tags: ['discussion', 'creation', 'ai_guidance', 'engagement'],
    estimatedExecutionTime: 8000, // 8秒
    rateLimitPerMinute: 10,
    requiredPermissions: ['discussion:create', 'class:read'],
    dependencies: [],
    metadata: {
      complexity: 'moderate',
      useCases: ['课程讨论启动', '话题引导', '参与度提升'],
      successMetrics: ['生成质量', '引导问题相关性', '用户参与度'],
      failureRecovery: ['回退到基础创建', '手动引导问题设置'],
      cacheStrategy: 'short',
    },
  },
  {
    id: 'suggest_discussion_topics',
    name: '建议讨论话题',
    description: '基于课程内容智能生成相关的讨论话题',
    category: ToolCategory.DISCUSSION_MANAGEMENT,
    priority: ToolPriority.MEDIUM,
    tool: discussionManagementTools.suggestDiscussionTopics,
    tags: ['discussion', 'topic_suggestion', 'content_analysis', 'ai_generation'],
    estimatedExecutionTime: 6000, // 6秒
    rateLimitPerMinute: 15,
    requiredPermissions: ['course:read', 'discussion:read'],
    dependencies: [],
    metadata: {
      complexity: 'moderate',
      useCases: ['话题启发', '讨论准备', '课程丰富化'],
      successMetrics: ['话题相关性', '多样性', '参与度预测'],
      failureRecovery: ['基础话题库', '模板话题'],
      cacheStrategy: 'medium',
    },
  },
  {
    id: 'analyze_discussion_engagement',
    name: '分析讨论参与度',
    description: '分析讨论参与度，生成参与度报告和改进建议',
    category: ToolCategory.DISCUSSION_MANAGEMENT,
    priority: ToolPriority.HIGH,
    tool: discussionManagementTools.analyzeDiscussionEngagement,
    tags: ['discussion', 'analytics', 'engagement', 'reporting'],
    estimatedExecutionTime: 10000, // 10秒
    rateLimitPerMinute: 5,
    requiredPermissions: ['discussion:read', 'analytics:read'],
    dependencies: [],
    metadata: {
      complexity: 'complex',
      useCases: ['参与度监控', '教学优化', '学生支持'],
      successMetrics: ['参与度评分', '改进建议质量', '实施效果'],
      failureRecovery: ['基础统计报告', '手动分析'],
      cacheStrategy: 'long',
    },
  },
  {
    id: 'moderate_discussion_content',
    name: '审核讨论内容',
    description: '智能审核讨论内容，检测不当内容并提供改进建议',
    category: ToolCategory.DISCUSSION_MANAGEMENT,
    priority: ToolPriority.HIGH,
    tool: discussionManagementTools.moderateDiscussionContent,
    tags: ['moderation', 'content_safety', 'ai_filtering', 'quality_control'],
    estimatedExecutionTime: 3000, // 3秒
    rateLimitPerMinute: 30,
    requiredPermissions: ['discussion:moderate', 'content:analyze'],
    dependencies: [],
    metadata: {
      complexity: 'moderate',
      useCases: ['内容审核', '社区管理', '安全防护'],
      successMetrics: ['审核准确率', '误判率', '处理速度'],
      failureRecovery: ['基础关键词过滤', '人工审核'],
      cacheStrategy: 'none',
    },
  },

  // 设置优化工具 (4个)
  {
    id: 'optimize_user_settings',
    name: '优化用户设置',
    description: '基于用户行为数据优化设置，提供个性化设置建议和效率优化',
    category: ToolCategory.SETTINGS_OPTIMIZATION,
    priority: ToolPriority.MEDIUM,
    tool: settingsOptimizationTools.optimizeUserSettings,
    tags: ['settings', 'optimization', 'personalization', 'user_experience'],
    estimatedExecutionTime: 12000, // 12秒
    rateLimitPerMinute: 5,
    requiredPermissions: ['settings:read', 'settings:write', 'user:read'],
    dependencies: [],
    metadata: {
      complexity: 'complex',
      useCases: ['设置优化', '用户体验提升', '个性化定制'],
      successMetrics: ['优化效果', '用户满意度', '效率提升'],
      failureRecovery: ['默认设置', '手动优化'],
      cacheStrategy: 'long',
    },
  },
  {
    id: 'suggest_learning_preferences',
    name: '建议学习偏好',
    description: '基于学习历史和目标提供个性化学习路径建议',
    category: ToolCategory.SETTINGS_OPTIMIZATION,
    priority: ToolPriority.MEDIUM,
    tool: settingsOptimizationTools.suggestLearningPreferences,
    tags: ['learning', 'preferences', 'personalization', 'path_recommendation'],
    estimatedExecutionTime: 10000, // 10秒
    rateLimitPerMinute: 8,
    requiredPermissions: ['learning:read', 'settings:read'],
    dependencies: [],
    metadata: {
      complexity: 'moderate',
      useCases: ['学习路径优化', '个性化建议', '学习效果提升'],
      successMetrics: ['建议采纳率', '学习效果改善', '用户满意度'],
      failureRecovery: ['通用学习建议', '模板路径'],
      cacheStrategy: 'medium',
    },
  },
  {
    id: 'analyze_usage_patterns',
    name: '分析使用模式',
    description: '分析用户使用模式，生成使用报告和优化建议',
    category: ToolCategory.SETTINGS_OPTIMIZATION,
    priority: ToolPriority.HIGH,
    tool: settingsOptimizationTools.analyzeUsagePatterns,
    tags: ['analytics', 'usage_patterns', 'behavioral_analysis', 'optimization'],
    estimatedExecutionTime: 15000, // 15秒
    rateLimitPerMinute: 3,
    requiredPermissions: ['analytics:read', 'user:read', 'activity:read'],
    dependencies: [],
    metadata: {
      complexity: 'advanced',
      useCases: ['使用分析', '行为洞察', '产品优化'],
      successMetrics: ['分析深度', '洞察质量', '优化建议采纳率'],
      failureRecovery: ['基础统计', '手动分析'],
      cacheStrategy: 'long',
    },
  },
  {
    id: 'recommend_notification_settings',
    name: '推荐通知设置',
    description: '基于用户角色和活动类型智能推荐通知设置',
    category: ToolCategory.SETTINGS_OPTIMIZATION,
    priority: ToolPriority.LOW,
    tool: settingsOptimizationTools.recommendNotificationSettings,
    tags: ['notifications', 'settings', 'recommendations', 'user_preferences'],
    estimatedExecutionTime: 5000, // 5秒
    rateLimitPerMinute: 20,
    requiredPermissions: ['settings:read', 'settings:write', 'notifications:read'],
    dependencies: [],
    metadata: {
      complexity: 'simple',
      useCases: ['通知优化', '干扰管理', '用户偏好设置'],
      successMetrics: ['通知有效性', '用户满意度', '干扰减少'],
      failureRecovery: ['默认通知设置', '通用建议'],
      cacheStrategy: 'short',
    },
  },

  // 学习路径工具 (4个)
  {
    id: 'create_learning_pathway',
    name: '创建学习路径',
    description: '基于学习目标、先修知识和可用时间自动生成个性化学习路径',
    category: ToolCategory.LEARNING_PATH,
    priority: ToolPriority.HIGH,
    tool: learningPathTools.createLearningPathway,
    tags: ['learning_path', 'pathway_creation', 'personalization', 'ai_planning'],
    estimatedExecutionTime: 20000, // 20秒
    rateLimitPerMinute: 2,
    requiredPermissions: ['pathway:create', 'course:read', 'user:read'],
    dependencies: [],
    metadata: {
      complexity: 'advanced',
      useCases: ['学习路径规划', '个性化学习', '学习科学应用'],
      successMetrics: ['路径完成率', '学习效果', '用户满意度'],
      failureRecovery: ['模板路径', '手动规划'],
      cacheStrategy: 'long',
    },
  },
  {
    id: 'optimize_pathway_progress',
    name: '优化学习进度',
    description: '分析当前学习路径进度，提供进度优化和调整建议',
    category: ToolCategory.LEARNING_PATH,
    priority: ToolPriority.HIGH,
    tool: learningPathTools.optimizePathwayProgress,
    tags: ['learning_path', 'progress_optimization', 'adaptive_learning', 'performance'],
    estimatedExecutionTime: 18000, // 18秒
    rateLimitPerMinute: 3,
    requiredPermissions: ['pathway:read', 'pathway:write', 'analytics:read'],
    dependencies: ['create_learning_pathway'],
    metadata: {
      complexity: 'complex',
      useCases: ['进度监控', '路径调整', '学习优化'],
      successMetrics: ['优化效果', '完成率提升', '学习效率'],
      failureRecovery: ['基础进度报告', '手动调整'],
      cacheStrategy: 'medium',
    },
  },
  {
    id: 'suggest_learning_resources',
    name: '推荐学习资源',
    description: '基于学习主题和难度级别智能推荐相关学习资源',
    category: ToolCategory.LEARNING_PATH,
    priority: ToolPriority.MEDIUM,
    tool: learningPathTools.suggestLearningResources,
    tags: ['resources', 'recommendation', 'content_matching', 'learning_support'],
    estimatedExecutionTime: 8000, // 8秒
    rateLimitPerMinute: 12,
    requiredPermissions: ['course:read', 'resources:read', 'content:read'],
    dependencies: [],
    metadata: {
      complexity: 'moderate',
      useCases: ['资源推荐', '内容发现', '学习支持'],
      successMetrics: ['推荐相关性', '资源利用率', '学习效果'],
      failureRecovery: ['热门资源推荐', '基础资源列表'],
      cacheStrategy: 'medium',
    },
  },
  {
    id: 'analyze_learning_efficiency',
    name: '分析学习效率',
    description: '分析学习活动数据和时间记录，评估学习效率并提供改进建议',
    category: ToolCategory.LEARNING_PATH,
    priority: ToolPriority.HIGH,
    tool: learningPathTools.analyzeLearningEfficiency,
    tags: ['efficiency', 'performance_analysis', 'learning_analytics', 'optimization'],
    estimatedExecutionTime: 25000, // 25秒
    rateLimitPerMinute: 2,
    requiredPermissions: ['learning:read', 'analytics:read', 'user:read'],
    dependencies: [],
    metadata: {
      complexity: 'advanced',
      useCases: ['效率分析', '学习优化', '生产力提升'],
      successMetrics: ['效率评分', '改进建议质量', '实施效果'],
      failureRecovery: ['基础效率指标', '手动分析'],
      cacheStrategy: 'long',
    },
  },

  // 个性化建议工具 (3个)
  {
    id: 'generate_personalized_recommendations',
    name: '生成个性化推荐',
    description: '基于用户画像和历史行为生成个性化课程推荐和学习建议',
    category: ToolCategory.PERSONALIZATION,
    priority: ToolPriority.HIGH,
    tool: personalizationTools.generatePersonalizedRecommendations,
    tags: ['recommendations', 'personalization', 'ai_suggestions', 'user_profiling'],
    estimatedExecutionTime: 30000, // 30秒
    rateLimitPerMinute: 1,
    requiredPermissions: ['recommendations:read', 'user:read', 'course:read'],
    dependencies: [],
    metadata: {
      complexity: 'advanced',
      useCases: ['个性化推荐', '用户画像', '智能建议'],
      successMetrics: ['推荐质量', '点击率', '转化率'],
      failureRecovery: ['通用推荐', '热门内容'],
      cacheStrategy: 'long',
    },
  },
  {
    id: 'adapt_content_difficulty',
    name: '适配内容难度',
    description: '基于用户能力水平智能调整内容难度，提供个性化学习体验',
    category: ToolCategory.PERSONALIZATION,
    priority: ToolPriority.HIGH,
    tool: personalizationTools.adaptContentDifficulty,
    tags: ['difficulty_adaptation', 'personalized_learning', 'adaptive_content', 'user_ability'],
    estimatedExecutionTime: 15000, // 15秒
    rateLimitPerMinute: 5,
    requiredPermissions: ['content:read', 'content:write', 'user:read'],
    dependencies: [],
    metadata: {
      complexity: 'complex',
      useCases: ['难度适配', '个性化内容', '学习体验优化'],
      successMetrics: ['适配准确率', '学习效果', '用户满意度'],
      failureRecovery: ['固定难度内容', '手动调整'],
      cacheStrategy: 'medium',
    },
  },
  {
    id: 'create_study_reminders',
    name: '创建学习提醒',
    description: '基于学习计划和用户偏好创建智能学习提醒和時間管理建议',
    category: ToolCategory.PERSONALIZATION,
    priority: ToolPriority.MEDIUM,
    tool: personalizationTools.createStudyReminders,
    tags: ['reminders', 'time_management', 'study_planning', 'productivity'],
    estimatedExecutionTime: 10000, // 10秒
    rateLimitPerMinute: 8,
    requiredPermissions: ['reminders:create', 'schedule:read', 'user:read'],
    dependencies: [],
    metadata: {
      complexity: 'moderate',
      useCases: ['学习提醒', '时间管理', '习惯养成'],
      successMetrics: ['提醒效果', '完成率', '用户遵循度'],
      failureRecovery: ['基础提醒设置', '手动时间管理'],
      cacheStrategy: 'medium',
    },
  },
]

/**
 * 初始化工具注册表
 */
export function initializeToolRegistry(): void {
  console.log('🔧 Initializing AI Tools Registry...')

  // 注册所有工具
  TOOL_DEFINITIONS.forEach(toolDef => {
    const tool: AIToolDefinition = {
      id: toolDef.id,
      name: toolDef.name,
      description: toolDef.description,
      category: toolDef.category,
      priority: toolDef.priority,
      status: ToolStatus.ACTIVE,
      version: '1.0.0',
      author: 'WeaveMind AI Team',
      tags: toolDef.tags,
      parameters: {}, // 参数定义由工具本身处理
      execute: toolDef.tool,
      validate: (params: any) => {
        // 基础参数验证，实际验证由各个工具处理
        return params !== null && params !== undefined
      },
      estimatedExecutionTime: toolDef.estimatedExecutionTime,
      rateLimitPerMinute: toolDef.rateLimitPerMinute,
      requiredPermissions: toolDef.requiredPermissions,
      dependencies: toolDef.dependencies,
      metadata: toolDef.metadata,
    }

    toolRegistry.registerTool(tool)
    console.log(`✅ Registered tool: ${tool.name} (${tool.id})`)
  })

  // 输出注册统计
  const statistics = toolRegistry.getStatistics()
  console.log('\n📊 Tool Registry Statistics:')
  console.log(`   Total Tools: ${statistics.totalTools}`)
  console.log('   By Category:')
  statistics.toolsByCategory.forEach(({ category, count }) => {
    console.log(`     ${category}: ${count} tools`)
  })
  console.log('   By Priority:')
  statistics.toolsByPriority.forEach(({ priority, count }) => {
    console.log(`     ${priority}: ${count} tools`)
  })

  console.log('\n🎯 AI Tools Registry initialization completed!')
  console.log(`🚀 Ready to serve ${statistics.totalTools} advanced AI tools`)
}

/**
 * 验证工具注册
 */
export function validateToolRegistry(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // 检查每个工具
  TOOL_DEFINITIONS.forEach(toolDef => {
    const tool = toolRegistry.getTool(toolDef.id)

    if (!tool) {
      errors.push(`Tool ${toolDef.id} not registered`)
      return
    }

    // 检查依赖
    const deps = toolRegistry.checkDependencies(toolDef.id)
    if (!deps.satisfied) {
      errors.push(`Tool ${toolDef.id} missing dependencies: ${deps.missing.join(', ')}`)
    }

    // 检查执行时间合理性
    if (tool.estimatedExecutionTime > 60000) {
      warnings.push(`Tool ${toolDef.id} has very long execution time: ${tool.estimatedExecutionTime}ms`)
    }

    // 检查速率限制
    if (tool.rateLimitPerMinute > 100) {
      warnings.push(`Tool ${toolDef.id} has high rate limit: ${tool.rateLimitPerMinute}/min`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * 获取工具使用指南
 */
export function getToolUsageGuide(): string {
  const tools = toolRegistry.getAllTools()
  const categories = Object.values(ToolCategory)

  let guide = '# WeaveMind AI Tools Usage Guide\n\n'
  guide += `## Overview\n`
  guide += `This registry contains ${tools.length} advanced AI tools across ${categories.length} categories.\n\n`

  categories.forEach(category => {
    const categoryTools = toolRegistry.getToolsByCategory(category)
    guide += `## ${category.replace('_', ' ').toUpperCase()}\n\n`

    categoryTools.forEach(tool => {
      guide += `### ${tool.name}\n`
      guide += `**ID:** \`${tool.id}\`\n`
      guide += `**Priority:** ${tool.priority}\n`
      guide += `**Complexity:** ${tool.metadata.complexity}\n`
      guide += `**Description:** ${tool.description}\n`
      guide += `**Estimated Time:** ${tool.estimatedExecutionTime}ms\n`
      guide += `**Rate Limit:** ${tool.rateLimitPerMinute}/min\n`
      guide += `**Tags:** ${tool.tags.join(', ')}\n\n`

      guide += `**Use Cases:**\n`
      tool.metadata.useCases.forEach(useCase => {
        guide += `- ${useCase}\n`
      })
      guide += '\n'

      guide += `**Success Metrics:**\n`
      tool.metadata.successMetrics.forEach(metric => {
        guide += `- ${metric}\n`
      })
      guide += '\n'
    })
  })

  return guide
}

// 导出工具初始化函数
export default {
  initializeToolRegistry,
  validateToolRegistry,
  getToolUsageGuide,
}
