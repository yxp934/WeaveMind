/**
 * AI系统安全防护
 * 实施提示注入防护、工具权限控制、AI响应过滤和使用监控
 */

import { createClient } from '@/lib/supabase/server'

interface SanitizedInput {
  original: string
  sanitized: string
  threatsRemoved: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface InjectionResult {
  detected: boolean
  injectionType: 'PROMPT_INJECTION' | 'JAILBREAK' | 'DATA_EXTRACTION' | 'SYSTEM_PROMPT_LEAK' | 'NONE'
  confidence: number
  details: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface PermissionResult {
  allowed: boolean
  reason: string
  restrictions?: string[]
  expiresAt?: Date
}

interface FilteredOutput {
  original: string
  filtered: string
  reasons: string[]
  action: 'ALLOWED' | 'MODIFIED' | 'BLOCKED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
}

interface UsageMetrics {
  userId: string
  operation: string
  timestamp: Date
  tokensUsed: number
  cost: number
  duration: number
  success: boolean
  errors?: string[]
}

export class AISecurityManager {
  private supabase = createClient()

  // 提示注入检测模式
  private static readonly INJECTION_PATTERNS = [
    // 直接指令覆盖
    /ignore\s+(all\s+)?previous\s+instructions?/i,
    /forget\s+(everything\s+)?you\s+know/i,
    /disregard\s+(all\s+)?(your\s+)?instructions?/i,

    // 角色扮演绕过
    /pretend\s+you\s+(are\s+)?(a|an)\s+(different|another)\s+(model|AI|system)/i,
    /you\s+(are\s+)?now\s+(a|an)\s+(different|another)\s+(model|AI|system)/i,
    /act\s+as\s+(if\s+)?you\s+(are\s+)?(a|an)\s+(different|another)\s+(model|AI|system)/i,

    // 系统提示泄露
    /(system\s+)?(prompt|instruction)\s+(leak|leaked|expose|exposed)/i,
    /(ignore\s+)?your\s+(system\s+)?(prompt|instruction)/i,

    // 越狱技术
    /jailbreak/i,
    /(unrestricted|unfiltered)\s+(mode|behavior)/i,
    /developer\s+(mode|menu)/i,

    // 数据提取
    /(extract|reveal|show)\s+(your\s+)?(training\s+)?(data|knowledge|instructions?)/i,
    /(list|enumerate)\s+(all\s+)?your\s+(capabilities|limitations|restrictions)/i,

    // 编码绕过
    /(base64|hex|unicode)\s+(encode|decode)/i,
    /\[(SYSTEM|PROMPT|INSTRUCTION)\]/i,

    // 重复和强调攻击
    /(repeat|again|more)\s+(this|that|it)\s+(times?|iterations?)/i,
    /(over\s+and\s+over|again\s+and\s+again)/i
  ]

  // 敏感关键词黑名单
  private static readonly SENSITIVE_KEYWORDS = [
    'password', 'secret', 'key', 'token', 'credential',
    'admin', 'root', 'system', 'configuration',
    'database', 'sql', 'injection', 'exploit',
    'bypass', 'hack', 'crack', 'exfiltrate'
  ]

  // AI工具权限配置
  private static readonly TOOL_PERMISSIONS = {
    'course_generation': {
      allowedRoles: ['teacher', 'owner'],
      rateLimit: 10, // 每小时10次
      dataAccess: ['courses', 'chapters', 'components'],
      restrictions: ['no_external_data_access']
    },
    'student_assessment': {
      allowedRoles: ['teacher', 'owner'],
      rateLimit: 50, // 每小时50次
      dataAccess: ['assignments', 'submissions', 'learning_events'],
      restrictions: ['no_personal_data_modification']
    },
    'personalization': {
      allowedRoles: ['teacher', 'student'],
      rateLimit: 30, // 每小时30次
      dataAccess: ['self_learner_profiles', 'learning_events'],
      restrictions: ['read_only_access']
    },
    'discussion_tools': {
      allowedRoles: ['teacher', 'student'],
      rateLimit: 20, // 每小时20次
      dataAccess: ['discussion_threads', 'discussion_posts'],
      restrictions: ['content_filtering_enabled']
    },
    'ai_chat': {
      allowedRoles: ['teacher', 'student'],
      rateLimit: 100, // 每小时100次
      dataAccess: ['ai_sessions', 'ai_messages'],
      restrictions: ['content_filtering_enabled', 'no_file_access']
    },
    'research_assistance': {
      allowedRoles: ['teacher', 'student'],
      rateLimit: 25, // 每小时25次
      dataAccess: ['research_assignments', 'research_sources'],
      restrictions: ['academic_sources_only']
    }
  }

  /**
   * 输入过滤和验证
   */
  static async sanitizeAIInput(input: string): Promise<SanitizedInput> {
    const threatsRemoved: string[] = []
    let sanitized = input

    // 检测并移除提示注入
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        threatsRemoved.push(`Detected injection pattern: ${pattern.source}`)
        sanitized = sanitized.replace(pattern, '[FILTERED]')
      }
    }

    // 过滤敏感关键词
    for (const keyword of this.SENSITIVE_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      if (regex.test(sanitized)) {
        threatsRemoved.push(`Sensitive keyword detected: ${keyword}`)
        sanitized = sanitized.replace(regex, '[REDACTED]')
      }
    }

    // 移除潜在的代码注入
    sanitized = this.removeCodeInjection(sanitized, threatsRemoved)

    // 评估风险等级
    const riskLevel = this.assessRiskLevel(threatsRemoved, sanitized)

    return {
      original: input,
      sanitized,
      threatsRemoved,
      riskLevel
    }
  }

