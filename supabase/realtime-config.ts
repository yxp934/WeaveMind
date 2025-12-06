/**
 * WeaveMind LMS Supabase Realtime 配置系统
 *
 * 这个模块配置Supabase Realtime的表订阅、事件类型和过滤条件，
 * 确保实时功能的正确配置和性能优化。
 */

import {
  RealtimeTableConfig,
  RealtimeConfig,
  RealtimeEventType,
  EventFilter,
  DEFAULT_REALTIME_CONFIG
} from '../lib/realtime/types';

/**
 * 实时表配置映射
 *
 * 定义所有需要实时订阅的表及其配置
 */
export const REALTIME_TABLES: Record<string, RealtimeTableConfig> = {
  // =============================================================================
  // 讨论系统表配置
  // =============================================================================

  /**
   * 讨论帖子表
   */
  discussion_threads: {
    columns: [
      'id',
      'title',
      'content',
      'author_id',
      'class_id',
      'is_pinned',
      'is_locked',
      'created_at',
      'updated_at',
      'last_activity_at',
      'participant_count',
      'reply_count'
    ],
    events: ['INSERT', 'UPDATE', 'DELETE'],
    filter: {
      // 可以在这里添加默认过滤条件
      // 例如：只订阅特定班级的讨论
    }
  },

  /**
   * 讨论回复表
   */
  discussion_posts: {
    columns: [
      'id',
      'thread_id',
      'content',
      'author_id',
      'parent_id',
      'created_at',
      'updated_at',
      'is_edited',
      'like_count'
    ],
    events: ['INSERT', 'UPDATE', 'DELETE'],
    filter: {
      // 默认按帖子ID过滤（动态设置）
    }
  },

  // =============================================================================
  // 通知系统表配置
  // =============================================================================

  /**
   * 通知表
   */
  notifications: {
    columns: [
      'id',
      'user_id',
      'type',
      'title',
      'content',
      'data',
      'is_read',
      'created_at',
      'read_at',
      'expires_at'
    ],
    events: ['INSERT', 'UPDATE'],
    filter: {
      // 按用户ID过滤（动态设置）
    }
  },

  // =============================================================================
  // 学习进度系统表配置
  // =============================================================================

  /**
   * 学习路径进度表
   */
  self_learner_pathway_progress: {
    columns: [
      'id',
      'user_id',
      'course_id',
      'chapter_id',
      'component_id',
      'pathway_id',
      'progress_percentage',
      'completed_at',
      'time_spent_minutes',
      'last_accessed_at',
      'created_at',
      'updated_at',
      'current_item_id',
      'completed_items',
      'total_items',
      'completion_percentage',
      'last_activity_at'
    ],
    events: ['UPDATE'],
    filter: {
      // 按用户ID过滤（动态设置）
    }
  },

  /**
   * 学习活动表
   */
  self_learner_activities: {
    columns: [
      'id',
      'user_id',
      'activity_type',
      'target_id',
      'metadata',
      'created_at'
    ],
    events: ['INSERT'],
    filter: {
      // 按用户ID过滤（动态设置）
    }
  },

  // =============================================================================
  // AI聊天系统表配置
  // =============================================================================

  /**
   * AI聊天会话表
   */
  ai_chat_sessions: {
    columns: [
      'id',
      'user_id',
      'title',
      'context_type',
      'context_id',
      'is_active',
      'created_at',
      'updated_at',
      'last_message_at'
    ],
    events: ['INSERT', 'UPDATE'],
    filter: {
      // 按用户ID过滤（动态设置）
    }
  },

  /**
   * 聊天消息表
   */
  chat_messages: {
    columns: [
      'id',
      'session_id',
      'role',
      'content',
      'metadata',
      'created_at'
    ],
    events: ['INSERT'],
    filter: {
      // 按会话ID过滤（动态设置）
    }
  }
};

/**
 * 实时配置
 */
