/**
 * 安全监控系统
 * 实时监控异常访问、恶意请求、权限异常和安全事件
 */

import { createClient } from '@/lib/supabase/server'

interface AnomalyResult {
  id: string
  type: 'ACCESS_PATTERN' | 'FREQUENCY_ANOMALY' | 'GEOGRAPHIC_ANOMALY' | 'BEHAVIOR_ANOMALY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  userId?: string
  ipAddress?: string
  timestamp: Date
  details: any
  riskScore: number
}

interface MaliciousResult {
  id: string
  type: 'SQL_INJECTION' | 'XSS' | 'CSRF' | 'BRUTE_FORCE' | 'PROMPT_INJECTION'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  requestData: any
  ipAddress: string
  userAgent?: string
  timestamp: Date
  blocked: boolean
  evidence: string[]
}

interface PermissionAnomaly {
  id: string
  type: 'UNAUTHORIZED_ACCESS' | 'PRIVILEGE_ESCALATION' | 'CROSS_ORGANIZATION_ACCESS'
  severity: 'HIGH' | 'CRITICAL'
  description: string
  userId: string
  attemptedResource: string
  actualPermissions: string[]
  timestamp: Date
  resolved: boolean
}

interface SecurityEvent {
  id: string
  type: 'LOGIN_FAILURE' | 'SUSPICIOUS_ACTIVITY' | 'DATA_ACCESS_VIOLATION' | 'SECURITY_BREACH'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  userId?: string
  ipAddress?: string
  timestamp: Date
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE'
  assignedTo?: string
  metadata?: any
}

interface AlertResult {
  id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  timestamp: Date
  acknowledged: boolean
  resolved: boolean
  actions: string[]
}

export class SecurityMonitor {
  private supabase = createClient()

  // 安全威胁模式
  private static readonly THREAT_PATTERNS = {
    SQL_INJECTION: [
      /('|(\\)|(\\)|;|--|#|/\\*)/,
      /(union|select|insert|update|delete|drop|create|alter)/i,
      /(script|javascript|vbscript|onload|onerror)/i
    ],
    XSS: [
      /<script[^>]*>.*?<\\/script>/gi,
      /javascript:/gi,
      /on\\w+\\s*=/gi,
      /<img[^>]*onerror[^>]*>/gi
    ],
    PROMPT_INJECTION: [
      /ignore\\s+(all\\s+)?(previous\\s+)?instructions/i,
      /forget\\s+everything\\s+you\\s+know/i,
      /pretend\\s+you\\s+(are\\s+)?(a|an)\\s+different\\s+(model|AI)/i,
      /jailbreak/i,
      /(unrestricted|unfiltered)\\s+mode/i
    ]
  }

  // 异常行为阈值
  private static readonly ANOMALY_THRESHOLDS = {
    FAILED_LOGINS: 5,           // 5次失败登录
    REQUESTS_PER_MINUTE: 100,   // 每分钟100次请求
    UNUSUAL_TIME_ACCESS: true,  // 非工作时间访问
    GEOGRAPHIC_ANOMALY: true,   // 地理位置异常
    DATA_ACCESS_VOLUME: 1000    // 大量数据访问
  }

  /**
   * 异常访问检测
   */
  static async detectAnomalousAccess(): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = []
    const now = new Date()
    const timeWindow = 3600000 // 1小时

    try {
      // 检测访问频率异常
      const frequencyAnomalies = await this.detectFrequencyAnomalies(timeWindow)
      anomalies.push(...frequencyAnomalies)

      // 检测访问模式异常
      const patternAnomalies = await this.detectAccessPatternAnomalies(timeWindow)
      anomalies.push(...patternAnomalies)

      // 检测地理位置异常
      const geoAnomalies = await this.detectGeographicAnomalies(timeWindow)
      anomalies.push(...geoAnomalies)

      // 检测行为异常
      const behaviorAnomalies = await this.detectBehaviorAnomalies(timeWindow)
      anomalies.push(...behaviorAnomalies)

      // 保存检测结果
      if (anomalies.length > 0) {
        await this.saveAnomalies(anomalies)
      }

      return anomalies
    } catch (error) {
      console.error('Anomaly detection error:', error)
      return []
    }
  }

