// 实时功能类型定义

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload {
  eventType: RealtimeEventType;
  new?: any;
  old?: any;
  table?: string;
  schema?: string;
}

export interface RealtimeConfig {
  table: string;
  schema?: string;
  event?: string;
  filter?: string;
}

export interface EventFilter {
  [key: string]: any;
}

export interface SubscriptionOptions {
  onUpdate: (payload: RealtimePayload) => void;
  onError?: (error: Error) => void;
  filter?: EventFilter;
}

// 默认实时配置
export const DEFAULT_REALTIME_CONFIG = {
  schema: 'public',
  event: '*'
} as const;

// 默认性能配置
export const DEFAULT_PERFORMANCE_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
} as const;