export const REALTIME_CONFIG: RealtimeConfig = {
  ...DEFAULT_REALTIME_CONFIG,
  tables: REALTIME_TABLES,
  connection: {
    heartbeat_interval: 30000, // 30秒心跳
    reconnect_interval: 5000, // 5秒重连间隔
    max_reconnect_attempts: 5 // 最大重连次数
  },
  performance: {
    batch_size: 10, // 批量处理大小
    batch_interval: 100, // 批量处理间隔（毫秒）
    compression_enabled: true, // 启用压缩
    cache_ttl: 300000 // 缓存TTL（5分钟）
  },
  security: {
    enable_rls: true, // 启用行级安全
    audit_logging: true, // 启用审计日志
    rate_limiting: true // 启用速率限制
  }
};

/**
 * 表过滤器生成器
 *
 * 根据用户ID、班级ID等条件生成过滤器
 */
export class RealtimeFilterGenerator {
  /**
   * 生成用户ID过滤器
   *
   * @param userId 用户ID
   * @returns 事件过滤器
   */
  static generateUserFilter(userId: string): EventFilter {
    return {
      user_id: userId
    };
  }

  /**
   * 生成班级ID过滤器
   *
   * @param classId 班级ID
   * @returns 事件过滤器
   */
  static generateClassFilter(classId: string): EventFilter {
    return {
      class_id: classId
    };
  }

  /**
   * 生成课程ID过滤器
   *
   * @param courseId 课程ID
   * @returns 事件过滤器
   */
  static generateCourseFilter(courseId: string): EventFilter {
    return {
      course_id: courseId
    };
  }

  /**
   * 生成帖子ID过滤器
   *
   * @param threadId 帖子ID
   * @returns 事件过滤器
   */
  static generateThreadFilter(threadId: string): EventFilter {
    return {
      thread_id: threadId
    };
  }

  /**
   * 生成会话ID过滤器
   *
   * @param sessionId 会话ID
   * @returns 事件过滤器
   */
  static generateSessionFilter(sessionId: string): EventFilter {
    return {
      session_id: sessionId
    };
  }

  /**
   * 生成路径ID过滤器
   *
   * @param pathwayId 路径ID
   * @returns 事件过滤器
   */
  static generatePathwayFilter(pathwayId: string): EventFilter {
    return {
      pathway_id: pathwayId
    };
  }

  /**
   * 生成组合过滤器
   *
   * @param filters 多个过滤器
   * @returns 组合后的事件过滤器
   */
  static combineFilters(...filters: EventFilter[]): EventFilter {
    const combined: EventFilter = {};

    for (const filter of filters) {
      Object.assign(combined, filter);
    }

    return combined;
  }
}

/**
 * 实时订阅管理器
 *
 * 管理表订阅的创建、配置和清理
 */
export class RealtimeSubscriptionManager {
  private subscriptions = new Map<string, {
    table: string;
    filter: EventFilter;
    events: RealtimeEventType[];
    callback: (payload: any) => void;
  }>();

  /**
   * 创建表订阅
   *
   * @param tableName 表名
   * @param filter 过滤器
   * @param events 事件类型
   * @param callback 回调函数
   * @returns 订阅ID
   */
  createSubscription(
    tableName: string,
    filter: EventFilter,
    events: RealtimeEventType[],
    callback: (payload: any) => void
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 验证表配置
    const tableConfig = REALTIME_TABLES[tableName];
    if (!tableConfig) {
      throw new Error(`未知的表: ${tableName}`);
    }

    // 验证事件类型
    const validEvents = events.filter(event => tableConfig.events.includes(event));
    if (validEvents.length !== events.length) {
      throw new Error(`不支持的事件类型: ${events.filter(event => !tableConfig.events.includes(event)).join(', ')}`);
    }

    // 存储订阅信息
    this.subscriptions.set(subscriptionId, {
      table: tableName,
      filter,
      events: validEvents,
      callback
    });

    console.log(`[RealtimeSubscription] 创建订阅: ${subscriptionId} - ${tableName}`);
    return subscriptionId;
  }

