/**
 * WeaveMind LMS 实时功能系统类型定义
 *
 * 这个文件包含所有实时功能的TypeScript类型定义，包括：
 * - 讨论系统类型
 * - 通知系统类型
 * - 学习进度类型
 * - AI聊天类型
 * - 事件类型
 * - 配置类型
 */

import { RealtimeChannel } from '@supabase/supabase-js';

// =============================================================================
// 基础类型定义
// =============================================================================

/**
 * 通用实时事件类型
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * 实时连接状态
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

/**
 * 实时订阅返回的取消订阅函数
 */
export type UnsubscribeFunction = () => void;

// =============================================================================
// 讨论系统类型定义
// =============================================================================

/**
 * 讨论帖子类型
 */
export interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  author_id: string;
  class_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  participant_count: number;
  reply_count: number;
}

/**
 * 讨论回复类型
 */
export interface DiscussionPost {
  id: string;
  thread_id: string;
  content: string;
  author_id: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  like_count: number;
}

/**
 * 讨论帖子更新事件
 */
export interface ThreadUpdate {
  type: 'created' | 'updated' | 'pinned' | 'locked' | 'deleted';
  thread: DiscussionThread;
  timestamp: string;
  user_id: string;
}

/**
 * 讨论发布数据
 */
export interface PostData {
  thread_id: string;
  content: string;
  author_id: string;
  parent_id?: string;
}

/**
 * 在线用户类型
 */
export interface OnlineUser {
  id: string;
  username: string;
  avatar_url?: string;
  role: 'teacher' | 'student';
  last_seen: string;
  is_active: boolean;
}

// =============================================================================
// 通知系统类型定义
// =============================================================================

/**
 * 通知类型
 */
export interface Notification {
  id: string;
  user_id: string;
  type: 'assignment' | 'message' | 'grade' | 'announcement' | 'system' | 'ai_suggestion';
  title: string;
  content: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  expires_at?: string;
}

/**
 * 通知发送数据
 */
export interface NotificationData {
  user_id: string;
  type: Notification['type'];
  title: string;
  content: string;
  data?: Record<string, any>;
  expires_at?: string;
}

/**
 * 通知统计信息
 */
export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<Notification['type'], number>;
  recent: Notification[];
}

/**
 * 通知批量操作
 */
export interface BatchNotificationOperation {
  type: 'mark_as_read' | 'delete' | 'archive';
  notification_ids: string[];
  user_id: string;
}

// =============================================================================
// 学习进度类型定义
// =============================================================================

/**
 * 学习进度类型
 */