  /**
   * 恶意请求检测
   */
  static async detectMaliciousRequests(): Promise<MaliciousResult[]> {
    const malicious: MaliciousResult[] = []
    const now = new Date()

    try {
      // 获取最近的请求日志
      const { data: requestLogs } = await this.supabase
        .from('api_request_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 300000).toISOString()) // 最近5分钟

      if (!requestLogs) return []

      for (const log of requestLogs) {
        // SQL注入检测
        const sqlInjection = this.detectSQLInjection(log.request_body || log.query_params || '')
        if (sqlInjection.detected) {
          malicious.push({
            id: `sql_injection_${log.id}`,
            type: 'SQL_INJECTION',
            severity: 'HIGH',
            description: 'SQL注入攻击尝试',
            requestData: log,
            ipAddress: log.ip_address || 'unknown',
            userAgent: log.user_agent,
            timestamp: new Date(log.created_at),
            blocked: log.status_code >= 400,
            evidence: sqlInjection.evidence
          })
        }

        // XSS检测
        const xss = this.detectXSS(log.request_body || log.query_params || '')
        if (xss.detected) {
          malicious.push({
            id: `xss_${log.id}`,
            type: 'XSS',
            severity: 'MEDIUM',
            description: 'XSS攻击尝试',
            requestData: log,
            ipAddress: log.ip_address || 'unknown',
            userAgent: log.user_agent,
            timestamp: new Date(log.created_at),
            blocked: log.status_code >= 400,
            evidence: xss.evidence
          })
        }

        // 暴力破解检测
        const bruteForce = await this.detectBruteForce(log.ip_address || 'unknown')
        if (bruteForce.detected) {
          malicious.push({
            id: `brute_force_${log.id}`,
            type: 'BRUTE_FORCE',
            severity: 'CRITICAL',
            description: '暴力破解攻击',
            requestData: log,
            ipAddress: log.ip_address || 'unknown',
            userAgent: log.user_agent,
            timestamp: new Date(log.created_at),
            blocked: true,
            evidence: bruteForce.evidence
          })
        }
      }

      // 保存恶意请求记录
      if (malicious.length > 0) {
        await this.saveMaliciousRequests(malicious)
      }

      return malicious
    } catch (error) {
      console.error('Malicious request detection error:', error)
      return []
    }
  }

  /**
   * 权限异常检测
   */
  static async detectPermissionAnomalies(): Promise<PermissionAnomaly[]> {
    const anomalies: PermissionAnomaly[] = []
    const now = new Date()

    try {
      // 检测未授权访问
      const unauthorizedAccess = await this.detectUnauthorizedAccess()
      anomalies.push(...unauthorizedAccess)

      // 检测权限提升尝试
      const privilegeEscalation = await this.detectPrivilegeEscalation()
      anomalies.push(...privilegeEscalation)

      // 检测跨组织访问
      const crossOrgAccess = await this.detectCrossOrganizationAccess()
      anomalies.push(...crossOrgAccess)

      // 保存权限异常记录
      if (anomalies.length > 0) {
        await this.savePermissionAnomalies(anomalies)
      }

      return anomalies
    } catch (error) {
      console.error('Permission anomaly detection error:', error)
      return []
    }
  }

  /**
   * 安全事件告警
   */
  static async triggerSecurityAlert(event: SecurityEvent): Promise<AlertResult> {
    const alertResult: AlertResult = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity: event.severity,
      message: event.description,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      actions: []
    }

    try {
      // 根据严重性决定响应动作
      switch (event.severity) {
        case 'CRITICAL':
          alertResult.actions.push('立即通知安全团队')
          alertResult.actions.push('临时封禁相关IP')
          alertResult.actions.push('启动应急响应流程')
          break

        case 'HIGH':
          alertResult.actions.push('通知相关管理员')
          alertResult.actions.push('增加监控频率')
          alertResult.actions.push('记录详细信息')
          break

        case 'MEDIUM':
          alertResult.actions.push('记录安全事件')
          alertResult.actions.push('标记待进一步调查')
          break

        case 'LOW':
          alertResult.actions.push('记录日志')
          break
      }

      // 保存告警到数据库
      await this.saveSecurityAlert(event, alertResult)

      // 发送通知（邮件、Slack等）
      await this.sendSecurityNotification(event, alertResult)

      return alertResult
    } catch (error) {
      console.error('Security alert trigger error:', error)
      return alertResult
    }
  }

