// 实时功能React Hooks

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToDiscussionThread
} from '@/lib/realtime/discussion-realtime';
import {
  subscribeToUserNotifications,
  sendNotification
} from '@/lib/realtime/notification-realtime';
import {
  subscribeToLearningProgress,
  updateLearningProgress,
  updatePathwayProgress
} from '@/lib/realtime/progress-realtime';
import {
  subscribeToAIResponse
} from '@/lib/realtime/ai-chat-realtime';

// 讨论实时Hook
export function useDiscussionRealtime(threadId: string) {
  const [posts, setPosts] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!threadId) return;

    const subscribe = async () => {
      try {
        const unsubscribe = await subscribeToDiscussionThread(threadId, (event) => {
          if (event.eventType === 'insert') {
            setPosts(prev => [event.data, ...prev]);
          } else if (event.eventType === 'update') {
            setPosts(prev => prev.map(p => p.id === event.data.id ? event.data : p));
          } else if (event.eventType === 'delete') {
            setPosts(prev => prev.filter(p => p.id !== event.data.id));
          }
        });
        subscriptionRef.current = unsubscribe;
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to subscribe to discussion:', error);
        setIsConnected(false);
      }
    };

    subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      setIsConnected(false);
    };
  }, [threadId]);

  return { posts, isConnected };
}

// 通知实时Hook
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) return;

    const subscribe = async () => {
      try {
        const unsubscribe = await subscribeToUserNotifications(userId, (event) => {
          if (event.eventType === 'insert') {
            setNotifications(prev => [event.notification, ...prev]);
            if (!event.notification.read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (event.eventType === 'update') {
            setNotifications(prev => prev.map(n => n.id === event.notification.id ? event.notification : n));
          }
        });
        subscriptionRef.current = unsubscribe;
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to subscribe to notifications:', error);
        setIsConnected(false);
      }
    };

    subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      setIsConnected(false);
    };
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // TODO: 实现标记为已读
  }, []);

  const markAllAsRead = useCallback(async () => {
    // TODO: 实现全部标记为已读
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead
  };
}

// 学习进度实时Hook
export function useLearningProgress(userId: string, pathwayId: string) {
  const [progress, setProgress] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId || !pathwayId) return;

    const subscribe = async () => {
      try {
        const unsubscribe = await subscribeToLearningProgress(userId, (event) => {
          if (event.eventType === 'insert' || event.eventType === 'update') {
            setProgress(event.progress);
          }
        });
        subscriptionRef.current = unsubscribe;
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to subscribe to learning progress:', error);
        setIsConnected(false);
      }
    };

    subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      setIsConnected(false);
    };
  }, [userId, pathwayId]);

  const updateProgress = useCallback(async (progressData: any) => {
    try {
      await updateLearningProgress(progressData);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }, []);

  return { progress, isConnected, updateProgress };
}

// AI聊天实时Hook
export function useAIChat(sessionId: string, userId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId || !userId) return;

    const subscribe = async () => {
      try {
        const unsubscribe = await subscribeToAIResponse(sessionId, (event) => {
          if (event.eventType === 'insert') {
            setMessages(prev => [...prev, event.message]);
            if (event.message.role === 'assistant' && !event.message.is_complete) {
              setIsTyping(true);
            } else if (event.message.is_complete) {
              setIsTyping(false);
            }
          }
        });
        subscriptionRef.current = unsubscribe;
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to subscribe to AI chat:', error);
        setIsConnected(false);
      }
    };

    subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      setIsConnected(false);
    };
  }, [sessionId, userId]);

  const sendMessage = useCallback(async (content: string) => {
    // TODO: 实现发送消息
  }, []);

  return {
    messages,
    isConnected,
    isTyping,
    sendMessage
  };
}

// 实时连接状态Hook
export function useRealtimeConnectionStatus() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [subscriptions, setSubscriptions] = useState(0);

  useEffect(() => {
    // TODO: 实现连接状态监控
    setStatus('connected');
  }, []);

  return { status, subscriptions };
}

// 实时性能监控Hook
export function useRealtimePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    latency: 0,
    messageCount: 0,
    errorCount: 0
  });

  useEffect(() => {
    // TODO: 实现性能指标收集
  }, []);

  return { metrics };
}

// 实时错误处理Hook
export function useRealtimeErrorHandler() {
  const [errors, setErrors] = useState<Error[]>([]);

  const addError = useCallback((error: Error) => {
    setErrors(prev => [...prev, error]);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return { errors, addError, clearErrors };
}

// 实时发布Hook
export function useRealtimePublish() {
  const publish = useCallback(async (event: string, data: any) => {
    console.log('Publishing realtime event:', { event, data });
    // TODO: 实现事件发布
  }, []);

  return { publish };
}
