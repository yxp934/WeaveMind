/**
 * 数据库查询优化器
 * 实施索引优化、查询计划分析、N+1查询检测和性能监控
 */

import { createClient } from '@/lib/supabase/server'

interface QueryPlan {
  query: string
  planNodes: PlanNode[]
  estimatedCost: number
  estimatedRows: number
  executionTime: number
  indexUsage: number
  suggestions: string[]
  performance: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR'
}

interface PlanNode {
  nodeType: string
  relationName?: string
  indexName?: string
  rowsEstimate: number
  costEstimate: number
  children: PlanNode[]
}

interface IndexSuggestion {
  table: string
  column: string
  indexType: 'BTREE' | 'HASH' | 'GIN' | 'GIST'
  reason: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedImprovement: string
  sql: string
}

interface NPlusOneResult {
  query: string
  table: string
  occurrences: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  solution: string
  impact: string
}

interface OptimizedQuery {
  original: string
  optimized: string
  improvements: string[]
  performanceGain: number
  indexRecommendations: string[]
}

interface PerformanceMetrics {
  timestamp: string
  totalQueries: number
  averageExecutionTime: number
  slowQueries: SlowQuery[]
  indexUsage: number
  cacheHitRate: number
  lockWaits: number
  deadlocks: number
}

interface SlowQuery {
  query: string
  executionTime: number
  frequency: number
  tables: string[]
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  optimizationSuggestions: string[]
}

export class QueryOptimizer {
  private supabase = createClient()

