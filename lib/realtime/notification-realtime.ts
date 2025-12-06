/**
 * WeaveMind LMS 通知实时推送系统
 *
 * 这个模块实现了通知系统的实时功能，包括：
 * - 实时推送新通知
 * - 实时显示通知状态更新
 * - 支持通知已读/未读状态同步
 * - 实时通知计数更新
 * - 支持批量通知处理
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';
import {
  Notification,
  NotificationData,
  NotificationStats,
  BatchNotificationOperation,
  RealtimeEventType,
  ConnectionStatus,
  UnsubscribeFunction,
  SupabaseEvent,
  NotificationEventListener,
  RealtimeError,
  RealtimeErrorCode,
  DEFAULT_REALTIME_CONFIG
} from './types';

/**
 * 通知实时管理器
 *
 * 负责管理通知系统的所有实时功能，包括通知推送、状态同步和批量处理。
 */
export class NotificationRealtimeManager {
  private supabase = createClient();
  private channels = new Map<string, RealtimeChannel>();
  private listeners = new Map<string, Set<NotificationEventListener>>();
  private notificationStats = new Map<string, NotificationStats>();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private retryAttempts = 0;
  private readonly maxRetryAttempts = 5;
  private notificationQueue: Notification[] = [];
  private batchInterval: NodeJS.Timeout | null = null;

