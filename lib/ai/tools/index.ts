/**
 * Phase 6: AI Tools Index and Registry
 *
 * 统一的AI工具注册表和导出中心
 * 整合所有15个高级AI工具，支持统一调用和管理
 */

import { z } from 'zod'

// 工具分类枚举
export enum ToolCategory {
  DISCUSSION_MANAGEMENT = 'discussion_management',
  SETTINGS_OPTIMIZATION = 'settings_optimization',
  LEARNING_PATH = 'learning_path',
  PERSONALIZATION = 'personalization',
}

// 工具优先级枚举
export enum ToolPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 工具状态枚举
export enum ToolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  DEPRECATED = 'deprecated',
}

// 基础工具接口
export interface AIToolDefinition {
  id: string
  name: string
  description: string
  category: ToolCategory
  priority: ToolPriority
  status: ToolStatus
  version: string
  author: string
  tags: string[]
  parameters: Record<string, any>
  execute: (params: any) => Promise<any>
  validate: (params: any) => boolean
  estimatedExecutionTime: number // 预估执行时间（毫秒）
  rateLimitPerMinute: number // 每分钟调用限制
  requiredPermissions: string[] // 所需权限
  dependencies: string[] // 依赖的工具ID
  metadata: {
    complexity: 'simple' | 'moderate' | 'complex' | 'advanced'
    useCases: string[]
    successMetrics: string[]
    failureRecovery: string[]
    cacheStrategy?: 'none' | 'short' | 'medium' | 'long'
  }
}

// 工具执行结果接口
export interface ToolExecutionResult {
  success: boolean
  data?: any
  error?: string
  executionTime: number
  toolId: string
  timestamp: string
  metadata?: {
    tokensUsed?: number
    cacheHit?: boolean
    fallbackUsed?: boolean
    retryCount?: number
  }
}

// 工具注册表类
export class AIToolRegistry {
  private tools: Map<string, AIToolDefinition> = new Map()
  private toolCategories: Map<ToolCategory, Set<string>> = new Map()
  private toolPriorities: Map<ToolPriority, Set<string>> = new Map()

  constructor() {
    this.initializeCategories()
  }

  private initializeCategories() {
    // 初始化工具分类映射
    Object.values(ToolCategory).forEach(category => {
      this.toolCategories.set(category, new Set())
    })

    Object.values(ToolPriority).forEach(priority => {
      this.toolPriorities.set(priority, new Set())
    })
  }

  /**
   * 注册工具
   */
  registerTool(tool: AIToolDefinition): void {
    this.tools.set(tool.id, tool)
    this.toolCategories.get(tool.category)?.add(tool.id)
    this.toolPriorities.get(tool.priority)?.add(tool.id)
  }

  /**
   * 批量注册工具
   */
  registerTools(tools: AIToolDefinition[]): void {
    tools.forEach(tool => this.registerTool(tool))
  }

  /**
   * 获取工具
   */
  getTool(toolId: string): AIToolDefinition | undefined {
    return this.tools.get(toolId)
  }

  /**
   * 获取所有工具
   */
  getAllTools(): AIToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * 按分类获取工具
   */
  getToolsByCategory(category: ToolCategory): AIToolDefinition[] {
    const toolIds = this.toolCategories.get(category) || new Set()
    return Array.from(toolIds).map(id => this.tools.get(id)).filter(Boolean) as AIToolDefinition[]
  }

  /**
   * 按优先级获取工具
   */
  getToolsByPriority(priority: ToolPriority): AIToolDefinition[] {
    const toolIds = this.toolPriorities.get(priority) || new Set()
    return Array.from(toolIds).map(id => this.tools.get(id)).filter(Boolean) as AIToolDefinition[]
  }

  /**
   * 按标签搜索工具
   */
  searchToolsByTags(tags: string[]): AIToolDefinition[] {
    return this.getAllTools().filter(tool =>
      tags.some(tag => tool.tags.includes(tag))
    )
  }

