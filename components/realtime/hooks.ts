/**
 * WeaveMind LMS 实时功能Hooks
 *
 * 这个文件包含所有实时功能的React Hooks，提供与后端实时系统的无缝集成。
 */

import { useState, useEffect, useRef, useCallback, useContext, createContext } from 'react';
import { useSession } from '../auth/session-provider'; // 假设存在会话提供者
import {
  ConnectionConfig,
  ConnectionStatus,
  PerformanceMetrics,
  RealtimeError,
  RealtimeEventListener,
  UnsubscribeFunction
} from '../../lib/realtime/types';

// 导入实时管理器（假设这些导出存在）
import {
  discussionRealtime,
  notificationRealtime,
  progressRealtime,
  aiChatRealtime,
  connectionManager,
  cacheManager
} from '../../lib/realtime/index';

// =============================================================================
// 实时数据订阅Hook
// =============================================================================

/**
 * 通用实时数据订阅Hook
 *
 * @param subscription 订阅函数
 * @param dependencies 依赖数组
 * @returns 订阅状态和数据
 */
export function useRealtimeSubscription<T>(
  subscription: () => Promise<UnsubscribeFunction>,
  dependencies: any[]
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  connected: boolean;
  unsubscribe: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);
  const unsubscribeRef = useRef<UnsubscribeFunction | null>(null);

  useEffect(() => {
    let isMounted = true;

    const subscribe = async () => {
      try {
        setLoading(true);
        setError(null);

        const unsubscribe = await subscription();

        if (!isMounted) {
          unsubscribe();
          return;
        }

        unsubscribeRef.current = unsubscribe;
        setConnected(true);
        setLoading(false);

        console.log('[useRealtimeSubscription] 订阅成功');
      } catch (err) {
        if (!isMounted) return;

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setConnected(false);
        setLoading(false);

        console.error('[useRealtimeSubscription] 订阅失败:', error);
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, dependencies);

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      setConnected(false);
    }
  }, []);

  return { data, loading, error, connected, unsubscribe };
}

// =============================================================================
// 讨论实时Hook
// =============================================================================

/**
 * 讨论实时数据Hook
 */
