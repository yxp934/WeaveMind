/**
 * WeaveMind LMS 实时事件处理器系统
 *
 * 这个模块实现了统一的实时事件处理逻辑，包括：
 * - 统一处理所有实时事件
 * - 实现事件路由和分发
 * - 提供错误处理和重试机制
 * - 事件审计和日志记录
 */

import {
  SupabaseEvent,
  SupabaseEventType,
  EventHandlerResult,
  EventFilter,
  RealtimeError,
  RealtimeErrorCode,
  DiscussionThread,
  DiscussionPost,
  Notification,
  LearningProgress,
  PathwayProgress,
  LearningActivity,
  AIChatSession,
  ChatMessage,
  DEFAULT_REALTIME_CONFIG
} from './types';

/**
 * 事件路由配置
 */
interface EventRoute {
  table: string;
  eventType: SupabaseEventType;
  handler: string;
  priority: number;
  filter?: EventFilter;
}

/**
 * 事件统计信息
 */
interface EventStats {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  eventsByType: Record<string, number>;
  eventsByTable: Record<string, number>;
  averageProcessingTime: number;
  lastProcessedAt?: string;
}

/**
 * 实时事件处理器
 *
 * 负责统一管理和处理所有实时事件，包括路由、分发、错误处理和统计。
 */
export class RealtimeEventHandler {
  private routes = new Map<string, EventRoute[]>();
  private eventStats: EventStats = {
    totalEvents: 0,
    processedEvents: 0,
    failedEvents: 0,
    eventsByType: {},
    eventsByTable: {},
    averageProcessingTime: 0
  };
  private processingTimes: number[] = [];
  private errorLog: RealtimeError[] = [];
  private maxErrorLogSize = 1000;
  private maxProcessingTimeHistory = 100;

  constructor() {
    this.initializeDefaultRoutes();
  }

