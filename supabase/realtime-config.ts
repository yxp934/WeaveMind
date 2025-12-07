// Supabase实时配置

import { RealtimeConfig } from '@/lib/realtime/types';

// 实时表配置映射
export const REALTIME_TABLES = {
  discussion_posts: {
    schema: 'public',
    event: '*'
  },
  notifications: {
    schema: 'public',
    event: '*'
  },
  learning_progress: {
    schema: 'public',
    event: '*'
  },
  ai_chat_messages: {
    schema: 'public',
    event: '*'
  },
  ai_suggestions: {
    schema: 'public',
    event: '*'
  }
} as const;

// 默认实时配置
export const DEFAULT_REALTIME_CONFIG: RealtimeConfig = {
  table: '',
  schema: 'public',
  event: '*'
};

// 默认性能配置
export const DEFAULT_PERFORMANCE_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
};

// 事件过滤器生成器
export class RealtimeFilterGenerator {
  static generateFilter(
    field: string,
    operator: string,
    value: any
  ): string {
    return `${field}=${operator}.${value}`;
  }

  static generateMultiFilter(filters: Array<{
    field: string;
    operator: string;
    value: any;
  }>): string {
    return filters
      .map(filter => this.generateFilter(filter.field, filter.operator, filter.value))
      .join('&');
  }
}

// 实时订阅管理器
export class RealtimeSubscriptionManager {
  private subscriptions = new Map<string, any>();

  async createSubscription(
    table: string,
    config: RealtimeConfig,
    callback: (payload: any) => void
  ): Promise<string> {
    const subscriptionId = `sub_${Date.now()}_${table}`;
    console.log('Creating subscription:', { subscriptionId, table, config });
    return subscriptionId;
  }

  async removeSubscription(subscriptionId: string): Promise<void> {
    console.log('Removing subscription:', { subscriptionId });
    this.subscriptions.delete(subscriptionId);
  }

  async getAllSubscriptions(): Promise<string[]> {
    return Array.from(this.subscriptions.keys());
  }
}

// 实时配置验证器
export class RealtimeConfigValidator {
  static validate(config: RealtimeConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.table) {
      errors.push('Table name is required');
    }

    if (!config.schema) {
      errors.push('Schema is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// 实时性能监控器
export class RealtimePerformanceMonitor {
  private metrics = {
    messages: 0,
    errors: 0,
    latency: 0
  };

  recordMessage(): void {
    this.metrics.messages++;
  }

  recordError(): void {
    this.metrics.errors++;
  }

  recordLatency(latency: number): void {
    this.metrics.latency = latency;
  }

  getMetrics(): {
    messages: number;
    errors: number;
    latency: number;
    errorRate: number;
  } {
    const { messages, errors, latency } = this.metrics;
    return {
      messages,
      errors,
      latency,
      errorRate: messages > 0 ? errors / messages : 0
    };
  }
}

// 导出单例实例
export const subscriptionManager = new RealtimeSubscriptionManager();
export const configValidator = new RealtimeConfigValidator();
export const performanceMonitor = new RealtimePerformanceMonitor();

// 便利函数
export async function createUserNotificationSubscription(
  userId: string,
  callback: (payload: any) => void
): Promise<string> {
  return await subscriptionManager.createSubscription(
    'notifications',
    {
      table: 'notifications',
      schema: 'public',
      event: '*',
      filter: `user_id=eq.${userId}`
    },
    callback
  );
}

export async function createDiscussionThreadSubscription(
  threadId: string,
  callback: (payload: any) => void
): Promise<string> {
  return await subscriptionManager.createSubscription(
    'discussion_posts',
    {
      table: 'discussion_posts',
      schema: 'public',
      event: '*',
      filter: `thread_id=eq.${threadId}`
    },
    callback
  );
}

export async function createLearningProgressSubscription(
  userId: string,
  pathwayId: string,
  callback: (payload: any) => void
): Promise<string> {
  return await subscriptionManager.createSubscription(
    'learning_progress',
    {
      table: 'learning_progress',
      schema: 'public',
      event: '*',
      filter: `user_id=eq.${userId}&pathway_id=eq.${pathwayId}`
    },
    callback
  );
}

export async function createAIChatSubscription(
  sessionId: string,
  callback: (payload: any) => void
): Promise<string> {
  return await subscriptionManager.createSubscription(
    'ai_chat_messages',
    {
      table: 'ai_chat_messages',
      schema: 'public',
      event: '*',
      filter: `session_id=eq.${sessionId}`
    },
    callback
  );
}

export async function validateRealtimeConfig(
  config: RealtimeConfig
): Promise<{
  valid: boolean;
  errors: string[];
}> {
  return RealtimeConfigValidator.validate(config);
}

export async function getSubscriptionStats(): Promise<{
  total: number;
  active: number;
  byTable: Record<string, number>;
}> {
  const subscriptions = await subscriptionManager.getAllSubscriptions();
  return {
    total: subscriptions.length,
    active: subscriptions.length,
    byTable: {}
  };
}

export async function getPerformanceMetrics(): Promise<{
  messages: number;
  errors: number;
  latency: number;
  errorRate: number;
}> {
  return performanceMonitor.getMetrics();
}

export function recordRealtimeMessage(): void {
  performanceMonitor.recordMessage();
}

export function recordRealtimeError(): void {
  performanceMonitor.recordError();
}

export function recordRealtimeLatency(latency: number): void {
  performanceMonitor.recordLatency(latency);
}
