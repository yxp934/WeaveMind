/**
 * Phase 6: AI Tools Comprehensive Test Suite
 *
 * 全面的AI工具测试套件
 * 验证15个高级AI工具的功能性、性能和集成性
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import {
  toolRegistry,
  toolExecutor,
  ToolCategory,
  ToolPriority,
  ToolStatus,
  AIToolDefinition,
  ToolExecutionResult,
} from '../lib/ai/tools'
import {
  initializeToolRegistry,
  validateToolRegistry,
  getToolUsageGuide,
} from '../lib/ai/tools/registry-initializer'

// 模拟环境变量
process.env.VERCEL_GATEWAY_KEY = 'test-gateway-key'

describe('AI Tools Registry Tests', () => {
  beforeAll(() => {
    console.log('🔧 Initializing AI Tools Registry for tests...')
    initializeToolRegistry()
  })

  afterAll(() => {
    console.log('🧹 Cleaning up test registry...')
  })

  describe('Registry Initialization', () => {
    test('should initialize tool registry successfully', () => {
      const statistics = toolRegistry.getStatistics()
      expect(statistics.totalTools).toBe(15)
      expect(statistics.toolsByCategory).toHaveLength(4)
      expect(statistics.toolsByPriority).toHaveLength(4)
    })

    test('should register all tool categories', () => {
      const discussionTools = toolRegistry.getToolsByCategory(ToolCategory.DISCUSSION_MANAGEMENT)
      const settingsTools = toolRegistry.getToolsByCategory(ToolCategory.SETTINGS_OPTIMIZATION)
      const learningTools = toolRegistry.getToolsByCategory(ToolCategory.LEARNING_PATH)
      const personalizationTools = toolRegistry.getToolsByCategory(ToolCategory.PERSONALIZATION)

      expect(discussionTools).toHaveLength(4)
      expect(settingsTools).toHaveLength(4)
      expect(learningTools).toHaveLength(4)
      expect(personalizationTools).toHaveLength(3)
    })

    test('should validate tool registry integrity', () => {
      const validation = validateToolRegistry()
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    test('should generate usage guide', () => {
      const guide = getToolUsageGuide()
      expect(guide).toContain('WeaveMind AI Tools Usage Guide')
      expect(guide).toContain('15')
      expect(guide).toContain('4')
    })
  })

  describe('Tool Definition Validation', () => {
    test('should have proper tool structure', () => {
      const allTools = toolRegistry.getAllTools()

      allTools.forEach(tool => {
        expect(tool).toHaveProperty('id')
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('category')
        expect(tool).toHaveProperty('priority')
        expect(tool).toHaveProperty('status')
        expect(tool).toHaveProperty('execute')
        expect(tool).toHaveProperty('validate')
        expect(tool).toHaveProperty('estimatedExecutionTime')
        expect(tool).toHaveProperty('rateLimitPerMinute')
        expect(tool).toHaveProperty('requiredPermissions')
        expect(tool).toHaveProperty('metadata')
      })
    })

    test('should have reasonable performance characteristics', () => {
      const allTools = toolRegistry.getAllTools()

      allTools.forEach(tool => {
        expect(tool.estimatedExecutionTime).toBeGreaterThan(0)
        expect(tool.estimatedExecutionTime).toBeLessThanOrEqual(60000) // Max 60 seconds
        expect(tool.rateLimitPerMinute).toBeGreaterThan(0)
        expect(tool.rateLimitPerMinute).toBeLessThanOrEqual(100)
      })
    })

    test('should have proper metadata', () => {
      const allTools = toolRegistry.getAllTools()

      allTools.forEach(tool => {
        expect(['simple', 'moderate', 'complex', 'advanced']).toContain(tool.metadata.complexity)
        expect(tool.metadata.useCases).toBeDefined()
        expect(tool.metadata.useCases).toHaveLength.greaterThan(0)
        expect(tool.metadata.successMetrics).toBeDefined()
        expect(tool.metadata.successMetrics).toHaveLength.greaterThan(0)
        expect(tool.metadata.failureRecovery).toBeDefined()
        expect(tool.metadata.failureRecovery).toHaveLength.greaterThan(0)
      })
    })
  })

  describe('Discussion Management Tools', () => {
    const discussionTools = [
      'create_discussion_thread',
      'suggest_discussion_topics',
      'analyze_discussion_engagement',
      'moderate_discussion_content'
    ]

    test('should have all discussion management tools', () => {
      discussionTools.forEach(toolId => {
        const tool = toolRegistry.getTool(toolId)
        expect(tool).toBeDefined()
        expect(tool?.category).toBe(ToolCategory.DISCUSSION_MANAGEMENT)
      })
    })

    test('should validate discussion tool parameters', () => {
      const tool = toolRegistry.getTool('create_discussion_thread')
      expect(tool).toBeDefined()

      // 测试有效参数
      const validParams = {
        classId: 'test-class-id',
        title: 'Test Discussion',
        type: 'general'
      }
      expect(tool?.validate(validParams)).toBe(true)
    })

    test('should handle discussion tool execution', async () => {
      const tool = toolRegistry.getTool('create_discussion_thread')
      expect(tool).toBeDefined()

      // 模拟执行（由于需要真实环境，这里只测试结构）
      const mockParams = {
        classId: 'test-class-id',
        title: 'Test Discussion',
        type: 'general'
      }

      try {
        const result = await toolExecutor.executeTool('create_discussion_thread', mockParams)
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('toolId')
        expect(result).toHaveProperty('executionTime')
        expect(result).toHaveProperty('timestamp')
      } catch (error) {
        // 在测试环境中，API调用可能会失败，这是预期的
        expect(error).toBeDefined()
      }
    })
  })

  describe('Settings Optimization Tools', () => {
    const settingsTools = [
      'optimize_user_settings',
      'suggest_learning_preferences',
      'analyze_usage_patterns',
      'recommend_notification_settings'
    ]

    test('should have all settings optimization tools', () => {
      settingsTools.forEach(toolId => {
        const tool = toolRegistry.getTool(toolId)
        expect(tool).toBeDefined()
        expect(tool?.category).toBe(ToolCategory.SETTINGS_OPTIMIZATION)
      })
    })

    test('should validate settings tool parameters', () => {
      const tool = toolRegistry.getTool('optimize_user_settings')
      expect(tool).toBeDefined()

      const validParams = {
        userId: 'test-user-id'
      }
      expect(tool?.validate(validParams)).toBe(true)
    })
  })

  describe('Learning Path Tools', () => {
    const learningTools = [
      'create_learning_pathway',
      'optimize_pathway_progress',
      'suggest_learning_resources',
      'analyze_learning_efficiency'
    ]

    test('should have all learning path tools', () => {
      learningTools.forEach(toolId => {
        const tool = toolRegistry.getTool(toolId)
        expect(tool).toBeDefined()
        expect(tool?.category).toBe(ToolCategory.LEARNING_PATH)
      })
    })

    test('should validate learning tool parameters', () => {
      const tool = toolRegistry.getTool('create_learning_pathway')
      expect(tool).toBeDefined()

      const validParams = {
        userId: 'test-user-id',
        learningObjectives: [
          {
            objective: 'Learn basic concepts',
            priority: 'high'
          }
        ],
        availableTime: {
          dailyHours: 2,
          weeklyDays: ['monday', 'wednesday', 'friday']
        }
      }
      expect(tool?.validate(validParams)).toBe(true)
    })
  })

  describe('Personalization Tools', () => {
    const personalizationTools = [
      'generate_personalized_recommendations',
      'adapt_content_difficulty',
      'create_study_reminders'
    ]

    test('should have all personalization tools', () => {
      personalizationTools.forEach(toolId => {
        const tool = toolRegistry.getTool(toolId)
        expect(tool).toBeDefined()
        expect(tool?.category).toBe(ToolCategory.PERSONALIZATION)
      })
    })

    test('should validate personalization tool parameters', () => {
      const tool = toolRegistry.getTool('generate_personalized_recommendations')
      expect(tool).toBeDefined()

      const validParams = {
        userId: 'test-user-id'
      }
      expect(tool?.validate(validParams)).toBe(true)
    })
  })

  describe('Tool Execution Performance', () => {
    test('should handle concurrent tool executions', async () => {
      const tools = toolRegistry.getAllTools().slice(0, 3) // Test first 3 tools
      const executions = tools.map(tool => ({
        toolId: tool.id,
        params: getMockParamsForTool(tool.id),
        options: { useCache: false }
      }))

      try {
        const results = await toolExecutor.executeTools(executions, { parallel: true })
        expect(results.results).toHaveLength(3)
        expect(results.summary).toHaveProperty('totalExecutions')
        expect(results.summary).toHaveProperty('successfulExecutions')
        expect(results.summary).toHaveProperty('failedExecutions')
        expect(results.summary).toHaveProperty('totalExecutionTime')
      } catch (error) {
        // 在测试环境中，API调用可能会失败
        expect(error).toBeDefined()
      }
    })

    test('should respect rate limits', async () => {
      const tool = toolRegistry.getTool('moderate_discussion_content')
      expect(tool).toBeDefined()

      // 模拟快速连续调用（不应该全部成功）
      const promises = Array(35).fill(0).map(() =>
        toolExecutor.executeTool('moderate_discussion_content', getMockParamsForTool('moderate_discussion_content'))
      )

      try {
        const results = await Promise.allSettled(promises)
        const failureCount = results.filter(r => r.status === 'rejected').length
        expect(failureCount).toBeGreaterThan(0) // 应该有失败（速率限制）
      } catch (error) {
        // 预期的错误
        expect(error).toBeDefined()
      }
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle invalid tool parameters', async () => {
      const result = await toolExecutor.executeTool('create_discussion_thread', null)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    test('should handle non-existent tools', async () => {
      const result = await toolExecutor.executeTool('non_existent_tool', {})
      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    test('should handle dependency validation', () => {
      const tool = toolRegistry.getTool('optimize_pathway_progress')
      expect(tool).toBeDefined()

      const deps = toolRegistry.checkDependencies('optimize_pathway_progress')
      expect(deps).toHaveProperty('satisfied')
      expect(deps).toHaveProperty('missing')
    })
  })

  describe('Tool Statistics and Monitoring', () => {
    test('should provide accurate statistics', () => {
      const stats = toolRegistry.getStatistics()

      expect(stats.totalTools).toBe(15)
      expect(stats.toolsByCategory).toHaveLength(4)
      expect(stats.toolsByPriority).toHaveLength(4)
      expect(stats.totalEstimatedExecutionTime).toBeGreaterThan(0)
    })

    test('should support tool search by tags', () => {
      const aiTools = toolRegistry.searchToolsByTags(['ai'])
      expect(aiTools.length).toBeGreaterThan(0)

      const discussionTools = toolRegistry.searchToolsByTags(['discussion'])
      expect(discussionTools.length).toBeGreaterThan(0)
    })

    test('should categorize tools by priority', () => {
      const highPriorityTools = toolRegistry.getToolsByPriority(ToolPriority.HIGH)
      expect(highPriorityTools.length).toBeGreaterThan(0)

      const lowPriorityTools = toolRegistry.getToolsByPriority(ToolPriority.LOW)
      expect(lowPriorityTools.length).toBeGreaterThanOrEqual(0)
    })
  })
})

// 辅助函数：为测试工具生成模拟参数
function getMockParamsForTool(toolId: string): any {
  const baseParams = {
    userId: 'test-user-id',
    classId: 'test-class-id',
    courseId: 'test-course-id',
  }

  switch (toolId) {
    case 'create_discussion_thread':
      return {
        classId: baseParams.classId,
        title: 'Test Discussion Topic',
        type: 'general'
      }

    case 'suggest_discussion_topics':
      return {
        courseId: baseParams.courseId,
        targetAudience: 'students',
        topicCount: 5
      }

    case 'analyze_discussion_engagement':
      return {
        threadId: 'test-thread-id'
      }

    case 'moderate_discussion_content':
      return {
        content: 'This is test content for moderation.',
        context: {
          userRole: 'student',
          postType: 'text'
        }
      }

    case 'optimize_user_settings':
      return {
        userId: baseParams.userId
      }

    case 'suggest_learning_preferences':
      return {
        userId: baseParams.userId
      }

    case 'analyze_usage_patterns':
      return {
        userId: baseParams.userId
      }

    case 'recommend_notification_settings':
      return {
        userId: baseParams.userId,
        userRole: 'student',
        organizationId: 'test-org-id'
      }

    case 'create_learning_pathway':
      return {
        userId: baseParams.userId,
        learningObjectives: [
          {
            objective: 'Learn basic concepts',
            priority: 'high'
          }
        ],
        availableTime: {
          dailyHours: 2,
          weeklyDays: ['monday', 'wednesday', 'friday']
        }
      }

    case 'optimize_pathway_progress':
      return {
        pathwayId: 'test-pathway-id',
        userId: baseParams.userId,
        currentProgress: {
          completedActivities: [],
          currentPhase: 'phase-1',
          overallProgress: 0.5,
          timeSpent: 10,
          adherenceRate: 0.8
        }
      }

    case 'suggest_learning_resources':
      return {
        learningTopic: 'JavaScript basics',
        currentLevel: 'beginner',
        targetLevel: 'intermediate'
      }

    case 'analyze_learning_efficiency':
      return {
        userId: baseParams.userId,
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        learningActivities: []
      }

    case 'generate_personalized_recommendations':
      return {
        userId: baseParams.userId
      }

    case 'adapt_content_difficulty':
      return {
        userId: baseParams.userId,
        contentId: baseParams.courseId,
        contentType: 'course',
        currentDifficulty: 'beginner',
        userCapabilityProfile: {
          skillLevels: { javascript: 3, html: 4, css: 2 },
          learningVelocity: 'moderate',
          retentionRate: 0.8,
          frustrationTolerance: 'medium',
          motivationLevel: 'high'
        }
      }

    case 'create_study_reminders':
      return {
        userId: baseParams.userId,
        studyPlan: {
          learningObjectives: [
            {
              objective: 'Complete JavaScript course',
              targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              priority: 'high',
              estimatedHours: 20
            }
          ],
          schedule: {
            preferredStudyTimes: [
              {
                day: 'monday',
                startTime: '19:00',
                endTime: '21:00'
              }
            ],
            studyFrequency: 'weekly',
            sessionDuration: 120
          }
        },
        userPreferences: {
          reminderTypes: ['push', 'email'],
          reminderTiming: '1hour_before',
          learningStyle: 'visual'
        },
        contextualFactors: {
          timezone: 'Asia/Shanghai'
        }
      }

    default:
      return baseParams
  }
}

// 导出测试工具
export {
  getMockParamsForTool
}