  /**
   * 综合安全监控
   */
  static async performSecurityAudit(): Promise<{
    timestamp: string
    summary: {
      totalAnomalies: number
      maliciousRequests: number
      permissionAnomalies: number
      securityScore: number
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    }
    anomalies: AnomalyResult[]
    maliciousRequests: MaliciousResult[]
    permissionAnomalies: PermissionAnomaly[]
    recommendations: string[]
  }> {
    const timestamp = new Date().toISOString()

    try {
      // 并行执行所有安全检测
      const [anomalies, malicious, permissionAnomalies] = await Promise.all([
        this.detectAnomalousAccess(),
        this.detectMaliciousRequests(),
        this.detectPermissionAnomalies()
      ])

      // 计算安全评分
      const securityScore = this.calculateSecurityScore(anomalies, malicious, permissionAnomalies)

      // 评估风险等级
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
      const criticalCount = [
        ...anomalies.filter(a => a.severity === 'CRITICAL'),
        ...malicious.filter(m => m.severity === 'CRITICAL'),
        ...permissionAnomalies.filter(p => p.severity === 'CRITICAL')
      ].length

      if (criticalCount > 0) {
        riskLevel = 'CRITICAL'
      } else if (anomalies.length + malicious.length + permissionAnomalies.length > 20) {
        riskLevel = 'HIGH'
      } else if (anomalies.length + malicious.length + permissionAnomalies.length > 5) {
        riskLevel = 'MEDIUM'
      }

      // 生成安全建议
      const recommendations = this.generateSecurityRecommendations(
        anomalies,
        malicious,
        permissionAnomalies
      )

      return {
        timestamp,
        summary: {
          totalAnomalies: anomalies.length,
          maliciousRequests: malicious.length,
          permissionAnomalies: permissionAnomalies.length,
          securityScore,
          riskLevel
        },
        anomalies,
        maliciousRequests: malicious,
        permissionAnomalies,
        recommendations
      }
    } catch (error) {
      console.error('Security audit error:', error)
      return {
        timestamp,
        summary: {
          totalAnomalies: 0,
          maliciousRequests: 0,
          permissionAnomalies: 0,
          securityScore: 0,
          riskLevel: 'LOW'
        },
        anomalies: [],
        maliciousRequests: [],
        permissionAnomalies: [],
        recommendations: ['安全审计执行失败，请检查系统配置']
      }
    }
  }

  // 私有辅助方法
  private static async detectFrequencyAnomalies(timeWindow: number): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = []
    const windowStart = Date.now() - timeWindow

    // 获取请求频率统计
    const { data: requestStats } = await this.supabase
      .from('api_request_logs')
      .select('ip_address, user_id, COUNT(*) as request_count')
      .gte('created_at', new Date(windowStart).toISOString())
      .group('ip_address, user_id')

    if (!requestStats) return anomalies