  /**
   * 移除订阅
   *
   * @param subscriptionId 订阅ID
   */
  removeSubscription(subscriptionId: string): void {
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.delete(subscriptionId);
      console.log(`[RealtimeSubscription] 移除订阅: ${subscriptionId}`);
    }
  }

  /**
   * 获取订阅信息
   *
   * @param subscriptionId 订阅ID
   * @returns 订阅信息
   */
  getSubscription(subscriptionId: string) {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * 获取所有订阅
   *
   * @returns 所有订阅信息
   */
  getAllSubscriptions() {
    return Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
      id,
      ...sub
    }));
  }

  /**
   * 按表名获取订阅
   *
   * @param tableName 表名
   * @returns 订阅列表
   */
  getSubscriptionsByTable(tableName: string) {
    return Array.from(this.subscriptions.entries())
      .filter(([_, sub]) => sub.table === tableName)
      .map(([id, sub]) => ({ id, ...sub }));
  }

  /**
   * 清理所有订阅
   */
  clearAllSubscriptions(): void {
    this.subscriptions.clear();
    console.log('[RealtimeSubscription] 清理所有订阅');
  }

  /**
   * 获取订阅统计
   *
   * @returns 统计信息
   */
  getSubscriptionStats() {
    const stats = {
      total: this.subscriptions.size,
      byTable: {} as Record<string, number>,
      byEvent: {} as Record<string, number>
    };

    for (const sub of this.subscriptions.values()) {
      // 按表统计
      stats.byTable[sub.table] = (stats.byTable[sub.table] || 0) + 1;

      // 按事件统计
      for (const event of sub.events) {
        stats.byEvent[event] = (stats.byEvent[event] || 0) + 1;
      }
    }

    return stats;
  }
}

/**
 * 实时配置验证器
 *
 * 验证实时配置的合法性和性能
 */
