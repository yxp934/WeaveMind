/**
 * 性能监控系统
 * 实时监控API、数据库、实时系统和AI系统的性能指标
 */

import { createClient } from '@/lib/supabase/server'

interface APIMetrics {
  timestamp: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  requestsPerSecond: number
  errorRate: number
  endpoints: {
    [endpoint: string]: {
      requests: number
      averageTime: number
      errorRate: number
    }
  }
}

interface DatabaseMetrics {
  timestamp: string
  totalConnections: number
  activeConnections: number
  idleConnections: number
  averageQueryTime: number
  slowQueries: number
  cacheHitRate: number
  indexUsage: number
  lockWaits: number
  deadlocks: number
  tables: {
    [tableName: string]: {
      reads: number
      writes: number
      averageTime: number
    }
  }
}

interface RealtimeMetrics {
  timestamp: string
  activeConnections: number
  messagesPerSecond: number
  averageMessageLatency: number
  connectionFailures: number
  messageQueueSize: number
  memoryUsage: number
  cpuUsage: number
  throughput: number
}

interface AIMetrics {
  timestamp: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  totalTokens: number
  totalCost: number
  averageTokensPerRequest: number
  cacheHitRate: number
  tools: {
    [toolName: string]: {
      requests: number
      averageTime: number
      successRate: number
      tokensUsed: number
    }
  }
}

interface AlertRule {
  id: string
  name: string
  metric: string
  condition: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'NOT_EQUALS'
  threshold: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  enabled: boolean
  cooldown: number // 告警间隔（秒）
  lastTriggered?: Date
}

interface Alert {
  id: string
  ruleId: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  metric: string
  value: number
  threshold: number
  timestamp: Date
  acknowledged: boolean
  resolved?: boolean
  metadata?: any
}

export class PerformanceMonitor {
  private supabase = createClient()
  private alertRules: AlertRule[] = []
  private alertHistory: Alert[] = []

