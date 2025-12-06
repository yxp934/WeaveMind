/**
 * WeaveMind LMS 实时上下文提供者
 *
 * 这个组件提供全局实时功能上下文，管理连接状态、性能监控和错误处理。
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from '../auth/session-provider'; // 假设存在
import {
  ConnectionConfig,
  ConnectionStatus,
  PerformanceMetrics,
  RealtimeError,
  RealtimeEventListener,
  UnsubscribeFunction
} from '../../lib/realtime/types';

// 导入实时管理器
import {
  discussionRealtime,
  notificationRealtime,
  progressRealtime,
  aiChatRealtime,
  connectionManager,
  cacheManager
} from '../../lib/realtime/types';

// 导入自定义hooks
import {
  useRealtimeProvider,
  useRealtimeConnection,
  useRealtimePerformance,
  useRealtimeError
} from './hooks';

/**
 * 实时上下文接口
 */
interface RealtimeContextValue {
  // 连接状态
  connected: boolean;
  status: ConnectionStatus;
  connection: any;

  // 订阅功能
  subscribe: <T>(config: ConnectionConfig, callback: (data: T) => void) => Promise<UnsubscribeFunction>;
  unsubscribe: (subscriptionId: string) => void;

  // 发布功能
  publish: (channel: string, data: any) => Promise<void>;
  broadcast: (channel: string, data: any) => Promise<void>;

  // 性能监控
  performance: PerformanceMetrics;
  recordMessage: () => void;
  recordError: () => void;
  recordLatency: (latency: number) => void;

  // 错误处理
  error: Error | null;
  errors: RealtimeError[];
  handleError: (error: Error | RealtimeError) => void;
  clearError: () => void;
  clearAllErrors: () => void;

  // 便利方法
  getConnectionStats: () => any;
  getCacheStats: () => any;
  resetPerformance: () => void;
}

/**
 * 创建实时上下文
 */
const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * 实时提供者属性
 */
interface RealtimeProviderProps {
  children: ReactNode;
  enableAutoConnect?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableErrorHandling?: boolean;
  connectionConfig?: Partial<ConnectionConfig>;
}

/**
 * 实时提供者组件
 *
 * 提供全局实时功能管理，包括连接状态、性能监控和错误处理。
 */