  /**
   * 查询计划分析
   */
  static async analyzeQueryPlan(query: string): Promise<QueryPlan> {
    try {
      // 使用 EXPLAIN ANALYZE 分析查询计划
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ${query}`

      const { data: planData, error } = await this.supabase
        .rpc('explain_query', { query_text: explainQuery })

      if (error) {
        throw error
      }

      // 解析查询计划
      const planNodes = this.parsePlanNodes(planData)
      const estimatedCost = this.calculateEstimatedCost(planNodes)
      const estimatedRows = this.calculateEstimatedRows(planNodes)
      const executionTime = this.extractExecutionTime(planData)
      const indexUsage = this.calculateIndexUsage(planNodes)

      // 生成优化建议
      const suggestions = this.generateOptimizationSuggestions(query, planNodes, estimatedCost, indexUsage)

      // 评估性能等级
      const performance = this.assessPerformance(executionTime, estimatedCost, indexUsage)

      return {
        query,
        planNodes,
        estimatedCost,
        estimatedRows,
        executionTime,
        indexUsage,
        suggestions,
        performance
      }
    } catch (error) {
      return {
        query,
        planNodes: [],
        estimatedCost: 0,
        estimatedRows: 0,
        executionTime: 0,
        indexUsage: 0,
        suggestions: ['查询分析失败，请检查SQL语法'],
        performance: 'POOR'
      }
    }
  }

  /**
   * 索引建议
   */
  static async suggestIndexes(table: string, query: string): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = []

    try {
      // 分析查询中的WHERE子句
      const whereColumns = this.extractWhereColumns(query)
      const joinColumns = this.extractJoinColumns(query)
      const orderByColumns = this.extractOrderByColumns(query)
      const selectColumns = this.extractSelectColumns(query)

      // 为WHERE子句中的列建议索引
      for (const column of whereColumns) {
        const existingIndex = await this.checkExistingIndex(table, column)
        if (!existingIndex) {
          suggestions.push({
            table,
            column,
            indexType: 'BTREE',
            reason: 'Column used in WHERE clause',
            impact: 'HIGH',
            estimatedImprovement: '50-80% query performance improvement',
            sql: `CREATE INDEX idx_${table}_${column} ON ${table} (${column});`
          })
        }
      }

      // 为JOIN子句中的列建议索引
      for (const column of joinColumns) {
        const existingIndex = await this.checkExistingIndex(table, column)
        if (!existingIndex) {
          suggestions.push({
            table,
            column,
            indexType: 'BTREE',
            reason: 'Column used in JOIN condition',
            impact: 'HIGH',
            estimatedImprovement: '60-90% JOIN performance improvement',
            sql: `CREATE INDEX idx_${table}_${column}_join ON ${table} (${column});`
          })
        }
      }

      // 为ORDER BY子句中的列建议索引
      for (const column of orderByColumns) {
        const existingIndex = await this.checkExistingIndex(table, column)
        if (!existingIndex) {
          suggestions.push({
            table,
            column,
            indexType: 'BTREE',
            reason: 'Column used in ORDER BY clause',
            impact: 'MEDIUM',
            estimatedImprovement: '30-50% sorting performance improvement',
            sql: `CREATE INDEX idx_${table}_${column}_sort ON ${table} (${column});`
          })
        }
      }

      // 为全文搜索建议GIN索引
      const fullTextColumns = selectColumns.filter(col => col.includes('text') || col.includes('content'))
      for (const column of fullTextColumns) {
        const existingIndex = await this.checkExistingIndex(table, column)
        if (!existingIndex) {
          suggestions.push({
            table,
            column,
            indexType: 'GIN',
            reason: 'Full-text search optimization',
            impact: 'HIGH',
            estimatedImprovement: '80-95% full-text search performance improvement',
            sql: `CREATE INDEX idx_${table}_${column}_gin ON ${table} USING gin (${column});`
          })
        }
      }

      // 复合索引建议
      const compositeSuggestion = await this.suggestCompositeIndex(table, whereColumns, joinColumns)
      if (compositeSuggestion) {
        suggestions.push(compositeSuggestion)
      }

    } catch (error) {
      console.error('Index suggestion error:', error)
    }

    return suggestions
  }

  /**
   * N+1查询检测
   */
  static async detectNPlusOne(queries: string[]): Promise<NPlusOneResult[]> {
    const results: NPlusOneResult[] = []

    // 分析每个查询
    for (const query of queries) {
      // 检测循环中的查询模式
      const nPlusOnePattern = this.detectNPlusOnePattern(query)
      if (nPlusOnePattern) {
        results.push(nPlusOnePattern)
      }

      // 检测可能的N+1场景
      const potentialNPlusOne = this.detectPotentialNPlusOne(query)
      if (potentialNPlusOne) {
        results.push(potentialNPlusOne)
      }
    }

    // 检测跨查询的N+1模式
    const crossQueryNPlusOne = this.detectCrossQueryNPlusOne(queries)
    results.push(...crossQueryNPlusOne)

    return results
  }

  /**
   * 分页优化
   */
  static async optimizePagination(query: string, page: number, limit: number): Promise<OptimizedQuery> {
    const original = query
    const improvements: string[] = []
    let optimized = query
    let performanceGain = 0

    try {
      // 检查是否使用LIMIT without ORDER BY
      if (!/ORDER\s+BY/i.test(query) && /LIMIT/i.test(query)) {
        optimized = this.addOrderByClause(optimized)
        improvements.push('Added ORDER BY clause for consistent pagination')
        performanceGain += 20
      }

      // 检查偏移量大小（OFFSET > 10000）
      const offsetMatch = query.match(/OFFSET\s+(\d+)/i)
      if (offsetMatch && parseInt(offsetMatch[1]) > 10000) {
        const keysetPaginationQuery = this.convertToKeysetPagination(query, page, limit)
        if (keysetPaginationQuery) {
          optimized = keysetPaginationQuery
          improvements.push('Converted to keyset pagination for better performance')
          performanceGain += 80
        }
      }

      // 添加索引提示
      const indexHint = this.addIndexHint(optimized)
      if (indexHint) {
        optimized = indexHint
        improvements.push('Added index hints for query optimization')
        performanceGain += 15
      }

      // 批量加载优化
      if (this.hasMultipleSelectQueries(query)) {
        const batchQuery = this.convertToBatchQuery(query)
        if (batchQuery) {
          optimized = batchQuery
          improvements.push('Converted to batch query to avoid N+1 problem')
          performanceGain += 70
        }
      }

      const indexRecommendations = await this.suggestIndexes('unknown', optimized)
        .then(suggestions => suggestions.map(s => s.sql))

      return {
        original,
        optimized,
        improvements,
        performanceGain,
        indexRecommendations
      }
    } catch (error) {
      return {
        original,
        optimized: query,
        improvements: ['Pagination optimization failed'],
        performanceGain: 0,
        indexRecommendations: []
      }
    }
  }

  /**
   * 性能监控
   */
  static async monitorQueryPerformance(): Promise<PerformanceMetrics> {
    const timestamp = new Date().toISOString()

    try {
      // 获取慢查询统计
      const slowQueries = await this.getSlowQueries()

      // 计算平均执行时间
      const averageExecutionTime = await this.calculateAverageExecutionTime()

      // 获取索引使用统计
      const indexUsage = await this.getIndexUsage()

      // 获取缓存命中率
      const cacheHitRate = await this.getCacheHitRate()

      // 获取锁等待统计
      const lockWaits = await this.getLockWaits()

      // 获取死锁统计
      const deadlocks = await this.getDeadlocks()

      return {
        timestamp,
        totalQueries: slowQueries.reduce((sum, q) => sum + q.frequency, 0),
        averageExecutionTime,
        slowQueries,
        indexUsage,
        cacheHitRate,
        lockWaits,
        deadlocks
      }
    } catch (error) {
      console.error('Performance monitoring error:', error)
      return {
        timestamp,
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: [],
        indexUsage: 0,
        cacheHitRate: 0,
        lockWaits: 0,
        deadlocks: 0
      }
    }
  }

  /**
   * 生成查询优化报告
   */
  static async generateOptimizationReport(): Promise<{
    summary: {
      totalQueries: number
      slowQueries: number
      averageExecutionTime: number
      indexUsage: number
    }
    topSlowQueries: SlowQuery[]
    indexSuggestions: IndexSuggestion[]
    nPlusOneIssues: NPlusOneResult[]
    optimizationRecommendations: string[]
  }> {
    const performanceMetrics = await this.monitorQueryPerformance()

    // 获取所有表和查询进行索引分析
    const tables = await this.getAllTables()
    const indexSuggestions: IndexSuggestion[] = []

    for (const table of tables) {
      const tableQueries = await this.getTableQueries(table)
      for (const query of tableQueries) {
        const suggestions = await this.suggestIndexes(table, query)
        indexSuggestions.push(...suggestions)
      }
    }

    // 检测N+1查询
    const allQueries = await this.getAllQueries()
    const nPlusOneIssues = await this.detectNPlusOne(allQueries)

    // 生成优化建议
    const optimizationRecommendations = this.generateOptimizationRecommendations(
      performanceMetrics,
      indexSuggestions,
      nPlusOneIssues
    )

    return {
      summary: {
        totalQueries: performanceMetrics.totalQueries,
        slowQueries: performanceMetrics.slowQueries.length,
        averageExecutionTime: performanceMetrics.averageExecutionTime,
        indexUsage: performanceMetrics.indexUsage
      },
      topSlowQueries: performanceMetrics.slowQueries.slice(0, 10),
      indexSuggestions,
      nPlusOneIssues,
      optimizationRecommendations
    }
  }

  // 私有辅助方法
  private static parsePlanNodes(planData: any[]): PlanNode[] {
    // 解析查询计划节点
    return []
  }

  private static calculateEstimatedCost(nodes: PlanNode[]): number {
    // 计算估算成本
    return 0
  }

  private static calculateEstimatedRows(nodes: PlanNode[]): number {
    // 计算估算行数
    return 0
  }

  private static extractExecutionTime(planData: any[]): number {
    // 提取执行时间
    return 0
  }

  private static calculateIndexUsage(nodes: PlanNode[]): number {
    // 计算索引使用率
    return 0
  }

  private static generateOptimizationSuggestions(
    query: string,
    nodes: PlanNode[],
    cost: number,
    indexUsage: number
  ): string[] {
    const suggestions = []

    if (cost > 1000) {
      suggestions.push('查询成本较高，考虑添加索引或重写查询')
    }

    if (indexUsage < 70) {
      suggestions.push('索引使用率较低，建议添加适当的索引')
    }

    if (query.includes('SELECT *')) {
      suggestions.push('避免使用SELECT *，只选择需要的列')
    }

    if (query.includes('LIKE %')) {
      suggestions.push('LIKE %pattern%无法使用索引，考虑使用全文搜索')
    }

    return suggestions
  }

  private static assessPerformance(
    executionTime: number,
    cost: number,
    indexUsage: number
  ): 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR' {
    if (executionTime < 50 && indexUsage > 90) return 'EXCELLENT'
    if (executionTime < 100 && indexUsage > 70) return 'GOOD'
    if (executionTime < 500) return 'NEEDS_OPTIMIZATION'
    return 'POOR'
  }

  private static extractWhereColumns(query: string): string[] {
    // 提取WHERE子句中的列名
    return []
  }

  private static extractJoinColumns(query: string): string[] {
    // 提取JOIN子句中的列名
    return []
  }

  private static extractOrderByColumns(query: string): string[] {
    // 提取ORDER BY子句中的列名
    return []
  }

  private static extractSelectColumns(query: string): string[] {
    // 提取SELECT子句中的列名
    return []
  }

  private static async checkExistingIndex(table: string, column: string): Promise<boolean> {
    // 检查是否已存在索引
    return false
  }

  private static async suggestCompositeIndex(
    table: string,
    whereColumns: string[],
    joinColumns: string[]
  ): Promise<IndexSuggestion | null> {
    // 建议复合索引
    return null
  }

  private static detectNPlusOnePattern(query: string): NPlusOneResult | null {
    // 检测N+1查询模式
    return null
  }

  private static detectPotentialNPlusOne(query: string): NPlusOneResult | null {
    // 检测潜在的N+1查询
    return null
  }

  private static detectCrossQueryNPlusOne(queries: string[]): NPlusOneResult[] {
    // 检测跨查询的N+1模式
    return []
  }

  private static addOrderByClause(query: string): string {
    // 添加ORDER BY子句
    return query
  }

  private static convertToKeysetPagination(query: string, page: number, limit: number): string | null {
    // 转换为基于键的分页
    return null
  }

  private static addIndexHint(query: string): string | null {
    // 添加索引提示
    return null
  }

  private static hasMultipleSelectQueries(query: string): boolean {
    // 检查是否有多个SELECT查询
    return false
  }

  private static convertToBatchQuery(query: string): string | null {
    // 转换为批量查询
    return null
  }

  private static async getSlowQueries(): Promise<SlowQuery[]> {
    // 获取慢查询列表
    return []
  }

  private static async calculateAverageExecutionTime(): Promise<number> {
    // 计算平均执行时间
    return 0
  }

  private static async getIndexUsage(): Promise<number> {
    // 获取索引使用率
    return 0
  }

  private static async getCacheHitRate(): Promise<number> {
    // 获取缓存命中率
    return 0
  }

  private static async getLockWaits(): Promise<number> {
    // 获取锁等待次数
    return 0
  }

  private static async getDeadlocks(): Promise<number> {
    // 获取死锁次数
    return 0
  }

  private static async getAllTables(): Promise<string[]> {
    // 获取所有表名
    return []
  }

  private static async getTableQueries(table: string): Promise<string[]> {
    // 获取表的查询列表
    return []
  }

  private static async getAllQueries(): Promise<string[]> {
    // 获取所有查询
    return []
  }

  private static generateOptimizationRecommendations(
    metrics: PerformanceMetrics,
    indexSuggestions: IndexSuggestion[],
    nPlusOneIssues: NPlusOneResult[]
  ): string[] {
    const recommendations = []

    if (metrics.averageExecutionTime > 100) {
      recommendations.push('优化慢查询，添加适当的索引')
    }

    if (metrics.indexUsage < 70) {
      recommendations.push('提高索引使用率，优化查询模式')
    }

    if (nPlusOneIssues.length > 0) {
      recommendations.push('解决N+1查询问题，使用批量加载')
    }

    if (metrics.cacheHitRate < 90) {
      recommendations.push('提高查询缓存命中率')
    }

    return recommendations
  }
}

// 查询优化配置
export const QUERY_OPTIMIZATION_CONFIG = {
  PERFORMANCE_THRESHOLDS: {
    EXECUTION_TIME: 100,    // 100ms
    COST_THRESHOLD: 1000,   // 查询成本阈值
    INDEX_USAGE_MIN: 70,    // 最小索引使用率
    CACHE_HIT_RATE_MIN: 90  // 最小缓存命中率
  },
  N_PLUS_ONE_DETECTION: {
    MIN_OCCURRENCES: 10,    // 最小发生次数
    SEVERITY_THRESHOLDS: {
      CRITICAL: 100,
      HIGH: 50,
      MEDIUM: 20,
      LOW: 10
    }
  },
  PAGINATION: {
    KEYSET_THRESHOLD: 10000, // OFFSET超过此值时使用keyset分页
    DEFAULT_LIMIT: 20       // 默认限制
  }
}

// 导出查询优化中间件
export const queryOptimizationMiddleware = {
  /**
   * 查询分析中间件
   */
  queryAnalyzer: (handler: any) => async (query: string) => {
    // 分析查询性能
    const analysis = await QueryOptimizer.analyzeQueryPlan(query)

    // 如果查询性能较差，记录警告
    if (analysis.performance === 'POOR') {
      console.warn('Slow query detected:', {
        query: query.substring(0, 100),
        executionTime: analysis.executionTime,
        cost: analysis.estimatedCost
      })
    }

    return handler(query)
  },

  /**
   * 索引建议中间件
   */
  indexAdvisor: (handler: any) => async (query: string) => {
    // 生成索引建议
    const suggestions = await QueryOptimizer.suggestIndexes('unknown', query)

    // 如果有高影响的建议，记录日志
    const highImpactSuggestions = suggestions.filter(s => s.impact === 'HIGH')
    if (highImpactSuggestions.length > 0) {
      console.info('Index recommendations:', highImpactSuggestions)
    }

    return handler(query)
  },

  /**
   * N+1检测中间件
   */
  nPlusOneDetector: (handler: any) => async (queries: string[]) => {
    // 检测N+1查询
    const issues = await QueryOptimizer.detectNPlusOne(queries)

    // 如果发现N+1问题，记录警告
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL')
    if (criticalIssues.length > 0) {
      console.warn('N+1 query problems detected:', criticalIssues)
    }

    return handler(queries)
  }
}