export interface LearningProgress {
  id: string;
  user_id: string;
  course_id: string;
  chapter_id?: string;
  component_id?: string;
  progress_percentage: number;
  completed_at?: string;
  time_spent_minutes: number;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * 路径进度类型
 */
export interface PathwayProgress {
  id: string;
  user_id: string;
  pathway_id: string;
  current_item_id: string;
  completed_items: string[];
  total_items: number;
  completion_percentage: number;
  started_at: string;
  last_activity_at: string;
  completed_at?: string;
}

/**
 * 学习活动类型
 */
export interface LearningActivity {
  id: string;
  user_id: string;
  activity_type: 'course_access' | 'chapter_complete' | 'component_interact' | 'assignment_submit' | 'quiz_attempt';
  target_id: string; // course_id, chapter_id, component_id, assignment_id 等
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * 进度更新数据
 */
export interface ProgressUpdate {
  user_id: string;
  course_id: string;
  progress: number;
  component_id?: string;
  time_spent_minutes?: number;
  activity_type?: LearningActivity['activity_type'];
}

// =============================================================================
// AI聊天系统类型定义
// =============================================================================

/**
 * AI聊天会话类型
 */
export interface AIChatSession {
  id: string;
  user_id: string;
  title?: string;
  context_type: 'course' | 'assignment' | 'general' | 'learning_path';
  context_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

/**
 * AI聊天消息类型
 */
export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    model?: string;
    tokens?: number;
    tool_calls?: ToolCall[];
    suggestions?: AISuggestion[];
  };
  created_at: string;
}

/**
 * AI响应块类型（用于流式传输）
 */
export interface AIResponseChunk {
  session_id: string;
  chunk_id: string;
  content: string;
  is_complete: boolean;
  metadata?: {
    model?: string;
    tokens_used?: number;
    processing_time?: number;
  };
}

/**
 * 工具调用类型
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  execution_time?: number;
}

/**
 * AI建议类型
 */
export interface AISuggestion {
  id: string;
  user_id: string;
  type: 'study_tip' | 'resource' | 'exercise' | 'review' | 'next_step';
  title: string;
  content: string;
  relevance_score: number;
  context: Record<string, any>;
  is_dismissed: boolean;
  created_at: string;
}

/**
 * 聊天消息发送数据
 */
export interface ChatMessageData {
  session_id: string;
  content: string;
  role: 'user' | 'system';
  metadata?: Record<string, any>;
}

// =============================================================================
// 实时事件类型定义
// =============================================================================

/**
 * Supabase实时事件
 */
export interface SupabaseEvent<T = any> {
  type: RealtimeEventType;
  table: string;
  record: T;
  old_record?: T;
  schema: string;
  commit_timestamp: string;
  payload: {
    columns: string[];
    new: T;
    old: T;
  };
}

/**
 * 事件处理结果
 */
export interface EventHandlerResult {
  success: boolean;
  processed: boolean;
  error?: string;
  data?: any;
  broadcast_to?: string[];
}

/**
 * 事件过滤器
 */
export interface EventFilter {
  user_id?: string;
  class_id?: string;
  course_id?: string;
  session_id?: string;
  type?: string;
  [key: string]: any;
}

// =============================================================================
// 性能优化类型定义
// =============================================================================

/**
 * 连接配置
 */
export interface ConnectionConfig {
  channel: string;
  events: RealtimeEventType[];
  filter?: EventFilter;
  heartbeat?: number;
  retry_attempts?: number;
  retry_delay?: number;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  max_attempts: number;
  base_delay: number;
  max_delay: number;
  backoff_factor: number;
  jitter: boolean;
}

/**
 * 连接统计信息
 */
export interface ConnectionStats {
  total_connections: number;
  active_connections: number;
  failed_connections: number;
  average_latency: number;
  messages_per_second: number;
  memory_usage: number;
  uptime: number;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  connection_time: number;
  message_latency: number;
  throughput: number;
  error_rate: number;
  memory_usage: number;
  cpu_usage: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  max_size: number;
  compression: boolean;
  strategy: 'lru' | 'lfu' | 'ttl';
}

// =============================================================================
// 配置类型定义
// =============================================================================

/**
 * 实时表配置
 */
export interface RealtimeTableConfig {
  columns: string[];
  events: RealtimeEventType[];
  filter?: EventFilter;
}

/**
 * 实时配置
 */
export interface RealtimeConfig {
  tables: Record<string, RealtimeTableConfig>;
  connection: {
    heartbeat_interval: number;
    reconnect_interval: number;
    max_reconnect_attempts: number;
  };
  performance: {
    batch_size: number;
    batch_interval: number;
    compression_enabled: boolean;
    cache_ttl: number;
  };
  security: {
    enable_rls: boolean;
    audit_logging: boolean;
    rate_limiting: boolean;
  };
}

/**
 * Supabase通道类型
 */
export type SupabaseRealtimeChannel = RealtimeChannel;

// =============================================================================
// 错误类型定义
// =============================================================================

/**
 * 实时系统错误类型
 */
export type RealtimeErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'SUBSCRIPTION_FAILED'
  | 'MESSAGE_TOO_LARGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR';

/**
 * 实时系统错误
 */
export interface RealtimeError {
  code: RealtimeErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  request_id?: string;
}

/**
 * 错误恢复策略
 */
export interface ErrorRecoveryStrategy {
  strategy: 'retry' | 'reconnect' | 'fallback' | 'ignore';
  max_attempts?: number;
  delay?: number;
  backoff?: boolean;
}

// =============================================================================
// 事件监听器类型定义
// =============================================================================

/**
 * 通用事件监听器
 */
export interface EventListener<T = any> {
  (event: T): void | Promise<void>;
}

/**
 * 讨论事件监听器
 */
export interface DiscussionEventListener {
  (event: ThreadUpdate | DiscussionPost): void | Promise<void>;
}

/**
 * 通知事件监听器
 */
export interface NotificationEventListener {
  (event: Notification): void | Promise<void>;
}

/**
 * 进度事件监听器
 */
export interface ProgressEventListener {
  (event: LearningProgress | PathwayProgress | LearningActivity): void | Promise<void>;
}

/**
 * AI聊天事件监听器
 */
export interface AIChatEventListener {
  (event: AIResponseChunk | ChatMessage | AISuggestion): void | Promise<void>;
}

// =============================================================================
// 导出配置
// =============================================================================

/**
 * 实时系统默认配置
 */
export const DEFAULT_REALTIME_CONFIG: RealtimeConfig = {
  tables: {
    discussion_threads: {
      columns: ['*'],
      events: ['INSERT', 'UPDATE', 'DELETE']
    },
    discussion_posts: {
      columns: ['*'],
      events: ['INSERT', 'UPDATE', 'DELETE']
    },
    notifications: {
      columns: ['*'],
      events: ['INSERT', 'UPDATE']
    },
    self_learner_pathway_progress: {
      columns: ['*'],
      events: ['UPDATE']
    },
    self_learner_activities: {
      columns: ['*'],
      events: ['INSERT']
    },
    ai_chat_sessions: {
      columns: ['*'],
      events: ['INSERT', 'UPDATE']
    }
  },
  connection: {
    heartbeat_interval: 30000,
    reconnect_interval: 5000,
    max_reconnect_attempts: 5
  },
  performance: {
    batch_size: 10,
    batch_interval: 100,
    compression_enabled: true,
    cache_ttl: 300000
  },
  security: {
    enable_rls: true,
    audit_logging: true,
    rate_limiting: true
  }
};

/**
 * 性能优化默认配置
 */
export const DEFAULT_PERFORMANCE_CONFIG = {
  retry: {
    max_attempts: 3,
    base_delay: 1000,
    max_delay: 10000,
    backoff_factor: 2,
    jitter: true
  } as RetryConfig,
  cache: {
    enabled: true,
    ttl: 300000,
    max_size: 1000,
    compression: true,
    strategy: 'lru' as const
  } as CacheConfig
};