  /**
   * 处理讨论事件
   *
   * @param event Supabase事件
   * @returns 处理结果
   */
  async handleDiscussionEvent(event: SupabaseEvent<DiscussionThread | DiscussionPost>): Promise<EventHandlerResult> {
    const startTime = Date.now();

    try {
      this.updateEventStats(event);

      let result: EventHandlerResult;

      // 根据表名路由到不同的处理器
      switch (event.table) {
        case 'discussion_threads':
          result = await this.handleDiscussionThreadEvent(event);
          break;
        case 'discussion_posts':
          result = await this.handleDiscussionPostEvent(event);
          break;
        default:
          result = {
            success: false,
            processed: false,
            error: `未知的讨论表: ${event.table}`
          };
      }

      this.updateProcessingTime(Date.now() - startTime);

      if (result.success) {
        this.eventStats.processedEvents++;
        console.log(`[EventHandler] 讨论事件处理成功: ${event.table} - ${event.type}`);
      } else {
        this.eventStats.failedEvents++;
        this.logError('DISCUSSION_EVENT_FAILED', result.error || '处理失败', { event });
      }

      return result;
    } catch (error) {
      this.updateProcessingTime(Date.now() - startTime);
      this.eventStats.failedEvents++;
      this.logError('DISCUSSION_EVENT_EXCEPTION', error instanceof Error ? error.message : String(error), { event });
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理通知事件
   *
   * @param event Supabase事件
   * @returns 处理结果
   */
  async handleNotificationEvent(event: SupabaseEvent<Notification>): Promise<EventHandlerResult> {
    const startTime = Date.now();

    try {
      this.updateEventStats(event);

      let result: EventHandlerResult;

      switch (event.type) {
        case 'INSERT':
          result = await this.handleNewNotification(event);
          break;
        case 'UPDATE':
          result = await this.handleNotificationUpdate(event);
          break;
        case 'DELETE':
          result = await this.handleNotificationDelete(event);
          break;
        default:
          result = {
            success: false,
            processed: false,
            error: `未知的通知事件类型: ${event.type}`
          };
      }

      this.updateProcessingTime(Date.now() - startTime);

      if (result.success) {
        this.eventStats.processedEvents++;
        console.log(`[EventHandler] 通知事件处理成功: ${event.type}`);
      } else {
        this.eventStats.failedEvents++;
        this.logError('NOTIFICATION_EVENT_FAILED', result.error || '处理失败', { event });
      }

      return result;
    } catch (error) {
      this.updateProcessingTime(Date.now() - startTime);
      this.eventStats.failedEvents++;
      this.logError('NOTIFICATION_EVENT_EXCEPTION', error instanceof Error ? error.message : String(error), { event });
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理进度事件
   *
   * @param event Supabase事件
   * @returns 处理结果
   */
  async handleProgressEvent(event: SupabaseEvent<LearningProgress | PathwayProgress | LearningActivity>): Promise<EventHandlerResult> {
    const startTime = Date.now();

    try {
      this.updateEventStats(event);

      let result: EventHandlerResult;

      switch (event.table) {
        case 'self_learner_pathway_progress':
          result = await this.handleProgressUpdateEvent(event);
          break;
        case 'self_learner_activities':
          result = await this.handleActivityEvent(event);
          break;
        default:
          result = {
            success: false,
            processed: false,
            error: `未知的进度表: ${event.table}`
          };
      }

      this.updateProcessingTime(Date.now() - startTime);

      if (result.success) {
        this.eventStats.processedEvents++;
        console.log(`[EventHandler] 进度事件处理成功: ${event.table} - ${event.type}`);
      } else {
        this.eventStats.failedEvents++;
        this.logError('PROGRESS_EVENT_FAILED', result.error || '处理失败', { event });
      }

      return result;
    } catch (error) {
      this.updateProcessingTime(Date.now() - startTime);
      this.eventStats.failedEvents++;
      this.logError('PROGRESS_EVENT_EXCEPTION', error instanceof Error ? error.message : String(error), { event });
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理AI聊天事件
   *
   * @param event Supabase事件
   * @returns 处理结果
   */
  async handleAIChatEvent(event: SupabaseEvent<AIChatSession | ChatMessage>): Promise<EventHandlerResult> {
    const startTime = Date.now();

    try {
      this.updateEventStats(event);

      let result: EventHandlerResult;

      switch (event.table) {
        case 'ai_chat_sessions':
          result = await this.handleAIChatSessionEvent(event);
          break;
        case 'chat_messages':
          result = await this.handleChatMessageEvent(event);
          break;
        default:
          result = {
            success: false,
            processed: false,
            error: `未知的AI聊天表: ${event.table}`
          };
      }

      this.updateProcessingTime(Date.now() - startTime);

      if (result.success) {
        this.eventStats.processedEvents++;
        console.log(`[EventHandler] AI聊天事件处理成功: ${event.table} - ${event.type}`);
      } else {
        this.eventStats.failedEvents++;
        this.logError('AI_CHAT_EVENT_FAILED', result.error || '处理失败', { event });
      }

      return result;
    } catch (error) {
      this.updateProcessingTime(Date.now() - startTime);
      this.eventStats.failedEvents++;
      this.logError('AI_CHAT_EVENT_EXCEPTION', error instanceof Error ? error.message : String(error), { event });
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 通用事件处理器
   *
   * @param event 任意Supabase事件
   * @returns 处理结果
   */
  async handleEvent(event: SupabaseEvent): Promise<EventHandlerResult> {
    // 根据表名自动路由到相应的处理器
    if (event.table.startsWith('discussion_')) {
      return this.handleDiscussionEvent(event);
    } else if (event.table === 'notifications') {
      return this.handleNotificationEvent(event);
    } else if (event.table.startsWith('self_learner_')) {
      return this.handleProgressEvent(event);
    } else if (event.table.startsWith('ai_chat_') || event.table === 'chat_messages') {
      return this.handleAIChatEvent(event);
    } else {
      return {
        success: false,
        processed: false,
        error: `未处理的事件类型: ${event.table}`
      };
    }
  }

  /**
   * 添加自定义事件路由
   *
   * @param route 路由配置
   */
  addRoute(route: EventRoute): void {
    const key = `${route.table}_${route.eventType}`;
    if (!this.routes.has(key)) {
      this.routes.set(key, []);
    }
    this.routes.get(key)!.push(route);
  }

  /**
   * 移除事件路由
   *
   * @param table 表名
   * @param eventType 事件类型
   * @param handler 处理器名称
   */
  removeRoute(table: string, eventType: SupabaseEventType, handler: string): void {
    const key = `${table}_${eventType}`;
    const routes = this.routes.get(key);
    if (routes) {
      const filteredRoutes = routes.filter(route => route.handler !== handler);
      if (filteredRoutes.length === 0) {
        this.routes.delete(key);
      } else {
        this.routes.set(key, filteredRoutes);
      }
    }
  }

  /**
   * 获取事件统计信息
   *
   * @returns 统计信息
   */
  getEventStats(): EventStats {
    return { ...this.eventStats };
  }

  /**
   * 获取错误日志
   *
   * @param limit 限制数量
   * @returns 错误日志
   */
  getErrorLog(limit: number = 100): RealtimeError[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.eventStats = {
      totalEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      eventsByType: {},
      eventsByTable: {},
      averageProcessingTime: 0
    };
    this.processingTimes = [];
    this.errorLog = [];
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 初始化默认路由
   */
  private initializeDefaultRoutes(): void {
    // 这里可以添加默认的事件路由配置
    console.log('[EventHandler] 默认路由初始化完成');
  }

  /**
   * 处理讨论帖子事件
   */
  private async handleDiscussionThreadEvent(event: SupabaseEvent<DiscussionThread>): Promise<EventHandlerResult> {
    try {
      // 验证事件数据
      if (!this.validateDiscussionThread(event.record)) {
        return {
          success: false,
          processed: false,
          error: '讨论帖子数据验证失败'
        };
      }

      // 广播到相关用户
      const broadcastTo = await this.getThreadParticipants(event.record.id);

      return {
        success: true,
        processed: true,
        broadcast_to: broadcastTo,
        data: {
          type: 'discussion_thread_update',
          thread: event.record,
          event_type: event.type
        }
      };
    } catch (error) {
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理讨论回复事件
   */
  private async handleDiscussionPostEvent(event: SupabaseEvent<DiscussionPost>): Promise<EventHandlerResult> {
    try {
      // 验证事件数据
      if (!this.validateDiscussionPost(event.record)) {
        return {
          success: false,
          processed: false,
          error: '讨论回复数据验证失败'
        };
      }

      // 广播到相关用户
      const broadcastTo = await this.getThreadParticipants(event.record.thread_id);

      return {
        success: true,
        processed: true,
        broadcast_to: broadcastTo,
        data: {
          type: 'discussion_post_update',
          post: event.record,
          event_type: event.type
        }
      };
    } catch (error) {
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理新通知事件
   */
  private async handleNewNotification(event: SupabaseEvent<Notification>): Promise<EventHandlerResult> {
    try {
      // 验证通知数据
      if (!this.validateNotification(event.record)) {
        return {
          success: false,
          processed: false,
          error: '通知数据验证失败'
        };
      }

      return {
        success: true,
        processed: true,
        broadcast_to: [event.record.user_id],
        data: {
          type: 'new_notification',
          notification: event.record
        }
      };
    } catch (error) {
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理通知更新事件
   */
  private async handleNotificationUpdate(event: SupabaseEvent<Notification>): Promise<EventHandlerResult> {
    try {
      return {
        success: true,
        processed: true,
        broadcast_to: [event.record.user_id],
        data: {
          type: 'notification_updated',
          notification: event.record,
          old_notification: event.old_record
        }
      };
    } catch (error) {
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理通知删除事件
   */
  private async handleNotificationDelete(event: SupabaseEvent<Notification>): Promise<EventHandlerResult> {
    try {
      return {
        success: true,
        processed: true,
        broadcast_to: [event.record.user_id],
        data: {
          type: 'notification_deleted',
          notification_id: event.record.id
        }
      };
    } catch (error) {
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理进度更新事件
   */
  private async handleProgressUpdateEvent(event: SupabaseEvent<LearningProgress | PathwayProgress>): Promise<EventHandlerResult> {
    try {
      const userId = event.record.user_id;
      if (!userId) {
        return {
          success: false,
          processed: false,
          error: '进度数据缺少用户ID'
        };
      }

      return {
        success: true,
        processed: true,
        broadcast_to: [userId],
        data: {
          type: 'progress_updated',
          progress: event.record,
          event_type: event.type
        }
      };
    } catch (error) {
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理学习活动事件
   */
  private async handleActivityEvent(event: SupabaseEvent<LearningActivity>): Promise<EventHandlerResult> {
    try {
      return {
        success: true,
        processed: true,
        broadcast_to: [event.record.user_id],
        data: {
          type: 'learning_activity',
          activity: event.record
        }
      };
    } catch (error) {
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理AI聊天会话事件
   */
  private async handleAIChatSessionEvent(event: SupabaseEvent<AIChatSession>): Promise<EventHandlerResult> {
    try {
      return {
        success: true,
        processed: true,
        broadcast_to: [event.record.user_id],
        data: {
          type: 'ai_chat_session_update',
          session: event.record,
          event_type: event.type
        }
      };
    } catch (error) {
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理聊天消息事件
   */
  private async handleChatMessageEvent(event: SupabaseEvent<ChatMessage>): Promise<EventHandlerResult> {
    try {
      return {
        success: true,
        processed: true,
        broadcast_to: await this.getChatSessionParticipants(event.record.session_id),
        data: {
          type: 'chat_message_update',
          message: event.record,
          event_type: event.type
        }
      };
    } catch (error) {
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 更新事件统计
   */
  private updateEventStats(event: SupabaseEvent): void {
    this.eventStats.totalEvents++;

    // 更新事件类型统计
    this.eventStats.eventsByType[event.type] = (this.eventStats.eventsByType[event.type] || 0) + 1;

    // 更新表统计
    this.eventStats.eventsByTable[event.table] = (this.eventStats.eventsByTable[event.table] || 0) + 1;

    this.eventStats.lastProcessedAt = new Date().toISOString();
  }

  /**
   * 更新处理时间
   */
  private updateProcessingTime(time: number): void {
    this.processingTimes.push(time);

    // 保持处理时间历史不超过限制
    if (this.processingTimes.length > this.maxProcessingTimeHistory) {
      this.processingTimes.shift();
    }

    // 计算平均处理时间
    this.eventStats.averageProcessingTime = this.processingTimes.reduce((sum, t) => sum + t, 0) / this.processingTimes.length;
  }

  /**
   * 记录错误
   */
  private logError(code: RealtimeErrorCode, message: string, details?: any): void {
    const error: RealtimeError = {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      request_id: `event_handler_${Date.now()}`
    };

    this.errorLog.push(error);

    // 保持错误日志大小不超过限制
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    console.error(`[EventHandler] 错误: ${code} - ${message}`, details);
  }

  /**
   * 验证讨论帖子数据
   */
  private validateDiscussionThread(thread: DiscussionThread): boolean {
    return !!(thread.id && thread.title && thread.content && thread.author_id && thread.class_id);
  }

  /**
   * 验证讨论回复数据
   */
  private validateDiscussionPost(post: DiscussionPost): boolean {
    return !!(post.id && post.thread_id && post.content && post.author_id);
  }

  /**
   * 验证通知数据
   */
  private validateNotification(notification: Notification): boolean {
    return !!(notification.id && notification.user_id && notification.type && notification.title && notification.content);
  }

  /**
   * 获取帖子参与者
   *
   * TODO: 这里应该查询数据库获取帖子的所有参与者
   * 现在返回模拟数据
   */
  private async getThreadParticipants(threadId: string): Promise<string[]> {
    // 模拟获取帖子参与者
    return [`user_${threadId}_author`, `user_${threadId}_participant`];
  }

  /**
   * 获取聊天会话参与者
   *
   * TODO: 这里应该查询数据库获取会话的参与者
   * 现在返回模拟数据
   */
  private async getChatSessionParticipants(sessionId: string): Promise<string[]> {
    // 模拟获取会话参与者
    return [`user_${sessionId}`];
  }
}

// =============================================================================
// 单例模式导出
// =============================================================================

/**
 * 实时事件处理器单例实例
 */
export const realtimeEventHandler = new RealtimeEventHandler();

/**
 * 便利函数：处理讨论事件
 */
export async function handleDiscussionEvent(event: SupabaseEvent<DiscussionThread | DiscussionPost>): Promise<EventHandlerResult> {
  return realtimeEventHandler.handleDiscussionEvent(event);
}

/**
 * 便利函数：处理通知事件
 */
export async function handleNotificationEvent(event: SupabaseEvent<Notification>): Promise<EventHandlerResult> {
  return realtimeEventHandler.handleNotificationEvent(event);
}

/**
 * 便利函数：处理进度事件
 */
export async function handleProgressEvent(event: SupabaseEvent<LearningProgress | PathwayProgress | LearningActivity>): Promise<EventHandlerResult> {
  return realtimeEventHandler.handleProgressEvent(event);
}

/**
 * 便利函数：处理AI聊天事件
 */
export async function handleAIChatEvent(event: SupabaseEvent<AIChatSession | ChatMessage>): Promise<EventHandlerResult> {
  return realtimeEventHandler.handleAIChatEvent(event);
}

/**
 * 便利函数：处理任意事件
 */
export async function handleRealtimeEvent(event: SupabaseEvent): Promise<EventHandlerResult> {
  return realtimeEventHandler.handleEvent(event);
}

/**
 * 便利函数：添加事件路由
 */
export function addEventRoute(route: EventRoute): void {
  realtimeEventHandler.addRoute(route);
}

/**
 * 便利函数：移除事件路由
 */
export function removeEventRoute(table: string, eventType: SupabaseEventType, handler: string): void {
  realtimeEventHandler.removeRoute(table, eventType, handler);
}

/**
 * 便利函数：获取事件统计
 */
export function getEventStats(): EventStats {
  return realtimeEventHandler.getEventStats();
}

/**
 * 便利函数：获取错误日志
 */
export function getEventErrorLog(limit?: number): RealtimeError[] {
  return realtimeEventHandler.getErrorLog(limit);
}

/**
 * 便利函数：重置统计信息
 */
export function resetEventStats(): void {
  realtimeEventHandler.resetStats();
}