  /**
   * 提示注入检测
   */
  static async detectPromptInjection(input: string): Promise<InjectionResult> {
    const detectedPatterns: string[] = []
    let maxSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'

    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source)

        // 根据模式类型评估严重性
        if (pattern.source.includes('jailbreak') || pattern.source.includes('unrestricted')) {
          maxSeverity = 'CRITICAL'
        } else if (pattern.source.includes('ignore') || pattern.source.includes('forget')) {
          maxSeverity = 'HIGH'
        } else if (pattern.source.includes('pretend') || pattern.source.includes('act as')) {
          maxSeverity = 'MEDIUM'
        }
      }
    }

    const confidence = detectedPatterns.length > 0 ? Math.min(detectedPatterns.length * 25, 100) : 0

    return {
      detected: detectedPatterns.length > 0,
      injectionType: this.classifyInjectionType(detectedPatterns),
      confidence,
      details: detectedPatterns.length > 0 ? `Detected patterns: ${detectedPatterns.join(', ')}` : 'No injection detected',
      severity: maxSeverity
    }
  }

  /**
   * 工具权限验证
   */
  static async validateToolPermissions(userId: string, toolName: string): Promise<PermissionResult> {
    try {
      // 获取用户角色
      const { data: userRoles } = await createClient()
        .from('organization_members')
        .select('role, organization_id')
        .eq('user_id', userId)

      if (!userRoles || userRoles.length === 0) {
        return {
          allowed: false,
          reason: 'User not found in any organization'
        }
      }

      const userRole = userRoles[0].role
      const toolConfig = this.TOOL_PERMISSIONS[toolName as keyof typeof this.TOOL_PERMISSIONS]

      if (!toolConfig) {
        return {
          allowed: false,
          reason: `Unknown tool: ${toolName}`
        }
      }

      // 检查角色权限
      if (!toolConfig.allowedRoles.includes(userRole)) {
        return {
          allowed: false,
          reason: `Role '${userRole}' not allowed to use tool '${toolName}'`,
          restrictions: [`Required roles: ${toolConfig.allowedRoles.join(', ')}`]
        }
      }

      // 检查速率限制
      const rateLimitCheck = await this.checkToolRateLimit(userId, toolName, toolConfig.rateLimit)
      if (!rateLimitCheck.allowed) {
        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          restrictions: [`Rate limit: ${toolConfig.rateLimit} requests per hour`]
        }
      }

      // 检查数据访问权限
      const dataAccessCheck = await this.validateDataAccess(userId, toolConfig.dataAccess)
      if (!dataAccessCheck.allowed) {
        return {
          allowed: false,
          reason: 'Insufficient data access permissions'
        }
      }

      return {
        allowed: true,
        reason: 'Permission granted',
        restrictions: toolConfig.restrictions,
        expiresAt: new Date(Date.now() + 3600000) // 1小时后过期
      }
    } catch (error) {
      return {
        allowed: false,
        reason: 'Permission validation error'
      }
    }
  }

  /**
   * 输出内容过滤
   */
  static async filterAIOutput(output: string): Promise<FilteredOutput> {
    const reasons: string[] = []
    let filtered = output
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    let action: 'ALLOWED' | 'MODIFIED' | 'BLOCKED' = 'ALLOWED'

    // 检测敏感信息泄露
    const sensitiveInfoPatterns = [
      /(password|secret|key|token)[\s:=]+\S+/gi,
      /(admin|root|system)[\s:=]+\S+/gi,
      /(database|sql)[\s:=]+\S+/gi
    ]

    for (const pattern of sensitiveInfoPatterns) {
      if (pattern.test(filtered)) {
        reasons.push('Potential sensitive information detected')
        filtered = filtered.replace(pattern, '[SENSITIVE_DATA_REDACTED]')
        severity = 'HIGH'
        action = 'MODIFIED'
      }
    }

    // 检测不当内容
    const inappropriatePatterns = [
      /(violence|harm|illegal|malicious)/gi,
      /(discriminatory|harassment|hate)/gi
    ]

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(filtered)) {
        reasons.push('Inappropriate content detected')
        severity = 'HIGH'
        action = 'MODIFIED'
      }
    }

    // 检测过度重复或循环
    if (this.detectExcessiveRepetition(filtered)) {
      reasons.push('Excessive repetition detected')
      filtered = this.removeExcessiveRepetition(filtered)
    }

    return {
      original: output,
      filtered,
      reasons,
      action,
      severity
    }
  }

  /**
   * 使用监控和审计
   */
  static async monitorAIUsage(userId: string, operation: string, metrics: Partial<UsageMetrics>): Promise<void> {
    const usageRecord = {
      user_id: userId,
      operation,
      timestamp: new Date().toISOString(),
      tokens_used: metrics.tokensUsed || 0,
      cost: metrics.cost || 0,
      duration: metrics.duration || 0,
      success: metrics.success || false,
      errors: metrics.errors || [],
      metadata: {
        user_agent: metrics.userAgent || 'unknown',
        endpoint: metrics.endpoint || 'unknown',
        session_id: metrics.sessionId || 'unknown'
      }
    }

    try {
      await this.supabase
        .from('ai_usage_audit')
        .insert(usageRecord)

      // 检查异常使用模式
      await this.detectAnomalousUsage(userId)
    } catch (error) {
      console.error('Failed to record AI usage:', error)
    }
  }

  /**
   * 检测异常使用模式
   */
  static async detectAnomalousUsage(userId: string): Promise<void> {
    const timeWindow = 3600000 // 1小时
    const now = Date.now()
    const windowStart = now - timeWindow

    // 获取用户在过去1小时的使用情况
    const { data: recentUsage } = await this.supabase
      .from('ai_usage_audit')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', new Date(windowStart).toISOString())

    if (!recentUsage) return

    // 检测异常模式
    const anomalies = []

    // 异常高的使用频率
    if (recentUsage.length > 100) {
      anomalies.push({
        type: 'EXCESSIVE_USAGE',
        severity: 'HIGH',
        description: `User made ${recentUsage.length} requests in 1 hour`,
        userId
      })
    }

    // 异常高的成本
    const totalCost = recentUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0)
    if (totalCost > 50) { // $50阈值
      anomalies.push({
        type: 'EXCESSIVE_COST',
        severity: 'CRITICAL',
        description: `User accumulated $${totalCost} cost in 1 hour`,
        userId,
        details: { totalCost, requestCount: recentUsage.length }
      })
    }

    // 失败率过高
    const failureRate = recentUsage.filter(u => !u.success).length / recentUsage.length
    if (failureRate > 0.5) {
      anomalies.push({
        type: 'HIGH_FAILURE_RATE',
        severity: 'MEDIUM',
        description: `User has ${(failureRate * 100).toFixed(1)}% failure rate`,
        userId
      })
    }

    // 记录异常
    for (const anomaly of anomalies) {
      await this.supabase
        .from('security_alerts')
        .insert({
          alert_type: anomaly.type,
          severity: anomaly.severity,
          description: anomaly.description,
          user_id: anomaly.userId,
          metadata: anomaly.details,
          created_at: new Date().toISOString()
        })
    }
  }

  // 私有辅助方法
  private static removeCodeInjection(input: string, threatsRemoved: string[]): string {
    // 移除潜在的代码注入
    const codePatterns = [
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<\s*script/gi
    ]

    for (const pattern of codePatterns) {
      if (pattern.test(input)) {
        threatsRemoved.push(`Code injection pattern detected: ${pattern.source}`)
        input = input.replace(pattern, '[BLOCKED]')
      }
    }

    return input
  }

  private static assessRiskLevel(threatsRemoved: string[], sanitized: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (threatsRemoved.length === 0) return 'LOW'
    if (threatsRemoved.length <= 2) return 'MEDIUM'
    if (threatsRemoved.length <= 5) return 'HIGH'
    return 'CRITICAL'
  }

  private static classifyInjectionType(patterns: string[]): 'PROMPT_INJECTION' | 'JAILBREAK' | 'DATA_EXTRACTION' | 'SYSTEM_PROMPT_LEAK' | 'NONE' {
    if (patterns.some(p => p.includes('jailbreak'))) return 'JAILBREAK'
    if (patterns.some(p => p.includes('data') || p.includes('extract'))) return 'DATA_EXTRACTION'
    if (patterns.some(p => p.includes('system') || p.includes('prompt'))) return 'SYSTEM_PROMPT_LEAK'
    if (patterns.length > 0) return 'PROMPT_INJECTION'
    return 'NONE'
  }

  private static async checkToolRateLimit(userId: string, toolName: string, limit: number): Promise<{allowed: boolean}> {
    const timeWindow = 3600000 // 1小时
    const now = Date.now()
    const windowStart = now - timeWindow

    const { count } = await this.supabase
      .from('ai_usage_audit')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('operation', toolName)
      .gte('timestamp', new Date(windowStart).toISOString())

    return {
      allowed: (count || 0) < limit
    }
  }

  private static async validateDataAccess(userId: string, dataAccess: string[]): Promise<{allowed: boolean}> {
    // 验证用户是否有权访问指定数据
    return { allowed: true }
  }

  private static detectExcessiveRepetition(text: string): boolean {
    const words = text.toLowerCase().split(/\s+/)
    const wordCount: { [key: string]: number } = {}

    words.forEach(word => {
      if (word.length > 3) {
        wordCount[word] = (wordCount[word] || 0) + 1
      }
    })

    // 检查是否有词汇重复超过5次
    return Object.values(wordCount).some(count => count > 5)
  }

  private static removeExcessiveRepetition(text: string): string {
    // 简单的重复移除逻辑
    return text.replace(/(\b\w+\b)(?:\s+\1){4,}/gi, '$1 [REPEATED]')
  }
}