  /**
   * 验证工具参数
   */
  validateToolParameters(toolId: string, params: any): boolean {
    const tool = this.tools.get(toolId)
    if (!tool) return false

    try {
      return tool.validate(params)
    } catch (error) {
      console.error(`Tool parameter validation failed for ${toolId}:`, error)
      return false
    }
  }

  /**
   * 检查工具依赖
   */
  checkDependencies(toolId: string): { satisfied: boolean; missing: string[] } {
    const tool = this.tools.get(toolId)
    if (!tool) {
      return { satisfied: false, missing: [toolId] }
    }

    const missing = tool.dependencies.filter(dep => !this.tools.has(dep))
    return {
      satisfied: missing.length === 0,
      missing
    }
  }

  /**
   * 获取工具统计信息
   */
  getStatistics() {
    const totalTools = this.tools.size
    const toolsByCategory = Object.values(ToolCategory).map(category => ({
      category,
      count: this.getToolsByCategory(category).length
    }))
    const toolsByPriority = Object.values(ToolPriority).map(priority => ({
      priority,
      count: this.getToolsByPriority(priority).length
    }))
    const toolsByStatus = this.getAllTools().reduce((acc, tool) => {
      acc[tool.status] = (acc[tool.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalTools,
      toolsByCategory,
      toolsByPriority,
      toolsByStatus,
      totalEstimatedExecutionTime: this.getAllTools().reduce((sum, tool) => sum + tool.estimatedExecutionTime, 0),
    }
  }
}

// 工具执行器类
export class AIToolExecutor {
  private registry: AIToolRegistry
  private executionCache: Map<string, { result: any; timestamp: number; ttl: number }> = new Map()
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map()

  constructor(registry: AIToolRegistry) {
    this.registry = registry
  }

  /**
   * 执行工具
   */
  async executeTool(
    toolId: string,
    params: any,
    options: {
      useCache?: boolean
      forceExecution?: boolean
      timeout?: number
      retries?: number
    } = {}
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now()
    const { useCache = true, forceExecution = false, timeout = 30000, retries = 2 } = options

    try {
      // 检查工具是否存在
      const tool = this.registry.getTool(toolId)
      if (!tool) {
        return {
          success: false,
          error: `Tool ${toolId} not found`,
          executionTime: Date.now() - startTime,
          toolId,
          timestamp: new Date().toISOString(),
        }
      }

      // 检查工具状态
      if (tool.status !== ToolStatus.ACTIVE && !forceExecution) {
        return {
          success: false,
          error: `Tool ${toolId} is not active`,
          executionTime: Date.now() - startTime,
          toolId,
          timestamp: new Date().toISOString(),
        }
      }

      // 检查参数验证
      if (!this.registry.validateToolParameters(toolId, params)) {
        return {
          success: false,
          error: `Invalid parameters for tool ${toolId}`,
          executionTime: Date.now() - startTime,
          toolId,
          timestamp: new Date().toISOString(),
        }
      }

      // 检查依赖
      const deps = this.registry.checkDependencies(toolId)
      if (!deps.satisfied) {
        return {
          success: false,
          error: `Missing dependencies for tool ${toolId}: ${deps.missing.join(', ')}`,
          executionTime: Date.now() - startTime,
          toolId,
          timestamp: new Date().toISOString(),
        }
      }

      // 检查速率限制
      if (!this.checkRateLimit(toolId)) {
        return {
          success: false,
          error: `Rate limit exceeded for tool ${toolId}`,
          executionTime: Date.now() - startTime,
          toolId,
          timestamp: new Date().toISOString(),
        }
      }

      // 检查缓存
      const cacheKey = this.generateCacheKey(toolId, params)
      if (useCache && tool.metadata.cacheStrategy && tool.metadata.cacheStrategy !== 'none') {
        const cachedResult = this.getCachedResult(cacheKey, tool.metadata.cacheStrategy)
        if (cachedResult) {
          return {
            success: true,
            data: cachedResult,
            executionTime: Date.now() - startTime,
            toolId,
            timestamp: new Date().toISOString(),
            metadata: { cacheHit: true }
          }
        }
      }

      // 执行工具（带重试机制）
      let result
      let retryCount = 0
      while (retryCount <= retries) {
        try {
          result = await this.executeWithTimeout(() => tool.execute(params), params, timeout)
          break
        } catch (error) {
          retryCount++
          if (retryCount > retries) {
            throw error
          }
          // 等待重试
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
        }
      }

      // 缓存结果
      if (useCache && tool.metadata.cacheStrategy && tool.metadata.cacheStrategy !== 'none') {
        this.cacheResult(cacheKey, result, tool.metadata.cacheStrategy)
      }

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        toolId,
        timestamp: new Date().toISOString(),
        metadata: {
          cacheHit: false,
          retryCount,
          tokensUsed: result?.tokensUsed || 0
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        toolId,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * 批量执行工具
   */
  async executeTools(
    toolExecutions: Array<{ toolId: string; params: any; options?: any }>,
    options: {
      parallel?: boolean
      stopOnError?: boolean
    } = {}
  ): Promise<{ results: ToolExecutionResult[]; summary: any }> {
    const { parallel = true, stopOnError = false } = options
    const results: ToolExecutionResult[] = []

    if (parallel) {
      // 并行执行
      const promises = toolExecutions.map(async (execution, index) => {
        try {
          const result = await this.executeTool(execution.toolId, execution.params, execution.options)
          return { index, result }
        } catch (error) {
          return {
            index,
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Execution failed',
              executionTime: 0,
              toolId: execution.toolId,
              timestamp: new Date().toISOString(),
            } as ToolExecutionResult
          }
        }
      })

      const settledResults = await Promise.all(promises)

      // 按原始顺序排列结果
      settledResults.sort((a, b) => a.index - b.index)
      settledResults.forEach(({ result }) => results.push(result))

    } else {
      // 串行执行
      for (const execution of toolExecutions) {
        const result = await this.executeTool(execution.toolId, execution.params, execution.options)
        results.push(result)

        if (stopOnError && !result.success) {
          break
        }
      }
    }

    // 生成执行摘要
    const summary = {
      totalExecutions: results.length,
      successfulExecutions: results.filter(r => r.success).length,
      failedExecutions: results.filter(r => !r.success).length,
      totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0),
      averageExecutionTime: results.length > 0 ? results.reduce((sum, r) => sum + r.executionTime, 0) / results.length : 0,
      cacheHitRate: results.filter(r => r.metadata?.cacheHit).length / results.length,
    }

    return { results, summary }
  }

  /**
   * 获取工具执行历史
   */
  getExecutionHistory(toolId?: string, limit: number = 100): any[] {
    // 这里应该实现实际的执行历史记录存储
    // 暂时返回空数组，需要集成数据库或缓存系统
    return []
  }

  private checkRateLimit(toolId: string): boolean {
    const tool = this.registry.getTool(toolId)
    if (!tool) return false

    const rateLimiter = this.rateLimiters.get(toolId) || { count: 0, resetTime: Date.now() + 60000 }
    const now = Date.now()

    if (now > rateLimiter.resetTime) {
      rateLimiter.count = 0
      rateLimiter.resetTime = now + 60000 // 重置时间窗口
    }

    if (rateLimiter.count >= tool.rateLimitPerMinute) {
      return false
    }

    rateLimiter.count++
    this.rateLimiters.set(toolId, rateLimiter)
    return true
  }

  private generateCacheKey(toolId: string, params: any): string {
    return `${toolId}_${Buffer.from(JSON.stringify(params)).toString('base64')}`
  }

  private getCachedResult(cacheKey: string, cacheStrategy: string): any | null {
    const cached = this.executionCache.get(cacheKey)
    if (!cached) return null

    const now = Date.now()
    if (now > cached.timestamp + cached.ttl) {
      this.executionCache.delete(cacheKey)
      return null
    }

    return cached.result
  }

  private cacheResult(cacheKey: string, result: any, cacheStrategy: string): void {
    const ttlMap = {
      'short': 5 * 60 * 1000,      // 5分钟
      'medium': 30 * 60 * 1000,    // 30分钟
      'long': 2 * 60 * 60 * 1000,  // 2小时
    }

    const ttl = ttlMap[cacheStrategy as keyof typeof ttlMap] || ttlMap.medium

    this.executionCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl
    })
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, params: any, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Tool execution timeout'))
      }, timeout)

      fn().then(result => {
        clearTimeout(timeoutId)
        resolve(result)
      }).catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
    })
  }
}

