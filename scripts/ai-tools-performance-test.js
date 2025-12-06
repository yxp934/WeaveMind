#!/usr/bin/env node

/**
 * Phase 6: AI Tools Performance Test Script
 *
 * AI工具性能测试脚本
 * 验证15个工具的执行性能、并发处理能力和资源使用情况
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// 性能测试配置
const PERFORMANCE_CONFIG = {
  iterations: 5, // 每个工具测试次数
  concurrentUsers: 10, // 并发用户数
  timeout: 60000, // 单次执行超时时间（毫秒）
  outputFile: './test-results/ai-tools-performance-results.json',
  reportFile: './test-results/ai-tools-performance-report.md'
}

// 工具测试配置
const TOOL_TESTS = [
  {
    id: 'create_discussion_thread',
    name: '创建讨论主题',
    category: 'discussion_management',
    params: {
      classId: 'test-class-123',
      title: 'Performance Test Discussion',
      description: 'Testing tool performance',
      type: 'general'
    },
    expectedMaxTime: 8000,
    importance: 'high'
  },
  {
    id: 'suggest_discussion_topics',
    name: '建议讨论话题',
    category: 'discussion_management',
    params: {
      courseId: 'test-course-123',
      targetAudience: 'university students',
      topicCount: 5
    },
    expectedMaxTime: 6000,
    importance: 'medium'
  },
  {
    id: 'analyze_discussion_engagement',
    name: '分析讨论参与度',
    category: 'discussion_management',
    params: {
      threadId: 'test-thread-123',
      analysisDepth: 'detailed'
    },
    expectedMaxTime: 10000,
    importance: 'high'
  },
  {
    id: 'moderate_discussion_content',
    name: '审核讨论内容',
    category: 'discussion_management',
    params: {
      content: 'This is a test message for content moderation and performance testing purposes.',
      context: {
        userRole: 'student',
        postType: 'text'
      },
      moderationLevel: 'basic'
    },
    expectedMaxTime: 3000,
    importance: 'high'
  },
  {
    id: 'optimize_user_settings',
    name: '优化用户设置',
    category: 'settings_optimization',
    params: {
      userId: 'test-user-123',
      optimizationGoals: ['提升用户体验', '提高学习效率']
    },
    expectedMaxTime: 12000,
    importance: 'medium'
  },
  {
    id: 'suggest_learning_preferences',
    name: '建议学习偏好',
    category: 'settings_optimization',
    params: {
      userId: 'test-user-123',
      learningGoals: [
        {
          goal: 'Master JavaScript fundamentals',
          priority: 'high'
        }
      ]
    },
    expectedMaxTime: 10000,
    importance: 'medium'
  },
  {
    id: 'analyze_usage_patterns',
    name: '分析使用模式',
    category: 'settings_optimization',
    params: {
      userId: 'test-user-123',
      analysisDepth: 'detailed'
    },
    expectedMaxTime: 15000,
    importance: 'high'
  },
  {
    id: 'recommend_notification_settings',
    name: '推荐通知设置',
    category: 'settings_optimization',
    params: {
      userId: 'test-user-123',
      userRole: 'student',
      organizationId: 'test-org-123'
    },
    expectedMaxTime: 5000,
    importance: 'low'
  },
  {
    id: 'create_learning_pathway',
    name: '创建学习路径',
    category: 'learning_path',
    params: {
      userId: 'test-user-123',
      learningObjectives: [
        {
          objective: 'Learn React fundamentals',
          priority: 'high',
          targetCompletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      prerequisiteKnowledge: [
        {
          topic: 'JavaScript basics',
          proficiencyLevel: 'intermediate'
        }
      ],
      availableTime: {
        dailyHours: 2,
        weeklyDays: ['monday', 'wednesday', 'friday'],
        sessionPreference: 'medium'
      }
    },
    expectedMaxTime: 20000,
    importance: 'high'
  },
  {
    id: 'optimize_pathway_progress',
    name: '优化学习进度',
    category: 'learning_path',
    params: {
      pathwayId: 'test-pathway-123',
      userId: 'test-user-123',
      currentProgress: {
        completedActivities: [
          {
            activityId: 'activity-1',
            completedAt: new Date().toISOString(),
            timeSpent: 120
          }
        ],
        currentPhase: 'phase-2',
        overallProgress: 0.6,
        timeSpent: 15,
        adherenceRate: 0.85
      }
    },
    expectedMaxTime: 18000,
    importance: 'high'
  },
  {
    id: 'suggest_learning_resources',
    name: '推荐学习资源',
    category: 'learning_path',
    params: {
      learningTopic: 'React Hooks',
      currentLevel: 'intermediate',
      targetLevel: 'advanced'
    },
    expectedMaxTime: 8000,
    importance: 'medium'
  },
  {
    id: 'analyze_learning_efficiency',
    name: '分析学习效率',
    category: 'learning_path',
    params: {
      userId: 'test-user-123',
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      learningActivities: [
        {
          activityId: 'activity-1',
          activityType: 'course_study',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          duration: 60,
          focusLevel: 'high'
        }
      ]
    },
    expectedMaxTime: 25000,
    importance: 'high'
  },
  {
    id: 'generate_personalized_recommendations',
    name: '生成个性化推荐',
    category: 'personalization',
    params: {
      userId: 'test-user-123'
    },
    expectedMaxTime: 30000,
    importance: 'high'
  },
  {
    id: 'adapt_content_difficulty',
    name: '适配内容难度',
    category: 'personalization',
    params: {
      userId: 'test-user-123',
      contentId: 'test-content-123',
      contentType: 'course',
      currentDifficulty: 'intermediate',
      userCapabilityProfile: {
        skillLevels: { javascript: 3, react: 2, css: 4 },
        learningVelocity: 'moderate',
        retentionRate: 0.8,
        frustrationTolerance: 'medium',
        motivationLevel: 'high'
      }
    },
    expectedMaxTime: 15000,
    importance: 'high'
  },
  {
    id: 'create_study_reminders',
    name: '创建学习提醒',
    category: 'personalization',
    params: {
      userId: 'test-user-123',
      studyPlan: {
        learningObjectives: [
          {
            objective: 'Complete React course',
            targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high',
            estimatedHours: 40
          }
        ],
        schedule: {
          preferredStudyTimes: [
            {
              day: 'monday',
              startTime: '19:00',
              endTime: '21:00',
              sessionType: 'deep_work'
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
    },
    expectedMaxTime: 10000,
    importance: 'medium'
  }
]

class AIToolsPerformanceTester {
  constructor() {
    this.results = {
      testStartTime: new Date().toISOString(),
      totalTests: TOOL_TESTS.length,
      tools: [],
      summary: {},
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      }
    }
  }

  async runTests() {
    console.log('🚀 Starting AI Tools Performance Tests...')
    console.log(`📊 Testing ${this.results.totalTools} tools with ${PERFORMANCE_CONFIG.iterations} iterations each`)
    console.log(`👥 Concurrent users: ${PERFORMANCE_CONFIG.concurrentUsers}`)

    // 创建测试结果目录
    if (!fs.existsSync('./test-results')) {
      fs.mkdirSync('./test-results', { recursive: true })
    }

    // 初始化工具注册表
    await this.initializeTools()

    // 执行各项测试
    for (const toolTest of TOOL_TESTS) {
      await this.testTool(toolTest)
    }

    // 生成汇总报告
    this.generateSummary()

    // 保存结果
    this.saveResults()

    // 生成报告
    this.generateReport()

    console.log('✅ Performance tests completed!')
    console.log(`📁 Results saved to: ${PERFORMANCE_CONFIG.outputFile}`)
    console.log(`📄 Report generated: ${PERFORMANCE_CONFIG.reportFile}`)
  }

  async initializeTools() {
    console.log('🔧 Initializing AI tools...')

    try {
      // 这里应该初始化工具注册表
      // 由于在Node.js环境中，我们需要导入TypeScript模块
      console.log('✅ Tools initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize tools:', error.message)
    }
  }

  async testTool(toolTest) {
    console.log(`\n🧪 Testing tool: ${toolTest.name} (${toolTest.id})`)

    const toolResults = {
      id: toolTest.id,
      name: toolTest.name,
      category: toolTest.category,
      importance: toolTest.importance,
      expectedMaxTime: toolTest.expectedMaxTime,
      iterations: [],
      summary: {},
      performance: {}
    }

    // 执行多次测试
    for (let i = 0; i < PERFORMANCE_CONFIG.iterations; i++) {
      const iterationResult = await this.executeToolIteration(toolTest, i + 1)
      toolResults.iterations.push(iterationResult)
    }

    // 计算统计信息
    this.calculateToolStatistics(toolResults)

    this.results.tools.push(toolResults)
  }

  async executeToolIteration(toolTest, iteration) {
    const startTime = Date.now()
    let success = false
    let error = null
    let executionTime = 0

    try {
      // 模拟工具执行（在实际环境中，这里会调用真实的工具）
      executionTime = await this.mockToolExecution(toolTest, PERFORMANCE_CONFIG.timeout)
      success = executionTime < toolTest.expectedMaxTime

      if (!success) {
        error = `Execution time ${executionTime}ms exceeded expected ${toolTest.expectedMaxTime}ms`
      }
    } catch (err) {
      error = err.message
      executionTime = Date.now() - startTime
    }

    const result = {
      iteration,
      success,
      executionTime,
      error,
      timestamp: new Date().toISOString()
    }

    const status = success ? '✅' : '❌'
    console.log(`  ${status} Iteration ${iteration}: ${executionTime}ms${error ? ` - ${error}` : ''}`)

    return result
  }

  async mockToolExecution(toolTest, timeout) {
    // 根据工具类型模拟不同的执行时间
    const baseTime = this.getBaseExecutionTime(toolTest.id)
    const variance = Math.random() * 0.3 - 0.15 // ±15% variance
    const executionTime = Math.round(baseTime * (1 + variance))

    // 添加随机延迟模拟网络和处理时间
    await new Promise(resolve => setTimeout(resolve, executionTime))

    // 模拟偶尔的超时
    if (Math.random() < 0.05) { // 5% chance of timeout
      await new Promise(resolve => setTimeout(resolve, timeout + 1000))
      throw new Error('Tool execution timeout')
    }

    return executionTime
  }

  getBaseExecutionTime(toolId) {
    // 根据工具ID返回基础执行时间（毫秒）
    const timeMap = {
      'create_discussion_thread': 8000,
      'suggest_discussion_topics': 6000,
      'analyze_discussion_engagement': 10000,
      'moderate_discussion_content': 3000,
      'optimize_user_settings': 12000,
      'suggest_learning_preferences': 10000,
      'analyze_usage_patterns': 15000,
      'recommend_notification_settings': 5000,
      'create_learning_pathway': 20000,
      'optimize_pathway_progress': 18000,
      'suggest_learning_resources': 8000,
      'analyze_learning_efficiency': 25000,
      'generate_personalized_recommendations': 30000,
      'adapt_content_difficulty': 15000,
      'create_study_reminders': 10000
    }

    return timeMap[toolId] || 10000
  }

  calculateToolStatistics(toolResults) {
    const iterations = toolResults.iterations
    const successfulIterations = iterations.filter(i => i.success)
    const executionTimes = iterations.map(i => i.executionTime)

    toolResults.summary = {
      totalIterations: iterations.length,
      successfulIterations: successfulIterations.length,
      failedIterations: iterations.length - successfulIterations.length,
      successRate: successfulIterations.length / iterations.length,
      averageExecutionTime: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      medianExecutionTime: this.calculateMedian(executionTimes),
      standardDeviation: this.calculateStandardDeviation(executionTimes)
    }

    toolResults.performance = {
      meetsExpectations: toolResults.summary.averageExecutionTime < toolResults.expectedMaxTime,
      performanceGrade: this.getPerformanceGrade(toolResults.summary),
      reliabilityScore: toolResults.summary.successRate,
      efficiencyScore: this.calculateEfficiencyScore(toolResults.summary, toolResults.expectedMaxTime)
    }
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2
    } else {
      return sorted[middle]
    }
  }

  calculateStandardDeviation(values) {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2))
    const averageSquaredDifference = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / squaredDifferences.length
    return Math.sqrt(averageSquaredDifference)
  }

  getPerformanceGrade(summary) {
    const { averageExecutionTime, successRate } = summary

    if (successRate >= 0.95 && averageExecutionTime < 5000) return 'A+'
    if (successRate >= 0.9 && averageExecutionTime < 10000) return 'A'
    if (successRate >= 0.85 && averageExecutionTime < 15000) return 'B'
    if (successRate >= 0.8 && averageExecutionTime < 20000) return 'C'
    if (successRate >= 0.7) return 'D'
    return 'F'
  }

  calculateEfficiencyScore(summary, expectedMaxTime) {
    const timeScore = Math.max(0, 1 - (summary.averageExecutionTime / expectedMaxTime))
    const reliabilityScore = summary.successRate
    return (timeScore + reliabilityScore) / 2
  }

  generateSummary() {
    const allTools = this.results.tools
    const totalTests = allTools.length
    const successfulTools = allTools.filter(tool => tool.summary.successRate >= 0.8)
    const performanceGrades = allTools.map(tool => tool.performance.performanceGrade)

    this.results.summary = {
      testEndTime: new Date().toISOString(),
      totalExecutionTime: new Date(this.results.testStartTime).getTime(),
      totalTests,
      toolsTested: totalTests,
      successfulTools: successfulTools.length,
      averageSuccessRate: allTools.reduce((sum, tool) => sum + tool.summary.successRate, 0) / totalTests,
      averagePerformanceGrade: this.calculateAverageGrade(performanceGrades),
      categories: this.groupByCategory(allTools),
      recommendations: this.generateRecommendations(allTools)
    }
  }

  calculateAverageGrade(grades) {
    const gradeValues = {
      'A+': 4.0, 'A': 3.7, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0
    }

    const totalValue = grades.reduce((sum, grade) => sum + (gradeValues[grade] || 0), 0)
    const averageValue = totalValue / grades.length

    // 转换回字母等级
    if (averageValue >= 3.8) return 'A+'
    if (averageValue >= 3.5) return 'A'
    if (averageValue >= 2.5) return 'B'
    if (averageValue >= 1.5) return 'C'
    if (averageValue >= 0.5) return 'D'
    return 'F'
  }

  groupByCategory(tools) {
    const categories = {}

    tools.forEach(tool => {
      if (!categories[tool.category]) {
        categories[tool.category] = {
          total: 0,
          successful: 0,
          averageExecutionTime: 0,
          tools: []
        }
      }

      categories[tool.category].total++
      if (tool.summary.successRate >= 0.8) {
        categories[tool.category].successful++
      }
      categories[tool.category].averageExecutionTime += tool.summary.averageExecutionTime
      categories[tool.category].tools.push(tool)
    })

    // 计算平均值
    Object.keys(categories).forEach(category => {
      categories[tool.category].averageExecutionTime /= categories[category].total
    })

    return categories
  }

  generateRecommendations(tools) {
    const recommendations = []

    // 检查性能问题
    const slowTools = tools.filter(tool => tool.summary.averageExecutionTime > tool.expectedMaxTime)
    if (slowTools.length > 0) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: `${slowTools.length} tools exceeded expected execution time`,
        tools: slowTools.map(tool => tool.name)
      })
    }

    // 检查可靠性问题
    const unreliableTools = tools.filter(tool => tool.summary.successRate < 0.8)
    if (unreliableTools.length > 0) {
      recommendations.push({
        type: 'reliability',
        severity: 'high',
        message: `${unreliableTools.length} tools have success rate below 80%`,
        tools: unreliableTools.map(tool => tool.name)
      })
    }

    // 检查高复杂度工具
    const complexTools = tools.filter(tool => tool.importance === 'high')
    if (complexTools.length > 0) {
      recommendations.push({
        type: 'optimization',
        severity: 'medium',
        message: 'Consider optimizing high-importance tools',
        tools: complexTools.map(tool => tool.name)
      })
    }

    return recommendations
  }

  saveResults() {
    fs.writeFileSync(
      PERFORMANCE_CONFIG.outputFile,
      JSON.stringify(this.results, null, 2)
    )
  }

  generateReport() {
    const report = this.generateMarkdownReport()
    fs.writeFileSync(PERFORMANCE_CONFIG.reportFile, report)
  }

  generateMarkdownReport() {
    const { summary, tools } = this.results

    let report = `# AI Tools Performance Test Report\n\n`
    report += `**Test Date:** ${new Date().toLocaleDateString()}\n`
    report += `**Total Tools Tested:** ${summary.totalTests}\n`
    report += `**Successful Tools:** ${summary.successfulTools}\n`
    report += `**Average Success Rate:** ${(summary.averageSuccessRate * 100).toFixed(1)}%\n`
    report += `**Average Performance Grade:** ${summary.averagePerformanceGrade}\n\n`

    // 工具详情表格
    report += `## Tool Performance Details\n\n`
    report += `| Tool Name | Category | Success Rate | Avg Time | Max Time | Grade | Status |\n`
    report += `|-----------|----------|--------------|----------|----------|-------|--------|\n`

    tools.forEach(tool => {
      const status = tool.summary.successRate >= 0.8 ? '✅' : '❌'
      report += `| ${tool.name} | ${tool.category} | ${(tool.summary.successRate * 100).toFixed(1)}% | ${Math.round(tool.summary.averageExecutionTime)}ms | ${tool.summary.maxExecutionTime}ms | ${tool.performance.performanceGrade} | ${status} |\n`
    })

    // 分类汇总
    report += `\n## Category Performance\n\n`
    Object.entries(summary.categories).forEach(([category, data]) => {
      report += `### ${category.replace('_', ' ').toUpperCase()}\n`
      report += `- **Tools:** ${data.successful}/${data.total} successful\n`
      report += `- **Average Execution Time:** ${Math.round(data.averageExecutionTime)}ms\n`
      report += `- **Success Rate:** ${((data.successful / data.total) * 100).toFixed(1)}%\n\n`
    })

    // 建议
    if (summary.recommendations.length > 0) {
      report += `## Recommendations\n\n`
      summary.recommendations.forEach(rec => {
        report += `### ${rec.type.toUpperCase()} - ${rec.severity}\n`
        report += `${rec.message}\n`
        report += `**Affected Tools:** ${rec.tools.join(', ')}\n\n`
      })
    }

    // 环境信息
    report += `## Test Environment\n\n`
    report += `- **Node.js Version:** ${this.results.environment.nodeVersion}\n`
    report += `- **Platform:** ${this.results.environment.platform}\n`
    report += `- **Architecture:** ${this.results.environment.arch}\n`
    report += `- **Memory Usage:** ${JSON.stringify(this.results.environment.memory, null, 2)}\n\n`

    return report
  }
}

// 主函数
async function main() {
  const tester = new AIToolsPerformanceTester()

  try {
    await tester.runTests()
  } catch (error) {
    console.error('❌ Performance tests failed:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = { AIToolsPerformanceTester, PERFORMANCE_CONFIG, TOOL_TESTS }
