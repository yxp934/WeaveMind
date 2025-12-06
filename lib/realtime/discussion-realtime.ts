/**
 * WeaveMind LMS 讨论实时更新系统
 *
 * 这个模块实现了讨论系统的实时功能，包括：
 * - 实时监听讨论帖子更新
 * - 实时显示新帖子和回复
 * - 在线用户状态显示
 * - 实时编辑和删除功能
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';
import {
  DiscussionThread,
  DiscussionPost,
  ThreadUpdate,
  PostData,
  OnlineUser,
  RealtimeEventType,
  ConnectionStatus,
  UnsubscribeFunction,
  SupabaseEvent,
  DiscussionEventListener,
  RealtimeError,
  RealtimeErrorCode,
  EventHandlerResult,
  DEFAULT_REALTIME_CONFIG
} from './types';

/**
 * 讨论实时管理器
 *
 * 负责管理讨论系统的所有实时功能，包括帖子更新、回复监听和在线用户状态。
 */
export class DiscussionRealtimeManager {
  private supabase = createClient();
  private channels = new Map<string, RealtimeChannel>();
  private listeners = new Map<string, Set<DiscussionEventListener>>();
  private onlineUsers = new Map<string, Set<OnlineUser>>();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private retryAttempts = 0;
  private readonly maxRetryAttempts = 5;

