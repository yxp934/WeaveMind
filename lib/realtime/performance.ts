/**
 * WeaveMind LMS 实时性能优化和错误处理系统
 *
 * 这个模块实现了实时功能的性能优化和错误处理，包括：
 * - 连接池管理
 * - 自动重连机制
 * - 连接状态监控
 * - 资源清理和释放
 * - 数据压缩和序列化
 * - 缓存策略
 * - 批量更新处理
 */

import {
  RealtimeChannel,
  RealtimePostgresChangesPayload
} from '@supabase/supabase-js';
import { createClient } from '../supabase/client';
import {
  ConnectionConfig,
  RetryConfig,
  ConnectionStats,
  PerformanceMetrics,
  CacheConfig,
  RealtimeError,
  RealtimeErrorCode,
  DEFAULT_PERFORMANCE_CONFIG,
  ConnectionStatus,
  DEFAULT_REALTIME_CONFIG
} from './types';

/**
 * 实时连接接口
 */
export interface RealtimeConnection {
  id: string;
  channel: RealtimeChannel;
  status: ConnectionStatus;
  config: ConnectionConfig;
  createdAt: string;
  lastActivity: string;
  messageCount: number;
  errorCount: number;
  retryCount: number;
  metrics: PerformanceMetrics;
}

/**
 * 连接池配置
 */
interface ConnectionPoolConfig {
  maxConnections: number;
  maxIdleTime: number;
  cleanupInterval: number;
  healthCheckInterval: number;
}

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: string;
  size: number;
}

/**
 * 实时连接管理器
 *
 * 负责管理实时连接的创建、维护、监控和清理。
 */
export class RealtimeConnectionManager {
  private supabase = createClient();
  private connections = new Map<string, RealtimeConnection>();
  private connectionPool: ConnectionConfig[] = [];
  private stats: ConnectionStats = {
    total_connections: 0,
    active_connections: 0,
    failed_connections: 0,
    average_latency: 0,
    messages_per_second: 0,
    memory_usage: 0,
    uptime: 0
  };
  private startTime = Date.now();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private retryQueue: Array<{ id: string; config: ConnectionConfig; attempt: number }> = [];
  private messageTimestamps: number[] = [];

  private readonly poolConfig: ConnectionPoolConfig = {
    maxConnections: 100,
    maxIdleTime: 300000, // 5分钟
    cleanupInterval: 60000, // 1分钟
    healthCheckInterval: 30000 // 30秒
  };

  constructor() {
    this.startCleanup();
    this.startHealthCheck();
  }

  /**
   * 创建新的实时连接
   *
   * @param config 连接配置
   * @returns 连接对象
   */
  async createConnection(config: ConnectionConfig): Promise<RealtimeConnection> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 检查连接池限制
    if (this.connections.size >= this.poolConfig.maxConnections) {
      await this.cleanupIdleConnections();
    }

    if (this.connections.size >= this.poolConfig.maxConnections) {
      throw this.createError('CONNECTION_FAILED', `连接池已满，最大连接数: ${this.poolConfig.maxConnections}`);
    }

    const connection: RealtimeConnection = {
      id: connectionId,
      channel: {} as RealtimeChannel, // 将在下面初始化
      status: 'connecting',
      config,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0,
      errorCount: 0,
      retryCount: 0,
      metrics: {
        connection_time: 0,
        message_latency: 0,
        throughput: 0,
        error_rate: 0,
        memory_usage: 0,
        cpu_usage: 0
      }
    };