export class RealtimeConfigValidator {
  /**
   * 验证表配置
   *
   * @param tableName 表名
   * @param config 表配置
   * @returns 验证结果
   */
  static validateTableConfig(tableName: string, config: RealtimeTableConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证列配置
    if (!config.columns || !Array.isArray(config.columns) || config.columns.length === 0) {
      errors.push('列配置不能为空');
    }

    // 验证事件类型
    if (!config.events || !Array.isArray(config.events) || config.events.length === 0) {
      errors.push('事件类型配置不能为空');
    } else {
      const validEvents: RealtimeEventType[] = ['INSERT', 'UPDATE', 'DELETE'];
      for (const event of config.events) {
        if (!validEvents.includes(event)) {
          errors.push(`不支持的事件类型: ${event}`);
        }
      }
    }

    // 性能警告
    if (config.columns.includes('*')) {
      warnings.push('使用通配符列可能会影响性能，建议指定具体列');
    }

    if (config.events.includes('DELETE') && tableName.includes('progress')) {
      warnings.push('删除进度数据可能会影响用户体验，建议使用软删除');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证整体配置
   *
   * @param config 实时配置
   * @returns 验证结果
   */
  static validateConfig(config: RealtimeConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 验证表配置
    for (const [tableName, tableConfig] of Object.entries(config.tables)) {
      const validation = this.validateTableConfig(tableName, tableConfig);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    // 验证连接配置
    if (config.connection.heartbeat_interval < 10000) {
      warnings.push('心跳间隔过短可能会影响性能');
    }

    if (config.connection.reconnect_interval < 1000) {
      warnings.push('重连间隔过短可能会导致频繁重连');
    }

    // 验证性能配置
    if (config.performance.batch_size > 100) {
      warnings.push('批量处理大小过大可能会影响内存使用');
    }

    if (config.performance.cache_ttl < 60000) {
      warnings.push('缓存TTL过短可能会影响性能');
    }

    // 性能建议
    if (config.performance.compression_enabled) {
      suggestions.push('启用数据压缩可以减少网络传输量');
    }

    if (config.security.audit_logging) {
      suggestions.push('启用审计日志有助于安全监控和调试');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
}

/**
 * 实时性能监控器
 *
 * 监控实时功能的性能指标
 */
export class RealtimePerformanceMonitor {
  private metrics = {
    totalSubscriptions: 0,
    activeConnections: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    errorRate: 0,
    memoryUsage: 0,
    lastUpdate: new Date().toISOString()
  };

  private messageCount = 0;
  private errorCount = 0;
  private startTime = Date.now();

  /**
   * 记录消息
   */
  recordMessage(): void {
    this.messageCount++;
    this.updateMetrics();
  }

  /**
   * 记录错误
   */
  recordError(): void {
    this.errorCount++;
    this.updateMetrics();
  }

  /**
   * 记录延迟
   *
   * @param latency 延迟时间（毫秒）
   */
  recordLatency(latency: number): void {
    // 这里可以添加延迟统计逻辑
    this.updateMetrics();
  }

  /**
   * 获取性能指标
   *
   * @returns 性能指标
   */
  getMetrics() {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.messageCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    this.updateMetrics();
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 更新性能指标
   */
  private updateMetrics(): void {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000; // 秒

    // 计算每秒消息数
    this.metrics.messagesPerSecond = elapsed > 0 ? this.messageCount / elapsed : 0;

    // 计算错误率
    const totalOperations = this.messageCount + this.errorCount;
    this.metrics.errorRate = totalOperations > 0 ? this.errorCount / totalOperations : 0;

    // 更新最后更新时间
    this.metrics.lastUpdate = new Date().toISOString();

    // 这里可以添加更多的性能指标计算
    // 例如：内存使用、CPU使用等
  }
}

// =============================================================================
// 便利函数和导出
// =============================================================================

/**
 * 订阅管理器单例
 */
export const subscriptionManager = new RealtimeSubscriptionManager();

/**
 * 配置验证器单例
 */
export const configValidator = new RealtimeConfigValidator();

/**
 * 性能监控器单例
 */
export const performanceMonitor = new RealtimePerformanceMonitor();

/**
 * 便利函数：创建用户通知订阅
 */
export function createUserNotificationSubscription(
  userId: string,
  callback: (payload: any) => void
): string {
  return subscriptionManager.createSubscription(
    'notifications',
    RealtimeFilterGenerator.generateUserFilter(userId),
    ['INSERT', 'UPDATE'],
    callback
  );
}

/**
 * 便利函数：创建讨论帖子订阅
 */
export function createDiscussionThreadSubscription(
  threadId: string,
  callback: (payload: any) => void
): string {
  return subscriptionManager.createSubscription(
    'discussion_threads',
    RealtimeFilterGenerator.generateThreadFilter(threadId),
    ['INSERT', 'UPDATE', 'DELETE'],
    callback
  );
}

/**
 * 便利函数：创建学习进度订阅
 */
export function createLearningProgressSubscription(
  userId: string,
  callback: (payload: any) => void
): string {
  return subscriptionManager.createSubscription(
    'self_learner_pathway_progress',
    RealtimeFilterGenerator.generateUserFilter(userId),
    ['UPDATE'],
    callback
  );
}

/**
 * 便利函数：创建AI聊天订阅
 */
export function createAIChatSubscription(
  sessionId: string,
  callback: (payload: any) => void
): string {
  return subscriptionManager.createSubscription(
    'ai_chat_sessions',
    RealtimeFilterGenerator.generateSessionFilter(sessionId),
    ['INSERT', 'UPDATE'],
    callback
  );
}

/**
 * 便利函数：验证实时配置
 */
export function validateRealtimeConfig(): ReturnType<typeof configValidator.validateConfig> {
  return configValidator.validateConfig(REALTIME_CONFIG);
}

/**
 * 便利函数：获取订阅统计
 */
export function getSubscriptionStats() {
  return subscriptionManager.getSubscriptionStats();
}

/**
 * 便利函数：获取性能指标
 */
export function getPerformanceMetrics() {
  return performanceMonitor.getMetrics();
}

/**
 * 便利函数：记录消息
 */
export function recordRealtimeMessage(): void {
  performanceMonitor.recordMessage();
}

/**
 * 便利函数：记录错误
 */
export function recordRealtimeError(): void {
  performanceMonitor.recordError();
}

/**
 * 便利函数：记录延迟
 */
export function recordRealtimeLatency(latency: number): void {
  performanceMonitor.recordLatency(latency);
}
