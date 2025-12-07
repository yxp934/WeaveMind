// 实时功能组件入口

// Hooks导出
export {
  useDiscussionRealtime,
  useNotifications,
  useLearningProgress,
  useAIChat,
  useRealtimeConnectionStatus,
  useRealtimePerformanceMonitor,
  useRealtimeErrorHandler,
  useRealtimePublish
} from './hooks';

// 类型导出
export type {
  RealtimePayload,
  RealtimeConfig,
  RealtimeEventType,
  EventFilter,
  SubscriptionOptions
} from '@/lib/realtime/types';

// 实时管理器导出
export {
  realtimeManager,
  subscribeToTable,
  unsubscribeAll
} from '@/lib/realtime/index';

// 讨论实时功能导出
export {
  subscribeToDiscussionThread,
  publishDiscussionPost,
  updateDiscussionPost,
  deleteDiscussionPost,
  getDiscussionOnlineUsers,
  getDiscussionConnectionStatus,
  cleanupDiscussionRealtime
} from '@/lib/realtime/discussion-realtime';

// 通知实时功能导出
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
} from '@/lib/realtime/notification-realtime';

// 进度实时功能导出
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
} from '@/lib/realtime/progress-realtime';

// AI聊天实时功能导出
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
} from '@/lib/realtime/ai-chat-realtime';

// 事件处理器导出
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
} from '@/lib/realtime/event-handlers';

// 性能监控导出
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
} from '@/lib/realtime/performance';

// Supabase配置导出
export {
  REALTIME_TABLES,
  DEFAULT_REALTIME_CONFIG,
  DEFAULT_PERFORMANCE_CONFIG,
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
} from '@/supabase/realtime-config';