    for (const stat of requestStats) {
      if (stat.request_count > this.ANOMALY_THRESHOLDS.REQUESTS_PER_MINUTE) {
        anomalies.push({
          id: `frequency_${stat.ip_address}_${Date.now()}`,
          type: 'FREQUENCY_ANOMALY',
          severity: stat.request_count > 1000 ? 'CRITICAL' : 'HIGH',
          description: `IP地址 ${stat.ip_address} 请求频率异常: ${stat.request_count} 次/小时`,
          userId: stat.user_id,
          ipAddress: stat.ip_address,
          timestamp: new Date(),
          details: { requestCount: stat.request_count },
          riskScore: Math.min(stat.request_count / 100, 10)
        })
      }
    }

    return anomalies
  }

  private static async detectAccessPatternAnomalies(timeWindow: number): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = []

    // 检测异常访问模式
    // 实现访问模式分析逻辑

    return anomalies
  }

  private static async detectGeographicAnomalies(timeWindow: number): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = []

    // 检测地理位置异常
    // 实现地理位置分析逻辑

    return anomalies
  }

  private static async detectBehaviorAnomalies(timeWindow: number): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = []

    // 检测用户行为异常
    // 实现行为分析逻辑

    return anomalies
  }

  private static detectSQLInjection(input: string): { detected: boolean; evidence: string[] } {
    const evidence: string[] = []

    for (const pattern of this.THREAT_PATTERNS.SQL_INJECTION) {
      const matches = input.match(pattern)
      if (matches) {
        evidence.push(...matches)
      }
    }

    return {
      detected: evidence.length > 0,
      evidence
    }
  }

  private static detectXSS(input: string): { detected: boolean; evidence: string[] } {
    const evidence: string[] = []

    for (const pattern of this.THREAT_PATTERNS.XSS) {
      const matches = input.match(pattern)
      if (matches) {
        evidence.push(...matches)
      }
    }

    return {
      detected: evidence.length > 0,
      evidence
    }
  }

  private static async detectBruteForce(ipAddress: string): Promise<{ detected: boolean; evidence: string[] }> {
    const timeWindow = 300000 // 5分钟
    const windowStart = Date.now() - timeWindow

    const { count } = await this.supabase
      .from('api_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .eq('status_code', 401)
      .gte('created_at', new Date(windowStart).toISOString())

    const failedLogins = count || 0

    return {
      detected: failedLogins >= this.ANOMALY_THRESHOLDS.FAILED_LOGINS,
      evidence: failedLogins >= this.ANOMALY_THRESHOLDS.FAILED_LOGINS
        ? [`${failedLogins} failed login attempts in 5 minutes`]
        : []
    }
  }

  private static async detectUnauthorizedAccess(): Promise<PermissionAnomaly[]> {
    const anomalies: PermissionAnomaly[] = []

    // 检测未授权访问
    // 实现未授权访问检测逻辑

    return anomalies
  }

  private static async detectPrivilegeEscalation(): Promise<PermissionAnomaly[]> {
    const anomalies: PermissionAnomaly[] = []

    // 检测权限提升尝试
    // 实现权限提升检测逻辑

    return anomalies
  }

  private static async detectCrossOrganizationAccess(): Promise<PermissionAnomaly[]> {
    const anomalies: PermissionAnomaly[] = []

    // 检测跨组织访问
    // 实现跨组织访问检测逻辑

    return anomalies
  }

  private static async saveAnomalies(anomalies: AnomalyResult[]): Promise<void> {
    // 保存异常记录到数据库
  }

  private static async saveMaliciousRequests(requests: MaliciousResult[]): Promise<void> {
    // 保存恶意请求记录到数据库
  }

  private static async savePermissionAnomalies(anomalies: PermissionAnomaly[]): Promise<void> {
    // 保存权限异常记录到数据库
  }

  private static async saveSecurityAlert(event: SecurityEvent, alert: AlertResult): Promise<void> {
    // 保存安全告警到数据库
  }

  private static async sendSecurityNotification(event: SecurityEvent, alert: AlertResult): Promise<void> {
    // 发送安全通知（邮件、Slack等）
  }

  private static calculateSecurityScore(
    anomalies: AnomalyResult[],
    malicious: MaliciousResult[],
    permissionAnomalies: PermissionAnomaly[]
  ): number {
    let score = 100

    // 根据异常数量扣分
    score -= anomalies.length * 2
    score -= malicious.length * 5
    score -= permissionAnomalies.length * 10

    // 根据严重性额外扣分
    const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL').length
    const criticalMalicious = malicious.filter(m => m.severity === 'CRITICAL').length
    const criticalPermission = permissionAnomalies.filter(p => p.severity === 'CRITICAL').length

    score -= (criticalAnomalies + criticalMalicious + criticalPermission) * 20

    return Math.max(0, score)
  }

  private static generateSecurityRecommendations(
    anomalies: AnomalyResult[],
    malicious: MaliciousResult[],
    permissionAnomalies: PermissionAnomaly[]
  ): string[] {
    const recommendations: string[] = []

    // 基于检测结果生成建议
    if (malicious.some(m => m.type === 'SQL_INJECTION')) {
      recommendations.push('加强SQL注入防护，使用参数化查询')
    }

    if (malicious.some(m => m.type === 'XSS')) {
      recommendations.push('加强XSS防护，对用户输入进行适当过滤和转义')
    }

    if (anomalies.some(a => a.type === 'FREQUENCY_ANOMALY')) {
      recommendations.push('实施更严格的速率限制')
    }

    if (permissionAnomalies.length > 0) {
      recommendations.push('审查和强化权限控制系统')
    }

    if (recommendations.length === 0) {
      recommendations.push('系统安全状况良好，继续保持当前安全措施')
    }

    return recommendations
  }
}