  /**
   * 订阅讨论帖子更新
   *
   * @param threadId 讨论帖子ID
   * @param callback 更新回调函数
   * @returns 取消订阅函数
   */
  async subscribeToThread(
    threadId: string,
    callback: DiscussionEventListener
  ): Promise<UnsubscribeFunction> {
    try {
      const channelName = `discussion_thread_${threadId}`;

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
              table: 'discussion_threads',
              filter: `id=eq.${threadId}`
            },
            (payload) => this.handleThreadUpdate(payload)
          )
          .on(
            'postgres_changes',
            {
              event: '*' as RealtimeEventType,
              schema: 'public',
              table: 'discussion_posts',
              filter: `thread_id=eq.${threadId}`
            },
            (payload) => this.handlePostUpdate(payload)
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

      // 初始化在线用户列表
      await this.initializeOnlineUsers(threadId);

      console.log(`[DiscussionRealtime] 订阅讨论帖子: ${threadId}`);

      // 返回取消订阅函数
      return () => this.unsubscribeFromThread(threadId, callback);
    } catch (error) {
      console.error('[DiscussionRealtime] 订阅讨论帖子失败:', error);
      throw this.createError('SUBSCRIPTION_FAILED', `订阅讨论帖子失败: ${threadId}`, error);
    }
  }

  /**
   * 订阅帖子更新
   *
   * @param threadId 讨论帖子ID
   * @param callback 帖子更新回调函数
   * @returns 取消订阅函数
   */
  async subscribeToPosts(
    threadId: string,
    callback: DiscussionEventListener
  ): Promise<UnsubscribeFunction> {
    try {
      const channelName = `discussion_posts_${threadId}`;

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
              table: 'discussion_posts',
              filter: `thread_id=eq.${threadId}`
            },
            (payload) => this.handlePostUpdate(payload)
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

      console.log(`[DiscussionRealtime] 订阅帖子更新: ${threadId}`);

      return () => this.unsubscribeFromPosts(threadId, callback);
    } catch (error) {
      console.error('[DiscussionRealtime] 订阅帖子更新失败:', error);
      throw this.createError('SUBSCRIPTION_FAILED', `订阅帖子更新失败: ${threadId}`, error);
    }
  }

  /**
   * 订阅在线用户状态
   *
   * @param threadId 讨论帖子ID
   * @param callback 用户状态回调函数
   * @returns 取消订阅函数
   */
  async subscribeToOnlineUsers(
    threadId: string,
    callback: (users: OnlineUser[]) => void
  ): Promise<UnsubscribeFunction> {
    try {
      const channelName = `online_users_${threadId}`;

      // 创建或获取频道
      let channel = this.channels.get(channelName);
      if (!channel) {
        channel = this.supabase
          .channel(channelName)
          .on('presence', { event: 'sync' }, () => {
            this.handlePresenceSync(threadId, callback);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            this.handleUserJoin(threadId, key, newPresences, callback);
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            this.handleUserLeave(threadId, key, leftPresences, callback);
          })
          .subscribe(async (status) => {
            this.updateConnectionStatus(status);
            if (status === 'SUBSCRIBED') {
              // 注册当前用户在线状态
              await channel!.track({
                online_at: new Date().toISOString(),
              });
            }
          });

        this.channels.set(channelName, channel);
      }

      console.log(`[DiscussionRealtime] 订阅在线用户: ${threadId}`);

      return () => this.unsubscribeFromOnlineUsers(threadId, callback);
    } catch (error) {
      console.error('[DiscussionRealtime] 订阅在线用户失败:', error);
      throw this.createError('SUBSCRIPTION_FAILED', `订阅在线用户失败: ${threadId}`, error);
    }
  }

  /**
   * 实时发布新帖子
   *
   * @param threadId 讨论帖子ID
   * @param postData 帖子数据
   */
  async publishNewPost(threadId: string, postData: PostData): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('discussion_posts')
        .insert({
          thread_id: postData.thread_id,
          content: postData.content,
          author_id: postData.author_id,
          parent_id: postData.parent_id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 广播新帖子事件
      await this.broadcastToChannel(`discussion_posts_${threadId}`, {
        type: 'new_post',
        post: data,
        timestamp: new Date().toISOString()
      });

      console.log(`[DiscussionRealtime] 发布新帖子: ${threadId}`);
    } catch (error) {
      console.error('[DiscussionRealtime] 发布新帖子失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `发布新帖子失败: ${threadId}`, error);
    }
  }

  /**
   * 实时更新帖子
   *
   * @param postId 帖子ID
   * @param content 新内容
   */
  async updatePost(postId: string, content: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('discussion_posts')
        .update({
          content,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 广播更新事件
      await this.broadcastToChannel(`discussion_posts_${data.thread_id}`, {
        type: 'post_updated',
        post: data,
        timestamp: new Date().toISOString()
      });

      console.log(`[DiscussionRealtime] 更新帖子: ${postId}`);
    } catch (error) {
      console.error('[DiscussionRealtime] 更新帖子失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `更新帖子失败: ${postId}`, error);
    }
  }

  /**
   * 删除帖子
   *
   * @param postId 帖子ID
   * @param threadId 讨论帖子ID
   */
  async deletePost(postId: string, threadId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('discussion_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        throw error;
      }

      // 广播删除事件
      await this.broadcastToChannel(`discussion_posts_${threadId}`, {
        type: 'post_deleted',
        post_id: postId,
        timestamp: new Date().toISOString()
      });

      console.log(`[DiscussionRealtime] 删除帖子: ${postId}`);
    } catch (error) {
      console.error('[DiscussionRealtime] 删除帖子失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `删除帖子失败: ${postId}`, error);
    }
  }

  /**
   * 获取在线用户列表
   *
   * @param threadId 讨论帖子ID
   * @returns 在线用户列表
   */
  async getOnlineUsers(threadId: string): Promise<OnlineUser[]> {
    try {
      const channelName = `online_users_${threadId}`;
      const channel = this.channels.get(channelName);

      if (!channel) {
        return [];
      }

      const presenceState = channel.presenceState();
      const users: OnlineUser[] = [];

      for (const [key, presences] of Object.entries(presenceState)) {
        for (const presence of presences as any[]) {
          users.push({
            id: key,
            username: presence.username || 'Unknown User',
            avatar_url: presence.avatar_url,
            role: presence.role || 'student',
            last_seen: presence.online_at,
            is_active: true
          });
        }
      }

      return users;
    } catch (error) {
      console.error('[DiscussionRealtime] 获取在线用户失败:', error);
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
      // 取消所有频道订阅
      for (const [channelName, channel] of this.channels) {
        await this.supabase.removeChannel(channel);
      }

      // 清理所有监听器
      this.listeners.clear();
      this.onlineUsers.clear();
      this.channels.clear();

      console.log('[DiscussionRealtime] 清理完成');
    } catch (error) {
      console.error('[DiscussionRealtime] 清理失败:', error);
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 处理帖子更新事件
   */
  private handleThreadUpdate(payload: SupabaseEvent<DiscussionThread>): void {
    const channelName = `discussion_thread_${payload.record.id}`;
    const update: ThreadUpdate = {
      type: this.mapEventTypeToUpdateType(payload.type),
      thread: payload.record,
      timestamp: payload.commit_timestamp,
      user_id: payload.record.author_id
    };

    this.notifyListeners(channelName, update);
  }

  /**
   * 处理帖子回复更新事件
   */
  private handlePostUpdate(payload: SupabaseEvent<DiscussionPost>): void {
    const channelName = `discussion_posts_${payload.record.thread_id}`;

    const postUpdate = {
      type: this.mapEventTypeToUpdateType(payload.type),
      post: payload.record,
      timestamp: payload.commit_timestamp,
      user_id: payload.record.author_id
    };

    this.notifyListeners(channelName, postUpdate);
  }

  /**
   * 处理在线用户同步
   */
  private handlePresenceSync(threadId: string, callback: (users: OnlineUser[]) => void): void {
    this.getOnlineUsers(threadId).then(users => {
      callback(users);
    });
  }

  /**
   * 处理用户加入
   */
  private handleUserJoin(
    threadId: string,
    userId: string,
    newPresences: any[],
    callback: (users: OnlineUser[]) => void
  ): void {
    console.log(`[DiscussionRealtime] 用户加入: ${userId}`);
    this.getOnlineUsers(threadId).then(users => {
      callback(users);
    });
  }

  /**
   * 处理用户离开
   */
  private handleUserLeave(
    threadId: string,
    userId: string,
    leftPresences: any[],
    callback: (users: OnlineUser[]) => void
  ): void {
    console.log(`[DiscussionRealtime] 用户离开: ${userId}`);
    this.getOnlineUsers(threadId).then(users => {
      callback(users);
    });
  }

  /**
   * 初始化在线用户列表
   */
  private async initializeOnlineUsers(threadId: string): Promise<void> {
    try {
      const users = await this.getOnlineUsers(threadId);
      this.onlineUsers.set(threadId, new Set(users));
    } catch (error) {
      console.error('[DiscussionRealtime] 初始化在线用户失败:', error);
    }
  }

  /**
   * 广播消息到频道
   */
  private async broadcastToChannel(channelName: string, message: any): Promise<void> {
    try {
      const channel = this.channels.get(channelName);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'discussion_update',
          payload: message
        });
      }
    } catch (error) {
      console.error(`[DiscussionRealtime] 广播到频道失败: ${channelName}`, error);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(channelName: string, event: any): void {
    const channelListeners = this.listeners.get(channelName);
    if (channelListeners) {
      for (const listener of channelListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('[DiscussionRealtime] 监听器执行失败:', error);
        }
      }
    }
  }

  /**
   * 映射事件类型到更新类型
   */
  private mapEventTypeToUpdateType(eventType: RealtimeEventType): string {
    const mapping: Record<RealtimeEventType, string> = {
      'INSERT': 'created',
      'UPDATE': 'updated',
      'DELETE': 'deleted'
    };
    return mapping[eventType] || 'updated';
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
      console.log(`[DiscussionRealtime] 连接状态更新: ${newStatus}`);
    }
  }

  /**
   * 取消订阅讨论帖子
   */
  private unsubscribeFromThread(threadId: string, callback: DiscussionEventListener): void {
    const channelName = `discussion_thread_${threadId}`;
    this.removeListener(channelName, callback);
  }

  /**
   * 取消订阅帖子更新
   */
  private unsubscribeFromPosts(threadId: string, callback: DiscussionEventListener): void {
    const channelName = `discussion_posts_${threadId}`;
    this.removeListener(channelName, callback);
  }

  /**
   * 取消订阅在线用户
   */
  private unsubscribeFromOnlineUsers(threadId: string, callback: (users: OnlineUser[]) => void): void {
    // 这里简化处理，实际实现需要更复杂的回调管理
    console.log(`[DiscussionRealtime] 取消订阅在线用户: ${threadId}`);
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
      request_id: `discussion_${Date.now()}`
    };
  }
}

