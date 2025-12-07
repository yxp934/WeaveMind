/**
 * WeaveMind LMS 实时功能Hooks
 *
 * 这个文件包含所有实时功能的React Hooks，提供与后端实时系统的无缝集成。
 */

import { useState, useEffect, useRef, useCallback, useContext, createContext } from 'react';
import { apiClient } from '@/lib/api-client';

// 类型定义
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
type UnsubscribeFunction = () => void

interface PerformanceMetrics {
  connection_time: number
  message_latency: number
  throughput: number
  error_rate: number
  memory_usage: number
  cpu_usage: number
}

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
    // 使用API客户端订阅实时更新
    const subscription = apiClient.subscribe('discussion_posts', (payload) => {
      if (payload.eventType === 'INSERT' && payload.new.thread_id === threadId) {
        setPosts(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      }
    }, `thread_id=eq.${threadId}`);

    return () => {
      // 这里应该实现取消订阅逻辑
      console.log('Unsubscribing from discussion updates');
    };
  }, [threadId]);

  const { loading, error, connected } = useRealtimeSubscription(subscription, [threadId]);

  // 便利方法
  const publishPost = useCallback(async (postData: any) => {
    return apiClient.discussions.createPost({
      ...postData,
      thread_id: threadId
    });
  }, [threadId]);

  const updatePost = useCallback(async (postId: string, content: string) => {
    return apiClient.discussions.updatePost(postId, { content });
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    return apiClient.discussions.deletePost(postId);
  }, []);

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
    const subscription = apiClient.subscribe('notifications', (payload) => {
      if (payload.eventType === 'INSERT' && payload.new.user_id === userId) {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      } else if (payload.eventType === 'UPDATE') {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
      }
    }, `user_id=eq.${userId}`);

    return () => {
      console.log('Unsubscribing from notifications');
    };
  }, [userId]);

  const { loading, error, connected } = useRealtimeSubscription(subscription, [userId]);

  // 获取统计数据
  useEffect(() => {
    if (connected) {
      // 这里可以加载统计数据
      console.log('Loading notification stats for user:', userId);
    }
  }, [userId, connected]);

  // 便利方法
  const sendNotification = useCallback(async (notificationData: any) => {
    return apiClient.notifications.create(notificationData);
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    await apiClient.notifications.markAsRead(notificationId);
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await apiClient.notifications.markAllAsRead(userId);
    setUnreadCount(0);
  }, [userId]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    await apiClient.notifications.delete(notificationId);
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
    const subscription = apiClient.subscribe('learning_progress', (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.new.user_id === userId) {
          setProgress(payload.new);
        }
      }
    }, `user_id=eq.${userId}`);

    return () => {
      console.log('Unsubscribing from progress updates');
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
    return apiClient.selfLearner.updateProgress({
      user_id: userId,
      pathway_id: courseId,
      completed: progress >= 100,
      time_spent: timeSpentMinutes || 0,
      notes: componentId ? `Completed component: ${componentId}` : undefined
    });
  }, [userId]);

  const updatePathwayProgress = useCallback(async (
    pathwayId: string,
    itemId: string,
    completed: boolean
  ) => {
    return apiClient.selfLearner.updateProgress({
      user_id: userId,
      pathway_id: pathwayId,
      milestone_id: itemId,
      completed
    });
  }, [userId]);

  const recordActivity = useCallback(async (activityData: any) => {
    // 这里可以记录学习活动
    console.log('Recording learning activity:', activityData);
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
    const subscription = apiClient.subscribe('ai_chat_messages', (payload) => {
      if (payload.eventType === 'INSERT') {
        if (payload.new.session_id === sessionId) {
          setMessages(prev => [...prev, payload.new]);
        }
        if (payload.new.role === 'assistant' && !payload.new.is_complete) {
          setIsTyping(true);
        } else if (payload.new.is_complete) {
          setIsTyping(false);
        }
      }
    }, `session_id=eq.${sessionId}`);

    return () => {
      console.log('Unsubscribing from AI chat');
    };
  }, [sessionId, userId]);

  const { loading, error, connected } = useRealtimeSubscription(subscription, [sessionId, userId]);

  // 便利方法
  const sendMessage = useCallback(async (content: string) => {
    // 这里可以调用AI聊天API
    console.log('Sending message to AI:', content);
    return { success: true };
  }, [sessionId]);

  const executeToolCall = useCallback(async (toolName: string, params: any) => {
    return apiClient.callAITool(toolName, params);
  }, []);

  const createSession = useCallback(async (
    contextType: any,
    contextId?: string,
    title?: string
  ) => {
    // 这里可以创建AI聊天会话
    console.log('Creating AI chat session:', { contextType, contextId, title });
    return { sessionId: 'new-session-id' };
  }, [userId]);

  const endSession = useCallback(async () => {
    // 这里可以结束AI聊天会话
    console.log('Ending AI chat session:', sessionId);
    return { success: true };
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
export function useRealtimeConnection(config: any) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connection, setConnection] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      try {
        setStatus('connecting');
        // 模拟连接过程
        setTimeout(() => {
          if (isMounted) {
            setConnection({ id: 'connection-1', config });
            setStatus('connected');
            console.log('[useRealtimeConnection] 连接成功');
          }
        }, 1000);
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
        console.log('Closing connection:', connection.id);
      }
    };
  }, [JSON.stringify(config)]);

  const reconnect = useCallback(async () => {
    if (connection) {
      console.log('Closing existing connection:', connection.id);
      setConnection(null);
    }
    setStatus('connecting');
    setTimeout(() => {
      const newConnection = { id: 'connection-2', config };
      setConnection(newConnection);
      setStatus('connected');
    }, 1000);
  }, [config, connection]);

  const disconnect = useCallback(async () => {
    if (connection) {
      console.log('Disconnecting:', connection.id);
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
      // 模拟性能指标
      setMetrics({
        connection_time: Math.random() * 1000,
        message_latency: Math.random() * 100,
        throughput: Math.random() * 1000,
        error_rate: Math.random() * 0.1,
        memory_usage: Math.random() * 100,
        cpu_usage: Math.random() * 50
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // 每5秒更新

    return () => clearInterval(interval);
  }, []);

  const recordMessage = useCallback(() => {
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
  const [errors, setErrors] = useState<any[]>([]);
  const [currentError, setCurrentError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error | any) => {
    const realtimeError = {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An error occurred',
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
  subscribe: <T>(config: any, callback: (data: T) => void) => Promise<UnsubscribeFunction>;
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
    config: any,
    callback: (data: T) => void
  ): Promise<UnsubscribeFunction> => {
    try {
      // 模拟订阅过程
      const conn = { id: 'subscription-1', config };
      setConnection(conn);
      setConnected(true);
      setStatus('connected');

      // 返回取消订阅函数
      return () => {
        console.log('Unsubscribing from:', config);
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

// =============================================================================
// 简化的useRealtime Hook (为了兼容性)
// =============================================================================

/**
 * 简化的实时数据订阅Hook - 兼容现有代码
 *
 * @param tableName 表名
 * @param config 配置对象，包含onUpdate回调
 * @returns 订阅数据
 */
export function useRealtime<T = any>(
  tableName: string,
  config: {
    onUpdate?: (payload: any) => void;
    filter?: string;
    [key: string]: any;
  }
) {
  // 模拟实时订阅
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 模拟加载过程
    setLoading(true);

    // 模拟异步加载
    const timer = setTimeout(() => {
      setLoading(false);
      // 模拟数据
      setData({} as T);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [tableName]);

  // 如果提供了onUpdate回调，模拟实时更新
  useEffect(() => {
    if (config.onUpdate && data) {
      // 模拟实时事件
      const interval = setInterval(() => {
        // 这里可以触发模拟的实时更新
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [config.onUpdate, data]);

  return {
    data,
    loading,
    error,
    connected: true,
    unsubscribe: () => {}
  };
}