// 安全监控配置
export const SECURITY_MONITORING_CONFIG = {
  THREAT_DETECTION: {
    ENABLE_SQL_INJECTION_DETECTION: true,
    ENABLE_XSS_DETECTION: true,
    ENABLE_PROMPT_INJECTION_DETECTION: true,
    ENABLE_BRUTE_FORCE_DETECTION: true
  },
  ANOMALY_DETECTION: {
    ENABLE_ACCESS_PATTERN_ANALYSIS: true,
    ENABLE_FREQUENCY_ANOMALY_DETECTION: true,
    ENABLE_GEOGRAPHIC_ANOMALY_DETECTION: true,
    ENABLE_BEHAVIOR_ANOMALY_DETECTION: true
  },
  ALERT_THRESHOLDS: {
    FAILED_LOGINS: 5,
    REQUESTS_PER_MINUTE: 100,
    ANOMALY_SCORE_THRESHOLD: 7,
    GEOGRAPHIC_DISTANCE_THRESHOLD: 1000 // km
  },
  NOTIFICATION: {
    ENABLE_EMAIL_ALERTS: true,
    ENABLE_SLACK_ALERTS: true,
    ENABLE_WEBHOOK_ALERTS: true
  }
}

// 导出安全监控中间件
export const securityMonitoringMiddleware = {
  /**
   * 请求安全检查中间件
   */
  securityCheck: (handler: any) => async (req: Request) => {
    const requestData = await req.clone().json().catch(() => null)

    if (requestData) {
      // 检测SQL注入
      const sqlInjection = SecurityMonitor.detectSQLInjection(JSON.stringify(requestData))
      if (sqlInjection.detected) {
        console.warn('SQL injection attempt detected:', {
          evidence: sqlInjection.evidence,
          timestamp: new Date().toISOString()
        })
      }

      // 检测XSS
      const xss = SecurityMonitor.detectXSS(JSON.stringify(requestData))
      if (xss.detected) {
        console.warn('XSS attempt detected:', {
          evidence: xss.evidence,
          timestamp: new Date().toISOString()
        })
      }
    }

    return handler(req)
  },

  /**
   * 异常行为监控中间件
   */
  anomalyMonitor: (handler: any) => async (req: Request) => {
    // 记录请求用于后续分析
    const requestInfo = {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    }

    // 保存请求信息用于异常检测
    // await SecurityMonitor.recordRequest(requestInfo)

    return handler(req)
  }
}