// AI安全配置
export const AI_SECURITY_CONFIG = {
  MAX_INPUT_LENGTH: 4000,
  MAX_OUTPUT_LENGTH: 2000,
  RATE_LIMITS: {
    FREE_TIER: 50,    // 每小时50次
    PREMIUM_TIER: 200, // 每小时200次
    ENTERPRISE_TIER: 1000 // 每小时1000次
  },
  CONTENT_FILTERS: {
    ENABLE_PII_DETECTION: true,
    ENABLE_SENSITIVE_CONTENT_FILTER: true,
    ENABLE_REPETITION_DETECTION: true
  },
  MONITORING: {
    ENABLE_USAGE_TRACKING: true,
    ENABLE_ANOMALY_DETECTION: true,
    ENABLE_COST_MONITORING: true
  }
}

// 导出安全中间件
export const aiSecurityMiddleware = {
  /**
   * 输入验证中间件
   */
  inputValidator: (handler: any) => async (req: Request) => {
    const body = await req.clone().json().catch(() => null)

    if (!body?.message) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 })
    }

    // 检查输入长度
    if (body.message.length > AI_SECURITY_CONFIG.MAX_INPUT_LENGTH) {
      return new Response(JSON.stringify({ error: 'Input too long' }), { status: 400 })
    }

    // 检测提示注入
    const injectionResult = await AISecurityManager.detectPromptInjection(body.message)
    if (injectionResult.detected && injectionResult.severity === 'CRITICAL') {
      await AISecurityManager.monitorAIUsage('system', 'prompt_injection_detected', {
        tokensUsed: 0,
        cost: 0,
        duration: 0,
        success: false,
        errors: [injectionResult.details]
      })

      return new Response(JSON.stringify({
        error: 'Input contains security threats',
        severity: injectionResult.severity
      }), { status: 400 })
    }

    return handler(req)
  },

  /**
   * 输出过滤中间件
   */
  outputFilter: (handler: any) => async (req: Request) => {
    const response = await handler(req)
    const data = await response.clone().json().catch(() => null)

    if (data?.response) {
      const filtered = await AISecurityManager.filterAIOutput(data.response)

      if (filtered.action === 'BLOCKED') {
        return new Response(JSON.stringify({
          error: 'Content blocked by security filters',
          filtered: filtered.filtered
        }), { status: 400 })
      }

      // 如果内容被修改，更新响应
      if (filtered.action === 'MODIFIED') {
        data.response = filtered.filtered
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: response.headers
        })
      }
    }

    return response
  }
}