    try {
      // 创建Supabase频道
      const channel = this.supabase.channel(connectionId, {
        config: {
          broadcast: { self: true },
          presence: { key: connectionId }
        }
      });

      // 设置事件监听器
      this.setupChannelEventListeners(connectionId, channel, config);

      // 订阅配置的事件
      for (const event of config.events) {
        channel.on('postgres_changes', {
          event,
          schema: 'public',
          table: config.channel,
          filter: config.filter
        }, (payload) => {
          this.handleChannelEvent(connectionId, payload);
        });
      }

      // 建立连接
      const subscription = await channel.subscribe((status) => {
        this.handleConnectionStatusChange(connectionId, status);
      });

      connection.channel = channel;
      connection.status = 'connected';
      connection.lastActivity = new Date().toISOString();

      // 存储连接
      this.connections.set(connectionId, connection);

      // 更新统计
      this.updateConnectionStats();

      console.log(`[ConnectionManager] 创建连接成功: ${connectionId}`);
      return connection;
    } catch (error) {
      connection.status = 'error';
      connection.errorCount++;
      console.error(`[ConnectionManager] 创建连接失败: ${connectionId}`, error);
      throw this.createError('CONNECTION_FAILED', `创建连接失败: ${connectionId}`, error);
    }
  }

  /**
   * 管理连接（创建或获取现有连接）
   *
   * @param config 连接配置
   * @returns 连接对象
   */
  async manageConnection(config: ConnectionConfig): Promise<RealtimeConnection> {
    // 尝试查找现有连接
    const existingConnection = this.findExistingConnection(config);
    if (existingConnection) {
      // 更新最后活动时间
      existingConnection.lastActivity = new Date().toISOString();
      return existingConnection;
    }

    // 创建新连接
    return this.createConnection(config);
  }

  /**
   * 关闭连接
   *
   * @param connectionId 连接ID
   */
  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      // 从Supabase移除频道
      await this.supabase.removeChannel(connection.channel);

      // 从连接池移除
      this.connections.delete(connectionId);

      // 更新统计
      this.updateConnectionStats();

      console.log(`[ConnectionManager] 关闭连接成功: ${connectionId}`);
    } catch (error) {
      console.error(`[ConnectionManager] 关闭连接失败: ${connectionId}`, error);
      throw this.createError('CONNECTION_FAILED', `关闭连接失败: ${connectionId}`, error);
    }
  }

  /**
   * 获取连接统计信息
   *
   * @returns 统计信息
   */
  getConnectionStats(): ConnectionStats {
    this.updateConnectionStats();
    return { ...this.stats };
  }

  /**
   * 获取所有连接
   *
   * @returns 连接列表
   */
  getAllConnections(): RealtimeConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 获取特定连接
   *
   * @param connectionId 连接ID
   * @returns 连接对象
   */
  getConnection(connectionId: string): RealtimeConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * 清理所有连接
   */
  async cleanup(): Promise<void> {
    try {
      // 停止定时任务
      this.stopCleanup();
      this.stopHealthCheck();

      // 关闭所有连接
      const closePromises = Array.from(this.connections.keys()).map(id =>
        this.closeConnection(id)
      );
      await Promise.all(closePromises);

      // 清空连接池
      this.connections.clear();
      this.connectionPool = [];
      this.retryQueue = [];

      // 重置统计
      this.stats = {
        total_connections: 0,
        active_connections: 0,
        failed_connections: 0,
        average_latency: 0,
        messages_per_second: 0,
        memory_usage: 0,
        uptime: 0
      };

      console.log('[ConnectionManager] 清理完成');
    } catch (error) {
      console.error('[ConnectionManager] 清理失败:', error);
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 设置频道事件监听器
   */
  private setupChannelEventListeners(
    connectionId: string,
    channel: RealtimeChannel,
    config: ConnectionConfig
  ): void {
    // 广播事件监听
    channel.on('broadcast', { event: '*' }, (payload) => {
      this.handleBroadcastEvent(connectionId, payload);
    });

    // Presence事件监听
    channel.on('presence', { event: '*' }, (payload) => {
      this.handlePresenceEvent(connectionId, payload);
    });
  }

  /**
   * 处理频道事件
   */
  private handleChannelEvent(connectionId: string, payload: RealtimePostgresChangesPayload<any>): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // 更新连接指标
    connection.messageCount++;
    connection.lastActivity = new Date().toISOString();

    // 记录消息时间戳
    this.messageTimestamps.push(Date.now());
    if (this.messageTimestamps.length > 1000) {
      this.messageTimestamps.shift();
    }

    // 更新吞吐量指标
    this.updateThroughputMetrics();
  }

  /**
   * 处理广播事件
   */
  private handleBroadcastEvent(connectionId: string, payload: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.messageCount++;
    connection.lastActivity = new Date().toISOString();
  }

  /**
   * 处理Presence事件
   */
  private handlePresenceEvent(connectionId: string, payload: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.messageCount++;
    connection.lastActivity = new Date().toISOString();
  }

  /**
   * 处理连接状态变化
   */
  private handleConnectionStatusChange(connectionId: string, status: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const statusMap: Record<string, ConnectionStatus> = {
      'SUBSCRIBED': 'connected',
      'CHANNEL_ERROR': 'error',
      'TIMED_OUT': 'error',
      'CLOSED': 'disconnected'
    };

    const newStatus = statusMap[status] || 'disconnected';

    if (newStatus !== connection.status) {
      connection.status = newStatus;

      if (newStatus === 'error') {
        connection.errorCount++;
        this.scheduleRetry(connectionId);
      }

      console.log(`[ConnectionManager] 连接状态变化: ${connectionId} - ${newStatus}`);
    }
  }

  /**
   * 查找现有连接
   */
  private findExistingConnection(config: ConnectionConfig): RealtimeConnection | undefined {
    for (const connection of this.connections.values()) {
      if (this.matchesConfig(connection.config, config)) {
        return connection;
      }
    }
    return undefined;
  }

  /**
   * 检查配置是否匹配
   */
  private matchesConfig(config1: ConnectionConfig, config2: ConnectionConfig): boolean {
    return config1.channel === config2.channel &&
           JSON.stringify(config1.filter) === JSON.stringify(config2.filter) &&
           config1.events.length === config2.events.length &&
           config1.events.every(event => config2.events.includes(event));
  }

  /**
   * 更新连接统计
   */
  private updateConnectionStats(): void {
    const connections = Array.from(this.connections.values());

    this.stats.total_connections = connections.length;
    this.stats.active_connections = connections.filter(c => c.status === 'connected').length;
    this.stats.failed_connections = connections.filter(c => c.status === 'error').length;

    // 计算平均延迟（基于最近的消息）
    if (this.messageTimestamps.length > 1) {
      const recentMessages = this.messageTimestamps.slice(-10);
      const intervals = [];
      for (let i = 1; i < recentMessages.length; i++) {
        intervals.push(recentMessages[i] - recentMessages[i - 1]);
      }
      this.stats.average_latency = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    // 计算消息吞吐量
    this.updateThroughputMetrics();

    // 计算运行时间
    this.stats.uptime = Date.now() - this.startTime;

    // 估算内存使用（简化计算）
    this.stats.memory_usage = connections.length * 1024 * 10; // 每个连接约10KB
  }

  /**
   * 更新吞吐量指标
   */
  private updateThroughputMetrics(): void {
    if (this.messageTimestamps.length < 2) {
      this.stats.messages_per_second = 0;
      return;
    }

    const now = Date.now();
    const recentMessages = this.messageTimestamps.filter(t => now - t < 60000); // 最近1分钟

    this.stats.messages_per_second = recentMessages.length / 60;
  }

  /**
   * 安排重试
   */
  private scheduleRetry(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.retryCount >= DEFAULT_PERFORMANCE_CONFIG.retry.max_attempts) {
      return;
    }

    connection.retryCount++;
    const delay = this.calculateRetryDelay(connection.retryCount);

    setTimeout(() => {
      this.retryConnection(connectionId);
    }, delay);
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(attempt: number): number {
    const config = DEFAULT_PERFORMANCE_CONFIG.retry;
    const baseDelay = config.base_delay * Math.pow(config.backoff_factor, attempt - 1);
    const maxDelay = Math.min(baseDelay, config.max_delay);

    if (config.jitter) {
      // 添加随机抖动
      const jitter = Math.random() * 0.1 * maxDelay;
      return maxDelay + jitter;
    }

    return maxDelay;
  }

  /**
   * 重试连接
   */
  private async retryConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // 重新订阅
      const subscription = await connection.channel.subscribe();
      connection.status = 'connected';
      connection.lastActivity = new Date().toISOString();

      console.log(`[ConnectionManager] 连接重试成功: ${connectionId}`);
    } catch (error) {
      console.error(`[ConnectionManager] 连接重试失败: ${connectionId}`, error);
      this.scheduleRetry(connectionId); // 继续重试
    }
  }

  /**
   * 清理空闲连接
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();
    const idleConnections: string[] = [];

    for (const [id, connection] of this.connections) {
      const lastActivity = new Date(connection.lastActivity).getTime();
      if (now - lastActivity > this.poolConfig.maxIdleTime) {
        idleConnections.push(id);
      }
    }

    // 关闭空闲连接
    for (const id of idleConnections) {
      await this.closeConnection(id);
    }

    if (idleConnections.length > 0) {
      console.log(`[ConnectionManager] 清理空闲连接: ${idleConnections.length}个`);
    }
  }

  /**
   * 启动清理任务
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.poolConfig.cleanupInterval);
  }

  /**
   * 停止清理任务
   */
  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.poolConfig.healthCheckInterval);
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 执行健康检查
   */
  private performHealthCheck(): void {
    const connections = Array.from(this.connections.values());
    const unhealthyConnections: string[] = [];

    for (const connection of connections) {
      const lastActivity = new Date(connection.lastActivity).getTime();
      const now = Date.now();

      // 检查连接是否超时
      if (now - lastActivity > 120000) { // 2分钟无活动
        unhealthyConnections.push(connection.id);
      }

      // 检查错误率
      const totalOperations = connection.messageCount + connection.errorCount;
      if (totalOperations > 10 && connection.errorCount / totalOperations > 0.5) {
        unhealthyConnections.push(connection.id);
      }
    }

    // 处理不健康的连接
    for (const id of unhealthyConnections) {
      console.warn(`[ConnectionManager] 发现不健康连接: ${id}`);
      // 这里可以实现重连逻辑
    }
  }

  /**
   * 创建错误对象
   */
  private createError(
    code: RealtimeErrorCode,
    message: string,
    originalError?: any
  ): RealtimeError {
    return {
      code,
      message,
      details: originalError ? { originalError: originalError.message || originalError } : undefined,
      timestamp: new Date().toISOString(),
      request_id: `connection_manager_${Date.now()}`
    };
  }
}