export function useDiscussionRealtime(threadId: string) {
  const [posts, setPosts] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [thread, setThread] = useState<any | null>(null);

  const subscription = useCallback(() => {
    const unsubscribers: UnsubscribeFunction[] = [];

    // 订阅帖子更新
    unsubscribers.push(
      discussionRealtime.subscribeToThread(threadId, (update) => {
        setThread(update.thread);
      })
    );

    // 订阅帖子回复
    unsubscribers.push(
      discussionRealtime.subscribeToPosts(threadId, (post) => {
        setPosts(prev => {
          const existing = prev.find(p => p.id === post.id);
          if (existing) {
            return prev.map(p => p.id === post.id ? post : p);
          } else {
            return [...prev, post];
          }
        });
      })
    );

    // 订阅在线用户
    unsubscribers.push(
      discussionRealtime.subscribeToOnlineUsers(threadId, (users) => {
        setOnlineUsers(users);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [threadId]);

  const { loading, error, connected } = useRealtimeSubscription(subscription, [threadId]);

  // 便利方法
  const publishPost = useCallback(async (postData: any) => {
    return discussionRealtime.publishNewPost(threadId, postData);
  }, [threadId]);

  const updatePost = useCallback(async (postId: string, content: string) => {
    return discussionRealtime.updatePost(postId, content);
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    return discussionRealtime.deletePost(postId, threadId);
  }, [threadId]);

  return {
    posts,
    onlineUsers,
    thread,
    loading,
    error,
    connected,
    publishPost,
    updatePost,
    deletePost
  };
}

// =============================================================================
// 通知实时Hook
// =============================================================================

/**
 * 通知实时数据Hook
 */
export function useNotificationRealtime(userId: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const subscription = useCallback(() => {
    return notificationRealtime.subscribeToUserNotifications(userId, (notification) => {
      setNotifications(prev => {
        const existing = prev.find(n => n.id === notification.id);
        if (existing) {
          return prev.map(n => n.id === notification.id ? notification : n);
        } else {
          return [notification, ...prev];
        }
      });

      // 更新未读计数
      if (!notification.is_read) {
        setUnreadCount(prev => prev + 1);
      }
    });
  }, [userId]);

  const { loading, error, connected } = useRealtimeSubscription(subscription, [userId]);

  // 获取统计数据
  useEffect(() => {
    if (connected) {
      notificationRealtime.getNotificationStats(userId).then(setStats);
    }
  }, [userId, connected]);

  // 便利方法
  const sendNotification = useCallback(async (notificationData: any) => {
    return notificationRealtime.sendNotification(notificationData);
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    await notificationRealtime.markAsRead(notificationId);
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await notificationRealtime.markAllAsRead(userId);
    setUnreadCount(0);
  }, [userId]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    await notificationRealtime.deleteNotification(notificationId);
  }, []);

  return {
    notifications,
    stats,
    unreadCount,
    loading,
    error,
    connected,
    sendNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}

// =============================================================================
// 学习进度实时Hook
// =============================================================================

/**
 * 学习进度实时数据Hook
 */
export function useProgressRealtime(userId: string, courseId?: string, pathwayId?: string) {
  const [progress, setProgress] = useState<any | null>(null);
  const [pathwayProgress, setPathwayProgress] = useState<any | null>(null);
  const [activities, setActivities] = useState<any[]>([]);

  const subscription = useCallback(() => {
    const unsubscribers: UnsubscribeFunction[] = [];

    // 订阅学习进度
    unsubscribers.push(
      progressRealtime.subscribeToLearningProgress(userId, (progressUpdate) => {
        setProgress(progressUpdate);
      })
    );

    // 订阅路径进度
    if (pathwayId) {
      unsubscribers.push(
        progressRealtime.subscribeToPathwayProgress(pathwayId, (pathwayUpdate) => {
          setPathwayProgress(pathwayUpdate);
        })
      );
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [userId, pathwayId]);

  const { loading, error, connected } = useRealtimeSubscription(subscription, [userId, pathwayId]);

  // 便利方法
  const updateLearningProgress = useCallback(async (
    courseId: string,
    progress: number,
    componentId?: string,
    timeSpentMinutes?: number
  ) => {
    return progressRealtime.updateLearningProgress(
      userId,
      courseId,
      progress,
      componentId,
      timeSpentMinutes
    );
  }, [userId]);

  const updatePathwayProgress = useCallback(async (
    pathwayId: string,
    itemId: string,
    completed: boolean
  ) => {
    return progressRealtime.updatePathwayProgress(userId, pathwayId, itemId, completed);
  }, [userId]);

  const recordActivity = useCallback(async (activityData: any) => {
    return progressRealtime.recordLearningActivity(activityData);
  }, []);

  return {
    progress,
    pathwayProgress,
    activities,
    loading,
    error,
    connected,
    updateLearningProgress,
    updatePathwayProgress,
    recordActivity
  };
}

// =============================================================================
// AI聊天实时Hook
// =============================================================================

/**
 * AI聊天实时数据Hook
 */
export function useAIChatRealtime(sessionId: string, userId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [session, setSession] = useState<any | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const subscription = useCallback(() => {
    const unsubscribers: UnsubscribeFunction[] = [];

    // 订阅AI响应
    unsubscribers.push(
      aiChatRealtime.subscribeToAIResponse(sessionId, (response) => {
        if (response.chunk) {
          setIsTyping(!response.chunk.is_complete);
          // 处理流式响应
        }
      })
    );

    // 订阅AI建议
    unsubscribers.push(
      aiChatRealtime.subscribeToAISuggestions(userId, (suggestion) => {
        setSuggestions(prev => [...prev, suggestion]);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [sessionId, userId]);

  const { loading, error, connected } = useRealtimeSubscription(subscription, [sessionId, userId]);

  // 便利方法
  const sendMessage = useCallback(async (content: string) => {
    return aiChatRealtime.sendMessage(sessionId, {
      session_id: sessionId,
      content,
      role: 'user'
    });
  }, [sessionId]);

  const executeToolCall = useCallback(async (toolName: string, params: any) => {
    return aiChatRealtime.executeToolCall(sessionId, toolName, params);
  }, [sessionId]);

  const createSession = useCallback(async (
    contextType: any,
    contextId?: string,
    title?: string
  ) => {
    return aiChatRealtime.createChatSession(userId, contextType, contextId, title);
  }, [userId]);

  const endSession = useCallback(async () => {
    return aiChatRealtime.endChatSession(sessionId);
  }, [sessionId]);

  return {
    messages,
    session,
    suggestions,
    isTyping,
    loading,
    error,
    connected,
    sendMessage,
    executeToolCall,
    createSession,
    endSession
  };
}

// =============================================================================
// 连接管理Hook
// =============================================================================

/**
 * 连接管理Hook
 */
export function useRealtimeConnection(config: ConnectionConfig) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connection, setConnection] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      try {
        setStatus('connecting');
        const conn = await connectionManager.manageConnection(config);

        if (!isMounted) return;

        setConnection(conn);
        setStatus('connected');

        console.log('[useRealtimeConnection] 连接成功');
      } catch (error) {
        if (!isMounted) return;

        setStatus('error');
        console.error('[useRealtimeConnection] 连接失败:', error);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (connection) {
        connectionManager.closeConnection(connection.id);
      }
    };
  }, [JSON.stringify(config)]);

  const reconnect = useCallback(async () => {
    if (connection) {
      await connectionManager.closeConnection(connection.id);
      setConnection(null);
    }

    const newConnection = await connectionManager.manageConnection(config);
    setConnection(newConnection);
    setStatus('connected');
  }, [config, connection]);

  const disconnect = useCallback(async () => {
    if (connection) {
      await connectionManager.closeConnection(connection.id);
      setConnection(null);
    }
    setStatus('disconnected');
  }, [connection]);

  return {
    status,
    connection,
    connect: reconnect,
    disconnect,
    reconnect
  };
}

// =============================================================================
// 性能监控Hook
// =============================================================================

/**
 * 性能监控Hook
 */
export function useRealtimePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    connection_time: 0,
    message_latency: 0,
    throughput: 0,
    error_rate: 0,
    memory_usage: 0,
    cpu_usage: 0
  });

  useEffect(() => {
    const updateMetrics = () => {
      const stats = connectionManager.getConnectionStats();
      setMetrics({
        connection_time: stats.average_latency,
        message_latency: stats.average_latency,
        throughput: stats.messages_per_second,
        error_rate: stats.failed_connections / Math.max(stats.total_connections, 1),
        memory_usage: stats.memory_usage,
        cpu_usage: 0 // 暂时无法获取CPU使用率
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // 每5秒更新

    return () => clearInterval(interval);
  }, []);

  const recordMessage = useCallback(() => {
    // 这里可以调用性能监控器
    console.log('[useRealtimePerformance] 记录消息');
  }, []);

  const recordError = useCallback(() => {
    console.log('[useRealtimePerformance] 记录错误');
  }, []);

  const recordLatency = useCallback((latency: number) => {
    console.log('[useRealtimePerformance] 记录延迟:', latency);
  }, []);

  return {
    metrics,
    recordMessage,
    recordError,
    recordLatency
  };
}

// =============================================================================
// 错误处理Hook
// =============================================================================

/**
 * 错误处理Hook
 */
export function useRealtimeError() {
  const [errors, setErrors] = useState<RealtimeError[]>([]);
  const [currentError, setCurrentError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error | RealtimeError) => {
    const realtimeError: RealtimeError = {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: `client_${Date.now()}`
    };

    setErrors(prev => [...prev, realtimeError]);
    setCurrentError(error);

    console.error('[useRealtimeError] 实时错误:', realtimeError);
  }, []);

  const clearError = useCallback(() => {
    setCurrentError(null);
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
    setCurrentError(null);
  }, []);

  return {
    errors,
    currentError,
    handleError,
    clearError,
    clearAllErrors
  };
}

// =============================================================================
// 实时上下文Provider Hook
// =============================================================================

/**
 * 实时上下文接口
 */
interface RealtimeContextValue {
  connected: boolean;
  status: ConnectionStatus;
  subscribe: <T>(config: ConnectionConfig, callback: (data: T) => void) => Promise<UnsubscribeFunction>;
  publish: (channel: string, data: any) => Promise<void>;
  performance: PerformanceMetrics;
  error: Error | null;
  connection: any;
}

/**
 * 创建实时上下文
 */
export const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * 使用实时上下文的Hook
 */
export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext必须在RealtimeProvider内使用');
  }
  return context;
}

/**
 * 创建实时Provider的Hook
 */
export function useRealtimeProvider() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    connection_time: 0,
    message_latency: 0,
    throughput: 0,
    error_rate: 0,
    memory_usage: 0,
    cpu_usage: 0
  });
  const [error, setError] = useState<Error | null>(null);
  const [connection, setConnection] = useState<any>(null);

  const subscribe = useCallback(async <T>(
    config: ConnectionConfig,
    callback: (data: T) => void
  ): Promise<UnsubscribeFunction> => {
    try {
      const conn = await connectionManager.manageConnection(config);
      setConnection(conn);
      setConnected(true);
      setStatus('connected');

      // 这里应该设置实际的订阅逻辑
      // 返回取消订阅函数
      return () => {
        connectionManager.closeConnection(conn.id);
        setConnected(false);
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setStatus('error');
      throw error;
    }
  }, []);

  const publish = useCallback(async (channel: string, data: any) => {
    // 实现广播逻辑
    console.log('[RealtimeProvider] 广播:', channel, data);
  }, []);

  return {
    connected,
    status,
    subscribe,
    publish,
    performance,
    error,
    connection
  };
}