  /**
   * API性能监控
   */
  static async monitorAPIEndpoints(): Promise<APIMetrics> {
    const timestamp = new Date().toISOString()

    try {
      // 从数据库获取API请求统计
      const { data: requestLogs } = await createClient()
        .from('api_request_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // 最近1分钟

      if (!requestLogs) {
        return this.getDefaultAPIMetrics(timestamp)
      }

      const totalRequests = requestLogs.length
      const successfulRequests = requestLogs.filter(log => log.status_code < 400).length
      const failedRequests = totalRequests - successfulRequests

      // 计算响应时间统计
      const responseTimes = requestLogs.map(log => log.response_time)
      const sortedTimes = responseTimes.sort((a, b) => a - b)

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const p50ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0
      const p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0
      const p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0

      // 计算RPS和错误率
      const requestsPerSecond = totalRequests / 60
      const errorRate = (failedRequests / totalRequests) * 100

      // 按端点统计
      const endpoints: { [endpoint: string]: { requests: number; averageTime: number; errorRate: number } } = {}

      requestLogs.forEach(log => {
        const endpoint = log.endpoint

        if (!endpoints[endpoint]) {
          endpoints[endpoint] = { requests: 0, averageTime: 0, errorRate: 0 }
        }

        endpoints[endpoint].requests++
      })

      // 计算每个端点的平均时间和错误率
      Object.keys(endpoints).forEach(endpoint => {
        const endpointLogs = requestLogs.filter(log => log.endpoint === endpoint)
        const endpointResponseTimes = endpointLogs.map(log => log.response_time)
        const endpointAverageTime = endpointResponseTimes.reduce((sum, time) => sum + time, 0) / endpointResponseTimes.length
        const endpointErrors = endpointLogs.filter(log => log.status_code >= 400).length
        const endpointErrorRate = (endpointErrors / endpointLogs.length) * 100

        endpoints[endpoint].averageTime = endpointAverageTime
        endpoints[endpoint].errorRate = endpointErrorRate
      })

      return {
        timestamp,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        p50ResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        requestsPerSecond,
        errorRate,
        endpoints
      }
    } catch (error) {
      console.error('API monitoring error:', error)
      return this.getDefaultAPIMetrics(timestamp)
    }
  }

  /**
   * 数据库性能监控
   */
  static async monitorDatabase(): Promise<DatabaseMetrics> {
    const timestamp = new Date().toISOString()

    try {
      // 获取数据库连接统计
      const { data: connectionStats } = await createClient()
        .from('database_connection_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      // 获取查询性能统计
      const { data: queryStats } = await createClient()
        .from('query_performance_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60000).toISOString())

      const totalConnections = connectionStats?.[0]?.total_connections || 0
      const activeConnections = connectionStats?.[0]?.active_connections || 0
      const idleConnections = totalConnections - activeConnections

      let averageQueryTime = 0
      let slowQueries = 0
      let cacheHitRate = 0
      let indexUsage = 0
      let lockWaits = 0
      let deadlocks = 0

      if (queryStats) {
        const queryTimes = queryStats.map(stat => stat.execution_time)
        averageQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
        slowQueries = queryStats.filter(stat => stat.execution_time > 100).length
        cacheHitRate = queryStats.filter(stat => stat.cache_hit).length / queryStats.length * 100
        indexUsage = queryStats.filter(stat => stat.used_index).length / queryStats.length * 100
        lockWaits = queryStats.filter(stat => stat.lock_wait_time > 0).length
        deadlocks = queryStats.filter(stat => stat.deadlock).length
      }

      // 表级别统计
      const tables: { [tableName: string]: { reads: number; writes: number; averageTime: number } } = {}

      if (queryStats) {
        queryStats.forEach(stat => {
          const tableName = stat.table_name
          if (!tables[tableName]) {
            tables[tableName] = { reads: 0, writes: 0, averageTime: 0 }
          }

          if (stat.operation === 'SELECT') {
            tables[tableName].reads++
          } else {
            tables[tableName].writes++
          }
        })

        // 计算每个表的平均时间
        Object.keys(tables).forEach(table => {
          const tableStats = queryStats.filter(stat => stat.table_name === table)
          const tableTimes = tableStats.map(stat => stat.execution_time)
          tables[table].averageTime = tableTimes.reduce((sum, time) => sum + time, 0) / tableTimes.length
        })
      }

      return {
        timestamp,
        totalConnections,
        activeConnections,
        idleConnections,
        averageQueryTime,
        slowQueries,
        cacheHitRate,
        indexUsage,
        lockWaits,
        deadlocks,
        tables
      }
    } catch (error) {
      console.error('Database monitoring error:', error)
      return this.getDefaultDatabaseMetrics(timestamp)
    }
  }

  /**
   * 实时系统监控
   */
  static async monitorRealtime(): Promise<RealtimeMetrics> {
    const timestamp = new Date().toISOString()

    try {
      // 获取WebSocket连接统计
      const { data: connectionStats } = await createClient()
        .from('realtime_connection_stats')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60000).toISOString())

      const activeConnections = connectionStats?.filter(stat => stat.status === 'active').length || 0
      const connectionFailures = connectionStats?.filter(stat => stat.status === 'failed').length || 0

      // 获取消息统计
      const { data: messageStats } = await createClient()
        .from('realtime_message_stats')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60000).toISOString())

      const messagesPerSecond = messageStats?.length / 60 || 0
      const messageLatencies = messageStats?.map(stat => stat.latency) || []
      const averageMessageLatency = messageLatencies.length > 0
        ? messageLatencies.reduce((sum, latency) => sum + latency, 0) / messageLatencies.length
        : 0

      // 获取系统资源使用情况
      const memoryUsage = process.memoryUsage()
      const cpuUsage = await this.getCPUUsage()
      const throughput = messagesPerSecond * averageMessageLatency

      return {
        timestamp,
        activeConnections,
        messagesPerSecond,
        averageMessageLatency,
        connectionFailures,
        messageQueueSize: messageStats?.length || 0,
        memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal * 100,
        cpuUsage,
        throughput
      }
    } catch (error) {
      console.error('Realtime monitoring error:', error)
      return this.getDefaultRealtimeMetrics(timestamp)
    }
  }

  /**
   * AI系统监控
   */
  static async monitorAI(): Promise<AIMetrics> {
    const timestamp = new Date().toISOString()

    try {
      // 获取AI请求统计
      const { data: aiLogs } = await createClient()
        .from('ai_usage_audit')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 60000).toISOString())

      if (!aiLogs) {
        return this.getDefaultAIMetrics(timestamp)
      }

      const totalRequests = aiLogs.length
      const successfulRequests = aiLogs.filter(log => log.success).length
      const failedRequests = totalRequests - successfulRequests

      const responseTimes = aiLogs.map(log => log.duration)
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length

      const totalTokens = aiLogs.reduce((sum, log) => sum + (log.tokens_used || 0), 0)
      const totalCost = aiLogs.reduce((sum, log) => sum + (log.cost || 0), 0)
      const averageTokensPerRequest = totalTokens / totalRequests

      // 工具级别统计
      const tools: { [toolName: string]: { requests: number; averageTime: number; successRate: number; tokensUsed: number } } = {}

      aiLogs.forEach(log => {
        const toolName = log.operation

        if (!tools[toolName]) {
          tools[toolName] = { requests: 0, averageTime: 0, successRate: 0, tokensUsed: 0 }
        }

        tools[toolName].requests++
        tools[toolName].tokensUsed += log.tokens_used || 0
      })

      // 计算每个工具的平均时间和成功率
      Object.keys(tools).forEach(tool => {
        const toolLogs = aiLogs.filter(log => log.operation === tool)
        const toolTimes = toolLogs.map(log => log.duration)
        const toolAverageTime = toolTimes.reduce((sum, time) => sum + time, 0) / toolTimes.length
        const toolSuccess = toolLogs.filter(log => log.success).length
        const toolSuccessRate = (toolSuccess / toolLogs.length) * 100

        tools[tool].averageTime = toolAverageTime
        tools[tool].successRate = toolSuccessRate
      })

      return {
        timestamp,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        totalTokens,
        totalCost,
        averageTokensPerRequest,
        cacheHitRate: 0, // 需要从缓存系统获取
        tools
      }
    } catch (error) {
      console.error('AI monitoring error:', error)
      return this.getDefaultAIMetrics(timestamp)
    }
  }

  /**
   * 检查告警规则
   */
  static async checkAlertRules(): Promise<Alert[]> {
    const alerts: Alert[] = []
    const now = new Date()

    try {
      // 获取所有监控数据
      const [apiMetrics, dbMetrics, realtimeMetrics, aiMetrics] = await Promise.all([
        this.monitorAPIEndpoints(),
        this.monitorDatabase(),
        this.monitorRealtime(),
        this.monitorAI()
      ])

      // API性能告警
      if (apiMetrics.averageResponseTime > 200) {
        alerts.push({
          id: `api_response_time_${Date.now()}`,
          ruleId: 'api_response_time',
          severity: apiMetrics.averageResponseTime > 500 ? 'CRITICAL' : 'HIGH',
          message: `API平均响应时间超过阈值: ${apiMetrics.averageResponseTime.toFixed(2)}ms`,
          metric: 'api_average_response_time',
          value: apiMetrics.averageResponseTime,
          threshold: 200,
          timestamp: now,
          acknowledged: false,
          resolved: false
        })
      }

      if (apiMetrics.errorRate > 5) {
        alerts.push({
          id: `api_error_rate_${Date.now()}`,
          ruleId: 'api_error_rate',
          severity: apiMetrics.errorRate > 10 ? 'CRITICAL' : 'HIGH',
          message: `API错误率过高: ${apiMetrics.errorRate.toFixed(2)}%`,
          metric: 'api_error_rate',
          value: apiMetrics.errorRate,
          threshold: 5,
          timestamp: now,
          acknowledged: false,
          resolved: false
        })
      }

      // 数据库性能告警
      if (dbMetrics.averageQueryTime > 100) {
        alerts.push({
          id: `db_query_time_${Date.now()}`,
          ruleId: 'db_query_time',
          severity: dbMetrics.averageQueryTime > 500 ? 'CRITICAL' : 'HIGH',
          message: `数据库平均查询时间超过阈值: ${dbMetrics.averageQueryTime.toFixed(2)}ms`,
          metric: 'db_average_query_time',
          value: dbMetrics.averageQueryTime,
          threshold: 100,
          timestamp: now,
          acknowledged: false,
          resolved: false
        })
      }

      if (dbMetrics.cacheHitRate < 80) {
        alerts.push({
          id: `db_cache_hit_rate_${Date.now()}`,
          ruleId: 'db_cache_hit_rate',
          severity: 'MEDIUM',
          message: `数据库缓存命中率过低: ${dbMetrics.cacheHitRate.toFixed(2)}%`,
          metric: 'db_cache_hit_rate',
          value: dbMetrics.cacheHitRate,
          threshold: 80,
          timestamp: now,
          acknowledged: false,
          resolved: false
        })
      }

      // 实时系统告警
      if (realtimeMetrics.averageMessageLatency > 50) {
        alerts.push({
          id: `realtime_latency_${Date.now()}`,
          ruleId: 'realtime_latency',
          severity: realtimeMetrics.averageMessageLatency > 100 ? 'CRITICAL' : 'HIGH',
          message: `实时消息延迟过高: ${realtimeMetrics.averageMessageLatency.toFixed(2)}ms`,
          metric: 'realtime_average_latency',
          value: realtimeMetrics.averageMessageLatency,
          threshold: 50,
          timestamp: now,
          acknowledged: false,
          resolved: false
        })
      }

      // AI系统告警
      if (aiMetrics.averageResponseTime > 5000) {
        alerts.push({
          id: `ai_response_time_${Date.now()}`,
          ruleId: 'ai_response_time',
          severity: 'HIGH',
          message: `AI响应时间过长: ${(aiMetrics.averageResponseTime / 1000).toFixed(2)}s`,
          metric: 'ai_average_response_time',
          value: aiMetrics.averageResponseTime,
          threshold: 5000,
          timestamp: now,
          acknowledged: false,
          resolved: false
        })
      }

      // 保存告警到数据库
      if (alerts.length > 0) {
        await this.saveAlerts(alerts)
      }

      return alerts
    } catch (error) {
      console.error('Alert checking error:', error)
      return []
    }
  }

  /**
   * 生成性能报告
   */
  static async generatePerformanceReport(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<{
    summary: {
      overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL'
      totalAlerts: number
      criticalIssues: number
      performanceScore: number
    }
    api: APIMetrics
    database: DatabaseMetrics
    realtime: RealtimeMetrics
    ai: AIMetrics
    alerts: Alert[]
    recommendations: string[]
  }> {
    const [apiMetrics, dbMetrics, realtimeMetrics, aiMetrics] = await Promise.all([
      this.monitorAPIEndpoints(),
      this.monitorDatabase(),
      this.monitorRealtime(),
      this.monitorAI()
    ])

    const alerts = await this.checkAlertRules()
    const criticalIssues = alerts.filter(alert => alert.severity === 'CRITICAL').length

    // 计算整体健康状态
    let overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY'
    if (criticalIssues > 0) {
      overallHealth = 'CRITICAL'
    } else if (alerts.length > 0) {
      overallHealth = 'WARNING'
    }

    // 计算性能评分
    const performanceScore = this.calculatePerformanceScore(
      apiMetrics,
      dbMetrics,
      realtimeMetrics,
      aiMetrics
    )

    // 生成优化建议
    const recommendations = this.generateRecommendations(
      apiMetrics,
      dbMetrics,
      realtimeMetrics,
      aiMetrics,
      alerts
    )

    return {
      summary: {
        overallHealth,
        totalAlerts: alerts.length,
        criticalIssues,
        performanceScore
      },
      api: apiMetrics,
      database: dbMetrics,
      realtime: realtimeMetrics,
      ai: aiMetrics,
      alerts,
      recommendations
    }
  }

  // 私有辅助方法
  private static getDefaultAPIMetrics(timestamp: string): APIMetrics {
    return {
      timestamp,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      endpoints: {}
    }
  }

  private static getDefaultDatabaseMetrics(timestamp: string): DatabaseMetrics {
    return {
      timestamp,
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      cacheHitRate: 0,
      indexUsage: 0,
      lockWaits: 0,
      deadlocks: 0,
      tables: {}
    }
  }

  private static getDefaultRealtimeMetrics(timestamp: string): RealtimeMetrics {
    return {
      timestamp,
      activeConnections: 0,
      messagesPerSecond: 0,
      averageMessageLatency: 0,
      connectionFailures: 0,
      messageQueueSize: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      throughput: 0
    }
  }

  private static getDefaultAIMetrics(timestamp: string): AIMetrics {
    return {
      timestamp,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokens: 0,
      totalCost: 0,
      averageTokensPerRequest: 0,
      cacheHitRate: 0,
      tools: {}
    }
  }

  private static async getCPUUsage(): Promise<number> {
    // 简化的CPU使用率计算
    return 0
  }

  private static async saveAlerts(alerts: Alert[]): Promise<void> {
    // 保存告警到数据库
  }

  private static calculatePerformanceScore(
    api: APIMetrics,
    db: DatabaseMetrics,
    realtime: RealtimeMetrics,
    ai: AIMetrics
  ): number {
    let score = 100

    // API性能扣分
    if (api.averageResponseTime > 100) score -= 10
    if (api.errorRate > 1) score -= 15

    // 数据库性能扣分
    if (db.averageQueryTime > 50) score -= 10
    if (db.cacheHitRate < 90) score -= 10

    // 实时系统扣分
    if (realtime.averageMessageLatency > 30) score -= 10

    // AI系统扣分
    if (ai.averageResponseTime > 3000) score -= 15

    return Math.max(0, score)
  }

  private static generateRecommendations(
    api: APIMetrics,
    db: DatabaseMetrics,
    realtime: RealtimeMetrics,
    ai: AIMetrics,
    alerts: Alert[]
  ): string[] {
    const recommendations = []

    if (api.averageResponseTime > 100) {
      recommendations.push('优化API响应时间，考虑添加缓存或优化查询')
    }

    if (db.cacheHitRate < 90) {
      recommendations.push('提高数据库缓存命中率')
    }

    if (realtime.averageMessageLatency > 30) {
      recommendations.push('优化实时消息处理延迟')
    }

    if (ai.averageResponseTime > 3000) {
      recommendations.push('优化AI响应时间，考虑使用缓存或批量处理')
    }

    return recommendations
  }
}

// 监控配置
export const MONITORING_CONFIG = {
  INTERVALS: {
    API: 30000,      // 30秒
    DATABASE: 60000, // 1分钟
    REALTIME: 10000, // 10秒
    AI: 60000        // 1分钟
  },
  THRESHOLDS: {
    API_RESPONSE_TIME: 200,
    API_ERROR_RATE: 5,
    DB_QUERY_TIME: 100,
    DB_CACHE_HIT_RATE: 80,
    REALTIME_LATENCY: 50,
    AI_RESPONSE_TIME: 5000
  },
  ALERT_COOLDOWN: 300 // 5分钟
}

// 导出监控中间件
export const monitoringMiddleware = {
  /**
   * 性能指标收集中间件
   */
  metricsCollector: (handler: any) => async (req: Request) => {
    const startTime = Date.now()

    try {
      const response = await handler(req)
      const duration = Date.now() - startTime

      // 记录API性能指标
      await PerformanceMonitor.monitorAPIEndpoints()

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // 记录错误指标
      console.error('Request failed:', { duration, error })

      throw error
    }
  }
}