/**
 * 缓存管理器
 *
 * 负责管理实时数据的缓存，包括LRU、LFU和TTL策略。
 */
export class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;
  private accessOrder: string[] = [];
  private accessCount: Map<string, number> = new Map();

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG.cache, ...config };
  }

  /**
   * 设置缓存项
   *
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 生存时间（毫秒）
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.config.max_size) {
      this.evict();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: new Date().toISOString(),
      size: JSON.stringify(data).length
    };

    this.cache.set(key, item);
    this.updateAccessInfo(key);

    // 设置TTL清理
    if (ttl || this.config.ttl) {
      setTimeout(() => {
        this.delete(key);
      }, ttl || this.config.ttl);
    }
  }

  /**
   * 获取缓存项
   *
   * @param key 缓存键
   * @returns 缓存数据或undefined
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    // 检查TTL
    const age = Date.now() - item.timestamp;
    if (age > this.config.ttl) {
      this.delete(key);
      return undefined;
    }

    // 更新访问信息
    item.accessCount++;
    item.lastAccessed = new Date().toISOString();
    this.updateAccessInfo(key);

    return item.data;
  }

  /**
   * 删除缓存项
   *
   * @param key 缓存键
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessInfo(key);
    }
    return deleted;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.accessCount.clear();
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const totalAccesses = Array.from(this.accessCount.values()).reduce((sum, count) => sum + count, 0);
    const memoryUsage = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);

    return {
      size: this.cache.size,
      maxSize: this.config.max_size,
      hitRate: this.config.strategy === 'lfu' ? totalAccesses / Math.max(this.cache.size, 1) : 0,
      memoryUsage
    };
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 驱逐缓存项
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    switch (this.config.strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'ttl':
        this.evictTTL();
        break;
    }
  }

  /**
   * LRU驱逐策略
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const leastRecentlyUsed = this.accessOrder.shift();
    if (leastRecentlyUsed) {
      this.cache.delete(leastRecentlyUsed);
    }
  }

  /**
   * LFU驱逐策略
   */
  private evictLFU(): void {
    let minAccessCount = Infinity;
    let leastFrequentlyUsedKey = '';

    for (const [key, count] of this.accessCount) {
      if (count < minAccessCount) {
        minAccessCount = count;
        leastFrequentlyUsedKey = key;
      }
    }

    if (leastFrequentlyUsedKey) {
      this.cache.delete(leastFrequentlyUsedKey);
      this.accessCount.delete(leastFrequentlyUsedKey);
    }
  }

  /**
   * TTL驱逐策略
   */
  private evictTTL(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache) {
      if (now - item.timestamp > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.removeFromAccessInfo(key);
    }
  }

  /**
   * 更新访问信息
   */
  private updateAccessInfo(key: string): void {
    if (!this.accessOrder.includes(key)) {
      this.accessOrder.push(key);
    }

    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
  }

  /**
   * 从访问信息中移除
   */
  private removeFromAccessInfo(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessCount.delete(key);
  }
}