export function RealtimeProvider({
  children,
  enableAutoConnect = true,
  enablePerformanceMonitoring = true,
  enableErrorHandling = true,
  connectionConfig = {}
}: RealtimeProviderProps) {
  const { user } = useSession();

  // 基础状态
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connection, setConnection] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [errors, setErrors] = useState<RealtimeError[]>([]);

  // 订阅管理
  const [subscriptions, setSubscriptions] = useState<Map<string, UnsubscribeFunction>>(new Map());

  // 使用自定义hooks
  const {
    performance,
    recordMessage,
    recordError,
    recordLatency
  } = useRealtimePerformance();

  const {
    handleError,
    clearError,
    clearAllErrors
  } = useRealtimeError();

  // 连接管理
  const {
    subscribe: subscribeToConnection,
    disconnect: disconnectFromConnection,
    reconnect: reconnectConnection
  } = useRealtimeConnection(connectionConfig);

  /**
   * 处理错误
   */
  const handleRealtimeError = useCallback((error: Error | RealtimeError) => {
    const realtimeError: RealtimeError = {
      code: error instanceof Error ? 'CLIENT_ERROR' : error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: `provider_${Date.now()}`,
      details: error instanceof Error ? { stack: error.stack } : error.details
    };

    setErrors(prev => [...prev.slice(-99), realtimeError]); // 保持最近100个错误
    setError(error);

    if (enableErrorHandling) {
      console.error('[RealtimeProvider] 实时错误:', realtimeError);
    }
  }, [enableErrorHandling]);

  /**
   * 订阅实时数据
   */
  const subscribe = useCallback(async <T>(
    config: ConnectionConfig,
    callback: (data: T) => void
  ): Promise<UnsubscribeFunction> => {
    try {
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 根据表名选择相应的管理器
      let unsubscribe: UnsubscribeFunction;

      if (config.channel.startsWith('discussion_')) {
        if (config.channel === 'discussion_threads') {
          // 订阅讨论帖子
          unsubscribe = await discussionRealtime.subscribeToThread(
            config.filter?.thread_id || '',
            callback as RealtimeEventListener
          );
        } else if (config.channel === 'discussion_posts') {
          // 订阅讨论回复
          unsubscribe = await discussionRealtime.subscribeToPosts(
            config.filter?.thread_id || '',
            callback as RealtimeEventListener
          );
        } else {
          throw new Error(`未知的讨论表: ${config.channel}`);
        }
      } else if (config.channel === 'notifications') {
        // 订阅通知
        unsubscribe = await notificationRealtime.subscribeToUserNotifications(
          config.filter?.user_id || user?.id || '',
          callback as RealtimeEventListener
        );
      } else if (config.channel.startsWith('self_learner_')) {
        // 订阅学习进度
        unsubscribe = await progressRealtime.subscribeToLearningProgress(
          config.filter?.user_id || user?.id || '',
          callback as RealtimeEventListener
        );
      } else if (config.channel.startsWith('ai_chat_') || config.channel === 'chat_messages') {
        // 订阅AI聊天
        unsubscribe = await aiChatRealtime.subscribeToAIResponse(
          config.filter?.session_id || '',
          callback as RealtimeEventListener
        );
      } else {
        throw new Error(`未知的表: ${config.channel}`);
      }

      // 存储订阅
      setSubscriptions(prev => new Map(prev).set(subscriptionId, unsubscribe));

      // 记录消息
      recordMessage();

      return () => {
        unsubscribe();
        setSubscriptions(prev => {
          const newMap = new Map(prev);
          newMap.delete(subscriptionId);
          return newMap;
        });
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleRealtimeError(error);
      throw error;
    }
  }, [user?.id, handleRealtimeError, recordMessage]);

  /**
   * 取消订阅
   */
  const unsubscribe = useCallback((subscriptionId: string) => {
    const unsubscribeFn = subscriptions.get(subscriptionId);
    if (unsubscribeFn) {
      unsubscribeFn();
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(subscriptionId);
        return newMap;
      });
    }
  }, [subscriptions]);

  /**
   * 发布消息
   */
  const publish = useCallback(async (channel: string, data: any) => {
    try {
      // 这里可以实现通用的发布逻辑
      console.log('[RealtimeProvider] 发布消息:', channel, data);
      recordMessage();
    } catch (err) {
      handleRealtimeError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [handleRealtimeError, recordMessage]);

  /**
   * 广播消息
   */
  const broadcast = useCallback(async (channel: string, data: any) => {
    try {
      // 广播到所有订阅者
      const subscribers = Array.from(subscriptions.values());
      subscribers.forEach(unsubscribe => {
        // 这里需要实现广播逻辑
      });
      console.log('[RealtimeProvider] 广播消息:', channel, data);
      recordMessage();
    } catch (err) {
      handleRealtimeError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [subscriptions, handleRealtimeError, recordMessage]);

  /**
   * 获取连接统计
   */
  const getConnectionStats = useCallback(() => {
    return connectionManager.getConnectionStats();
  }, []);

  /**
   * 获取缓存统计
   */
  const getCacheStats = useCallback(() => {
    return cacheManager.getStats();
  }, []);

  /**
   * 重置性能指标
   */
  const resetPerformance = useCallback(() => {
    // 重置性能监控
    console.log('[RealtimeProvider] 重置性能指标');
  }, []);

  /**
   * 清理所有订阅
   */
  const cleanup = useCallback(() => {
    subscriptions.forEach(unsubscribe => unsubscribe());
    setSubscriptions(new Map());
    setConnected(false);
    setStatus('disconnected');
  }, [subscriptions]);

  /**
   * 自动连接
   */
  useEffect(() => {
    if (enableAutoConnect && user && !connected) {
      // 这里可以添加自动连接逻辑
      console.log('[RealtimeProvider] 自动连接已启用');
    }
  }, [enableAutoConnect, user, connected]);

  /**
   * 性能监控
   */
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      const interval = setInterval(() => {
        // 更新性能指标
        const stats = connectionManager.getConnectionStats();
        console.log('[RealtimeProvider] 性能指标:', stats);
      }, 30000); // 每30秒更新

      return () => clearInterval(interval);
    }
  }, [enablePerformanceMonitoring]);

  /**
   * 清理函数
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 上下文值
  const contextValue: RealtimeContextValue = {
    // 连接状态
    connected,
    status,
    connection,

    // 订阅功能
    subscribe,
    unsubscribe,

    // 发布功能
    publish,
    broadcast,

    // 性能监控
    performance,
    recordMessage,
    recordError,
    recordLatency,

    // 错误处理
    error,
    errors,
    handleError: handleRealtimeError,
    clearError,
    clearAllErrors,

    // 便利方法
    getConnectionStats,
    getCacheStats,
    resetPerformance
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * 使用实时上下文的Hook
 */
export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime必须在RealtimeProvider内使用');
  }
  return context;
}

/**
 * 便利Hook：检查连接状态
 */
export function useRealtimeConnectionStatus() {
  const { connected, status, error } = useRealtime();
  return { connected, status, error };
}

/**
 * 便利Hook：性能监控
 */
export function useRealtimePerformanceMonitor() {
  const { performance, recordMessage, recordError, recordLatency } = useRealtime();
  return { performance, recordMessage, recordError, recordLatency };
}

/**
 * 便利Hook：错误处理
 */
export function useRealtimeErrorHandler() {
  const { error, errors, handleError, clearError, clearAllErrors } = useRealtime();
  return { error, errors, handleError, clearError, clearAllErrors };
}

/**
 * 便利Hook：订阅管理
 */
export function useRealtimeSubscription() {
  const { subscribe, unsubscribe } = useRealtime();
  return { subscribe, unsubscribe };
}

/**
 * 便利Hook：发布和广播
 */
export function useRealtimePublish() {
  const { publish, broadcast } = useRealtime();
  return { publish, broadcast };
}