// 创建全局工具注册表实例
export const toolRegistry = new AIToolRegistry()

// 创建全局工具执行器实例
export const toolExecutor = new AIToolExecutor(toolRegistry)

/**
 * 工具工具函数
 */
export const toolUtils = {
  /**
   * 验证工具参数
   */
  validateParameters: (schema: z.ZodSchema, params: any): { valid: boolean; errors: string[] } => {
    try {
      schema.parse(params)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.issues.map(err => `${err.path.map(p => typeof p === 'string' ? p : p.toString()).join('.')}: ${err.message}`)
        }
      }
      return { valid: false, errors: ['Unknown validation error'] }
    }
  },

  /**
   * 格式化工具执行结果
   */
  formatExecutionResult: (result: ToolExecutionResult, includeMetadata: boolean = false): any => {
    const formatted = {
      success: result.success,
      toolId: result.toolId,
      executionTime: result.executionTime,
      timestamp: result.timestamp,
    }

    if (result.success && result.data) {
      (formatted as any).data = result.data
    } else if (!result.success && result.error) {
      (formatted as any).error = result.error
    }

    if (includeMetadata && result.metadata) {
      (formatted as any).metadata = result.metadata
    }

    return formatted
  },

  /**
   * 计算工具性能指标
   */
  calculatePerformanceMetrics: (results: ToolExecutionResult[]): any => {
    const successfulResults = results.filter(r => r.success)
    const failedResults = results.filter(r => !r.success)

    return {
      totalExecutions: results.length,
      successRate: results.length > 0 ? successfulResults.length / results.length : 0,
      failureRate: results.length > 0 ? failedResults.length / results.length : 0,
      averageExecutionTime: successfulResults.length > 0 ?
        successfulResults.reduce((sum, r) => sum + r.executionTime, 0) / successfulResults.length : 0,
      minExecutionTime: successfulResults.length > 0 ?
        Math.min(...successfulResults.map(r => r.executionTime)) : 0,
      maxExecutionTime: successfulResults.length > 0 ?
        Math.max(...successfulResults.map(r => r.executionTime)) : 0,
      cacheHitRate: results.length > 0 ?
        results.filter(r => r.metadata?.cacheHit).length / results.length : 0,
    }
  },

  /**
   * 生成工具文档
   */
  generateToolDocumentation: (tool: AIToolDefinition): string => {
    return `# ${tool.name}

## 描述
${tool.description}

## 分类
${tool.category}

## 优先级
${tool.priority}

## 状态
${tool.status}

## 参数
\`\`\`json
${JSON.stringify(tool.parameters, null, 2)}
\`\`\`

## 使用场景
${tool.metadata.useCases.join(', ')}

## 性能指标
- 预估执行时间: ${tool.estimatedExecutionTime}ms
- 每分钟调用限制: ${tool.rateLimitPerMinute}
- 复杂度: ${tool.metadata.complexity}

## 依赖
${tool.dependencies.length > 0 ? tool.dependencies.join(', ') : '无依赖'}

## 标签
${tool.tags.join(', ')}
`
  }
}

// 导出所有工具模块
export * from './discussion-tools'
export * from './settings-tools'
export * from './learning-path-tools'
export * from './personalization-tools'

// 默认导出
export default {
  registry: toolRegistry,
  executor: toolExecutor,
  utils: toolUtils,
  ToolCategory,
  ToolPriority,
  ToolStatus,
}