// =============================================================================
// 单例模式导出
// =============================================================================

/**
 * 实时连接管理器单例实例
 */
export const connectionManager = new RealtimeConnectionManager();

/**
 * 缓存管理器单例实例
 */
export const cacheManager = new CacheManager();

/**
 * 便利函数：创建连接
 */
export async function createConnection(config: ConnectionConfig): Promise<RealtimeConnection> {
  return connectionManager.createConnection(config);
}

/**
 * 便利函数：管理连接
 */
export async function manageConnection(config: ConnectionConfig): Promise<RealtimeConnection> {
  return connectionManager.manageConnection(config);
}

/**
 * 便利函数：关闭连接
 */
export async function closeConnection(connectionId: string): Promise<void> {
  return connectionManager.closeConnection(connectionId);
}

/**
 * 便利函数：获取连接统计
 */
export function getConnectionStats(): ConnectionStats {
  return connectionManager.getConnectionStats();
}

/**
 * 便利函数：清理所有连接
 */
export async function cleanupAllConnections(): Promise<void> {
  return connectionManager.cleanup();
}

/**
 * 便利函数：设置缓存
 */
export function setCache<T>(key: string, data: T, ttl?: number): void {
  cacheManager.set(key, data, ttl);
}

/**
 * 便利函数：获取缓存
 */
export function getCache<T>(key: string): T | undefined {
  return cacheManager.get(key);
}

/**
 * 便利函数：删除缓存
 */
export function deleteCache(key: string): boolean {
  return cacheManager.delete(key);
}

/**
 * 便利函数：清空缓存
 */
export function clearCache(): void {
  cacheManager.clear();
}

/**
 * 便利函数：获取缓存统计
 */
export function getCacheStats() {
  return cacheManager.getStats();
}