// =============================================================================
// 单例模式导出
// =============================================================================

/**
 * 讨论实时管理器单例实例
 */
export const discussionRealtime = new DiscussionRealtimeManager();

/**
 * 便利函数：快速订阅讨论帖子
 */
export async function subscribeToDiscussionThread(
  threadId: string,
  onUpdate: DiscussionEventListener,
  onPost?: DiscussionEventListener,
  onOnlineUsers?: (users: OnlineUser[]) => void
): Promise<UnsubscribeFunction> {
  const unsubscribers: UnsubscribeFunction[] = [];

  // 订阅帖子更新
  unsubscribers.push(await discussionRealtime.subscribeToThread(threadId, onUpdate));

  // 订阅帖子回复
  if (onPost) {
    unsubscribers.push(await discussionRealtime.subscribeToPosts(threadId, onPost));
  }

  // 订阅在线用户
  if (onOnlineUsers) {
    unsubscribers.push(await discussionRealtime.subscribeToOnlineUsers(threadId, onOnlineUsers));
  }

  // 返回组合的取消订阅函数
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

/**
 * 便利函数：发布新帖子
 */
export async function publishDiscussionPost(threadId: string, postData: PostData): Promise<void> {
  return discussionRealtime.publishNewPost(threadId, postData);
}

/**
 * 便利函数：更新帖子
 */
export async function updateDiscussionPost(postId: string, content: string): Promise<void> {
  return discussionRealtime.updatePost(postId, content);
}

/**
 * 便利函数：删除帖子
 */
export async function deleteDiscussionPost(postId: string, threadId: string): Promise<void> {
  return discussionRealtime.deletePost(postId, threadId);
}

/**
 * 便利函数：获取在线用户
 */
export async function getDiscussionOnlineUsers(threadId: string): Promise<OnlineUser[]> {
  return discussionRealtime.getOnlineUsers(threadId);
}

/**
 * 便利函数：获取连接状态
 */
export function getDiscussionConnectionStatus(): ConnectionStatus {
  return discussionRealtime.getConnectionStatus();
}

/**
 * 便利函数：清理所有连接
 */
export async function cleanupDiscussionRealtime(): Promise<void> {
  return discussionRealtime.cleanup();
}