  /**
   * 订阅用户通知
   *
   * @param userId 用户ID
   * @param callback 通知回调函数
   * @returns 取消订阅函数
   */
  async subscribeToUserNotifications(
    userId: string,
    callback: NotificationEventListener
  ): Promise<UnsubscribeFunction> {
    try {
      const channelName = `user_notifications_${userId}`;

      // 创建或获取频道
      let channel = this.channels.get(channelName);
      if (!channel) {
        channel = this.supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*' as RealtimeEventType,
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`
            },
            (payload) => this.handleNotificationUpdate(payload)
          )
          .subscribe((status) => {
            this.updateConnectionStatus(status);
          });

        this.channels.set(channelName, channel);
      }

      // 添加监听器
      if (!this.listeners.has(channelName)) {
        this.listeners.set(channelName, new Set());
      }
      this.listeners.get(channelName)!.add(callback);

      // 初始化用户通知统计
      await this.initializeUserNotifications(userId);

      // 启动批量处理
      this.startBatchProcessing();

      console.log(`[NotificationRealtime] 订阅用户通知: ${userId}`);

      return () => this.unsubscribeFromUserNotifications(userId, callback);
    } catch (error) {
      console.error('[NotificationRealtime] 订阅用户通知失败:', error);
      throw this.createError('SUBSCRIPTION_FAILED', `订阅用户通知失败: ${userId}`, error);
    }
  }

  /**
   * 实时发送通知
   *
   * @param notificationData 通知数据
   */
  async sendNotification(notificationData: NotificationData): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: notificationData.user_id,
          type: notificationData.type,
          title: notificationData.title,
          content: notificationData.content,
          data: notificationData.data || {},
          expires_at: notificationData.expires_at
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 广播新通知事件
      await this.broadcastToUser(data.user_id, {
        type: 'new_notification',
        notification: data,
        timestamp: new Date().toISOString()
      });

      // 更新统计信息
      await this.updateNotificationStats(data.user_id);

      console.log(`[NotificationRealtime] 发送通知: ${data.id}`);
    } catch (error) {
      console.error('[NotificationRealtime] 发送通知失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', '发送通知失败', error);
    }
  }

  /**
   * 实时标记通知为已读
   *
   * @param notificationId 通知ID
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 广播状态更新事件
      await this.broadcastToUser(data.user_id, {
        type: 'notification_read',
        notification_id: notificationId,
        notification: data,
        timestamp: new Date().toISOString()
      });

      // 更新统计信息
      await this.updateNotificationStats(data.user_id);

      console.log(`[NotificationRealtime] 标记通知为已读: ${notificationId}`);
    } catch (error) {
      console.error('[NotificationRealtime] 标记通知为已读失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `标记通知为已读失败: ${notificationId}`, error);
    }
  }

  /**
   * 批量标记所有通知为已读
   *
   * @param userId 用户ID
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select();

      if (error) {
        throw error;
      }

      // 广播批量更新事件
      await this.broadcastToUser(userId, {
        type: 'all_notifications_read',
        updated_count: data.length,
        timestamp: new Date().toISOString()
      });

      // 更新统计信息
      await this.updateNotificationStats(userId);

      console.log(`[NotificationRealtime] 批量标记为已读: ${data.length} 条通知`);
    } catch (error) {
      console.error('[NotificationRealtime] 批量标记为已读失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `批量标记为已读失败: ${userId}`, error);
    }
  }

  /**
   * 批量操作通知
   *
   * @param operation 批量操作数据
   */
  async batchOperation(operation: BatchNotificationOperation): Promise<void> {
    try {
      let query = this.supabase
        .from('notifications')
        .delete()
        .eq('user_id', operation.user_id)
        .in('id', operation.notification_ids);

      switch (operation.type) {
        case 'mark_as_read':
          query = this.supabase
            .from('notifications')
            .update({
              is_read: true,
              read_at: new Date().toISOString()
            })
            .eq('user_id', operation.user_id)
            .in('id', operation.notification_ids);
          break;
        case 'delete':
          query = this.supabase
            .from('notifications')
            .delete()
            .eq('user_id', operation.user_id)
            .in('id', operation.notification_ids);
          break;
      }

      const { data, error } = await query.select();

      if (error) {
        throw error;
      }

      // 广播批量操作事件
      await this.broadcastToUser(operation.user_id, {
        type: 'batch_operation',
        operation: operation.type,
        affected_ids: operation.notification_ids,
        updated_count: data.length,
        timestamp: new Date().toISOString()
      });

      // 更新统计信息
      await this.updateNotificationStats(operation.user_id);

      console.log(`[NotificationRealtime] 批量操作完成: ${operation.type}`, data.length);
    } catch (error) {
      console.error('[NotificationRealtime] 批量操作失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `批量操作失败: ${operation.type}`, error);
    }
  }

  /**
   * 获取实时通知统计
   *
   * @param userId 用户ID
   * @returns 通知统计信息
   */
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      // 尝试从缓存获取
      let stats = this.notificationStats.get(userId);
      if (!stats) {
        stats = await this.fetchNotificationStats(userId);
        this.notificationStats.set(userId, stats);
      }

      return stats;
    } catch (error) {
      console.error('[NotificationRealtime] 获取通知统计失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `获取通知统计失败: ${userId}`, error);
    }
  }

  /**
   * 删除通知
   *
   * @param notificationId 通知ID
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 广播删除事件
      await this.broadcastToUser(data.user_id, {
        type: 'notification_deleted',
        notification_id: notificationId,
        timestamp: new Date().toISOString()
      });

      // 更新统计信息
      await this.updateNotificationStats(data.user_id);

      console.log(`[NotificationRealtime] 删除通知: ${notificationId}`);
    } catch (error) {
      console.error('[NotificationRealtime] 删除通知失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `删除通知失败: ${notificationId}`, error);
    }
  }

  /**
   * 归档通知
   *
   * @param notificationId 通知ID
   */
  async archiveNotification(notificationId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .update({
          // 这里可以添加archived字段
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 广播归档事件
      await this.broadcastToUser(data.user_id, {
        type: 'notification_archived',
        notification_id: notificationId,
        notification: data,
        timestamp: new Date().toISOString()
      });

      console.log(`[NotificationRealtime] 归档通知: ${notificationId}`);
    } catch (error) {
      console.error('[NotificationRealtime] 归档通知失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `归档通知失败: ${notificationId}`, error);
    }
  }

  /**
   * 获取用户通知列表
   *
   * @param userId 用户ID
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 通知列表
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('[NotificationRealtime] 获取用户通知列表失败:', error);
      return [];
    }
  }

  /**
   * 获取连接状态
   *
   * @returns 当前连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * 清理所有连接和监听器
   */
  async cleanup(): Promise<void> {
    try {
      // 停止批量处理
      this.stopBatchProcessing();

      // 取消所有频道订阅
      for (const [channelName, channel] of this.channels) {
        await this.supabase.removeChannel(channel);
      }

      // 清理所有监听器
      this.listeners.clear();
      this.notificationStats.clear();
      this.channels.clear();
      this.notificationQueue = [];

      console.log('[NotificationRealtime] 清理完成');
    } catch (error) {
      console.error('[NotificationRealtime] 清理失败:', error);
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 处理通知更新事件
   */
  private handleNotificationUpdate(payload: SupabaseEvent<Notification>): void {
    const channelName = `user_notifications_${payload.record.user_id}`;

    // 添加到队列进行批量处理
    this.notificationQueue.push(payload.record);

    // 如果队列超过阈值，立即处理
    if (this.notificationQueue.length >= 10) {
      this.processNotificationQueue();
    }

    // 通知监听器
    this.notifyListeners(channelName, payload.record);
  }

  /**
   * 初始化用户通知统计
   */
  private async initializeUserNotifications(userId: string): Promise<void> {
    try {
      await this.updateNotificationStats(userId);
    } catch (error) {
      console.error('[NotificationRealtime] 初始化用户通知统计失败:', error);
    }
  }

  /**
   * 获取通知统计信息
   */
  private async fetchNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      // 获取总通知数
      const { count: total } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // 获取未读通知数
      const { count: unread } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      // 获取按类型分组的统计
      const { data: byTypeData } = await this.supabase
        .from('notifications')
        .select('type')
        .eq('user_id', userId);

      const byType: Record<string, number> = {};
      if (byTypeData) {
        byTypeData.forEach(notification => {
          byType[notification.type] = (byType[notification.type] || 0) + 1;
        });
      }

      // 获取最近的10条通知
      const { data: recent } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        total: total || 0,
        unread: unread || 0,
        by_type: byType,
        recent: recent || []
      };
    } catch (error) {
      console.error('[NotificationRealtime] 获取通知统计失败:', error);
      return {
        total: 0,
        unread: 0,
        by_type: {},
        recent: []
      };
    }
  }

  /**
   * 更新通知统计
   */
  private async updateNotificationStats(userId: string): Promise<void> {
    try {
      const stats = await this.fetchNotificationStats(userId);
      this.notificationStats.set(userId, stats);

      // 广播统计更新
      await this.broadcastToUser(userId, {
        type: 'notification_stats_updated',
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[NotificationRealtime] 更新通知统计失败:', error);
    }
  }

  /**
   * 广播消息给用户
   */
  private async broadcastToUser(userId: string, message: any): Promise<void> {
    try {
      const channelName = `user_notifications_${userId}`;
      const channel = this.channels.get(channelName);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'notification_update',
          payload: message
        });
      }
    } catch (error) {
      console.error(`[NotificationRealtime] 广播给用户失败: ${userId}`, error);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(channelName: string, notification: Notification): void {
    const channelListeners = this.listeners.get(channelName);
    if (channelListeners) {
      for (const listener of channelListeners) {
        try {
          listener(notification);
        } catch (error) {
          console.error('[NotificationRealtime] 监听器执行失败:', error);
        }
      }
    }
  }

  /**
   * 启动批量处理
   */
  private startBatchProcessing(): void {
    if (this.batchInterval) {
      return;
    }

    this.batchInterval = setInterval(() => {
      this.processNotificationQueue();
    }, 1000); // 每秒处理一次队列
  }

  /**
   * 停止批量处理
   */
  private stopBatchProcessing(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
  }

  /**
   * 处理通知队列
   */
  private processNotificationQueue(): void {
    if (this.notificationQueue.length === 0) {
      return;
    }

    const notifications = [...this.notificationQueue];
    this.notificationQueue = [];

    // 按用户ID分组处理
    const userGroups = new Map<string, Notification[]>();
    notifications.forEach(notification => {
      if (!userGroups.has(notification.user_id)) {
        userGroups.set(notification.user_id, []);
      }
      userGroups.get(notification.user_id)!.push(notification);
    });

    // 为每个用户更新统计
    userGroups.forEach((_, userId) => {
      this.updateNotificationStats(userId);
    });
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(status: string): void {
    const statusMap: Record<string, ConnectionStatus> = {
      'SUBSCRIBED': 'connected',
      'CHANNEL_ERROR': 'error',
      'TIMED_OUT': 'error',
      'CLOSED': 'disconnected'
    };

    const newStatus = statusMap[status] || 'disconnected';

    if (newStatus !== this.connectionStatus) {
      this.connectionStatus = newStatus;
      console.log(`[NotificationRealtime] 连接状态更新: ${newStatus}`);
    }
  }

  /**
   * 取消订阅用户通知
   */
  private unsubscribeFromUserNotifications(userId: string, callback: NotificationEventListener): void {
    const channelName = `user_notifications_${userId}`;
    this.removeListener(channelName, callback);
  }

  /**
   * 移除监听器
   */
  private removeListener(channelName: string, callback: any): void {
    const channelListeners = this.listeners.get(channelName);
    if (channelListeners) {
      channelListeners.delete(callback);

      // 如果没有监听器了，关闭频道
      if (channelListeners.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.supabase.removeChannel(channel);
          this.channels.delete(channelName);
        }
        this.listeners.delete(channelName);
      }
    }
  }

  /**
   * 创建错误对象
   */
  private createError(
    code: RealtimeErrorCode,
    message: string,
    originalError?: any
  ): RealtimeError {
    return {
      code,
      message,
      details: originalError ? { originalError: originalError.message || originalError } : undefined,
      timestamp: new Date().toISOString(),
      request_id: `notification_${Date.now()}`
    };
  }
}

// =============================================================================
// 单例模式导出
// =============================================================================

/**
 * 通知实时管理器单例实例
 */
export const notificationRealtime = new NotificationRealtimeManager();

/**
 * 便利函数：订阅用户通知
 */
export async function subscribeToUserNotifications(
  userId: string,
  onNotification: NotificationEventListener
): Promise<UnsubscribeFunction> {
  return notificationRealtime.subscribeToUserNotifications(userId, onNotification);
}

/**
 * 便利函数：发送通知
 */
export async function sendNotification(notificationData: NotificationData): Promise<void> {
  return notificationRealtime.sendNotification(notificationData);
}

/**
 * 便利函数：标记通知为已读
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  return notificationRealtime.markAsRead(notificationId);
}

/**
 * 便利函数：批量标记为已读
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  return notificationRealtime.markAllAsRead(userId);
}

/**
 * 便利函数：批量操作通知
 */
export async function batchNotificationOperation(operation: BatchNotificationOperation): Promise<void> {
  return notificationRealtime.batchOperation(operation);
}

/**
 * 便利函数：获取通知统计
 */
export async function getNotificationStats(userId: string): Promise<NotificationStats> {
  return notificationRealtime.getNotificationStats(userId);
}

/**
 * 便利函数：删除通知
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  return notificationRealtime.deleteNotification(notificationId);
}

/**
 * 便利函数：归档通知
 */
export async function archiveNotification(notificationId: string): Promise<void> {
  return notificationRealtime.archiveNotification(notificationId);
}

/**
 * 便利函数：获取用户通知列表
 */
export async function getUserNotifications(
  userId: string,
  limit?: number,
  offset?: number
): Promise<Notification[]> {
  return notificationRealtime.getUserNotifications(userId, limit, offset);
}

/**
 * 便利函数：获取连接状态
 */
export function getNotificationConnectionStatus(): ConnectionStatus {
  return notificationRealtime.getConnectionStatus();
}

/**
 * 便利函数：清理所有连接
 */
export async function cleanupNotificationRealtime(): Promise<void> {
  return notificationRealtime.cleanup();
}
