/**
 * WeaveMind LMS 实时组件统一导出
 *
 * 这个文件导出所有实时功能的组件、hooks和工具函数。
 */

// 组件导出
export { DiscussionRealtime } from './DiscussionRealtime';
export { NotificationRealtime } from './NotificationRealtime';

// Hooks导出
export {
  useRealtimeSubscription,
  useDiscussionRealtime,
  useNotificationRealtime,
  useProgressRealtime,
  useAIChatRealtime,
  useRealtimeConnection,
  useRealtimePerformance,
  useRealtimeError,
  useRealtimeProvider,
  RealtimeContext,
  useRealtimeContext
} from './hooks';

// Provider导出
export { RealtimeProvider, useRealtime, useRealtimeConnectionStatus, useRealtimePerformanceMonitor, useRealtimeErrorHandler, useRealtimeSubscription, useRealtimePublish } from './RealtimeProvider';

// 类型导出（从types文件重新导出）
export type {
  DiscussionThread,
  DiscussionPost,
  ThreadUpdate,
  PostData,
  OnlineUser,
  Notification,
  NotificationData,
  NotificationStats,
  BatchNotificationOperation,
  LearningProgress,
  PathwayProgress,
  LearningActivity,
  ProgressUpdate,
  AIChatSession,
  ChatMessage,
  AIResponseChunk,
  ToolCall,
  AISuggestion,
  ChatMessageData,
  SupabaseEvent,
  EventHandlerResult,
  EventFilter,
  ConnectionConfig,
  RetryConfig,
  ConnectionStats,
  PerformanceMetrics,
  CacheConfig,
  RealtimeConfig,
  RealtimeError,
  EventListener,
  DiscussionEventListener,
  NotificationEventListener,
  ProgressEventListener,
  AIChatEventListener,
  DEFAULT_REALTIME_CONFIG,
  DEFAULT_PERFORMANCE_CONFIG
} from '../../lib/realtime/types';

// 实时管理器导出
export {
  discussionRealtime,
  notificationRealtime,
  progressRealtime,
  aiChatRealtime,
  realtimeEventHandler,
  connectionManager,
  cacheManager
} from '../../lib/realtime/index';

// 便利函数导出
export {
  subscribeToDiscussionThread,
  publishDiscussionPost,
  updateDiscussionPost,
  deleteDiscussionPost,
  getDiscussionOnlineUsers,
  getDiscussionConnectionStatus,
  cleanupDiscussionRealtime
} from '../../lib/realtime/discussion-realtime';

export {
  subscribeToUserNotifications,
  sendNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  batchNotificationOperation,
  getNotificationStats,
  deleteNotification,
  archiveNotification,
  getUserNotifications,
  getNotificationConnectionStatus,
  cleanupNotificationRealtime
} from '../../lib/realtime/notification-realtime';

export {
  subscribeToLearningProgress,
  subscribeToPathwayProgress,
  updateLearningProgress,
  updatePathwayProgress,
  recordLearningActivity,
  getLearningProgress,
  getPathwayProgress,
  getUserAllProgress,
  getProgressConnectionStatus,
  cleanupProgressRealtime
} from '../../lib/realtime/progress-realtime';

export {
  subscribeToAIResponse,
  subscribeToAISuggestions,
  sendChatMessage,
  sendAIResponse,
  executeToolCall,
  createChatSession,
  endChatSession,
  getChatMessages,
  sendAISuggestion,
  getAIChatConnectionStatus,
  cleanupAIChatRealtime
} from '../../lib/realtime/ai-chat-realtime';

export {
  handleDiscussionEvent,
  handleNotificationEvent,
  handleProgressEvent,
  handleAIChatEvent,
  handleRealtimeEvent,
  addEventRoute,
  removeEventRoute,
  getEventStats,
  getEventErrorLog,
  resetEventStats
} from '../../lib/realtime/event-handlers';

export {
  createConnection,
  manageConnection,
  closeConnection,
  getConnectionStats,
  cleanupAllConnections,
  setCache,
  getCache,
  deleteCache,
  clearCache,
  getCacheStats
} from '../../lib/realtime/performance';

// Supabase配置导出
export {
  REALTIME_TABLES,
  REALTIME_CONFIG,
  RealtimeFilterGenerator,
  RealtimeSubscriptionManager,
  RealtimeConfigValidator,
  RealtimePerformanceMonitor,
  subscriptionManager,
  configValidator,
  performanceMonitor,
  createUserNotificationSubscription,
  createDiscussionThreadSubscription,
  createLearningProgressSubscription,
  createAIChatSubscription,
  validateRealtimeConfig,
  getSubscriptionStats,
  getPerformanceMetrics,
  recordRealtimeMessage,
  recordRealtimeError,
  recordRealtimeLatency
} from '../../supabase/realtime-config';
