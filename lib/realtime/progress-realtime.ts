/**
 * WeaveMind LMS 学习进度实时跟踪系统
 *
 * 这个模块实现了学习进度跟踪的实时功能，包括：
 * - 实时跟踪学习进度更新
 * - 实时显示任务完成状态
 * - 实时同步学习路径进度
 * - 实时显示学习活动
 * - 支持进度变化事件监听
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';
import {
  LearningProgress,
  PathwayProgress,
  LearningActivity,
  ProgressUpdate,
  RealtimeEventType,
  ConnectionStatus,
  UnsubscribeFunction,
  SupabaseEvent,
  ProgressEventListener,
  RealtimeError,
  RealtimeErrorCode,
  DEFAULT_REALTIME_CONFIG
} from './types';

/**
 * 学习进度实时管理器
 *
 * 负责管理学习进度系统的所有实时功能，包括进度跟踪、路径同步和活动监控。
 */
export class ProgressRealtimeManager {
  private supabase = createClient();
  private channels = new Map<string, RealtimeChannel>();
  private listeners = new Map<string, Set<ProgressEventListener>>();
  private progressCache = new Map<string, LearningProgress>();
  private pathwayCache = new Map<string, PathwayProgress>();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private retryAttempts = 0;
  private readonly maxRetryAttempts = 5;
  private activityQueue: LearningActivity[] = [];
  private batchInterval: NodeJS.Timeout | null = null;

  /**
   * 订阅学习进度更新
   *
   * @param userId 用户ID
   * @param callback 进度更新回调函数
   * @returns 取消订阅函数
   */
  async subscribeToLearningProgress(
    userId: string,
    callback: ProgressEventListener
  ): Promise<UnsubscribeFunction> {
    try {
      const channelName = `learning_progress_${userId}`;

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
              table: 'self_learner_pathway_progress',
              filter: `user_id=eq.${userId}`
            },
            (payload) => this.handleProgressUpdate(payload)
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT' as RealtimeEventType,
              schema: 'public',
              table: 'self_learner_activities',
              filter: `user_id=eq.${userId}`
            },
            (payload) => this.handleActivityUpdate(payload)
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

      // 初始化用户进度数据
      await this.initializeUserProgress(userId);

      // 启动批量处理活动
      this.startBatchProcessing();

      console.log(`[ProgressRealtime] 订阅学习进度: ${userId}`);

      return () => this.unsubscribeFromLearningProgress(userId, callback);
    } catch (error) {
      console.error('[ProgressRealtime] 订阅学习进度失败:', error);
      throw this.createError('SUBSCRIPTION_FAILED', `订阅学习进度失败: ${userId}`, error);
    }
  }

  /**
   * 订阅路径进度更新
   *
   * @param pathwayId 路径ID
   * @param callback 路径进度回调函数
   * @returns 取消订阅函数
   */
  async subscribeToPathwayProgress(
    pathwayId: string,
    callback: ProgressEventListener
  ): Promise<UnsubscribeFunction> {
    try {
      const channelName = `pathway_progress_${pathwayId}`;

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
              table: 'self_learner_pathway_progress',
              filter: `pathway_id=eq.${pathwayId}`
            },
            (payload) => this.handlePathwayUpdate(payload)
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

      console.log(`[ProgressRealtime] 订阅路径进度: ${pathwayId}`);

      return () => this.unsubscribeFromPathwayProgress(pathwayId, callback);
    } catch (error) {
      console.error('[ProgressRealtime] 订阅路径进度失败:', error);
      throw this.createError('SUBSCRIPTION_FAILED', `订阅路径进度失败: ${pathwayId}`, error);
    }
  }

  /**
   * 实时更新学习进度
   *
   * @param userId 用户ID
   * @param courseId 课程ID
   * @param progress 进度百分比
   * @param componentId 组件ID（可选）
   * @param timeSpentMinutes 学习时间（分钟）
   */
  async updateLearningProgress(
    userId: string,
    courseId: string,
    progress: number,
    componentId?: string,
    timeSpentMinutes?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        user_id: userId,
        course_id: courseId,
        progress_percentage: Math.min(Math.max(progress, 0), 100),
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (componentId) {
        updateData.component_id = componentId;
      }

      if (timeSpentMinutes) {
        updateData.time_spent_minutes = timeSpentMinutes;
      }

      // 如果进度为100%，标记为完成
      if (progress >= 100) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('self_learner_pathway_progress')
        .upsert(updateData, {
          onConflict: 'user_id,course_id,component_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 记录学习活动
      await this.recordLearningActivity({
        user_id: userId,
        activity_type: 'course_access',
        target_id: courseId,
        metadata: {
          progress,
          component_id: componentId,
          time_spent_minutes: timeSpentMinutes
        }
      });

      // 缓存进度数据
      this.progressCache.set(`${userId}_${courseId}_${componentId || 'overall'}`, data);

      // 广播进度更新
      await this.broadcastToUser(userId, {
        type: 'progress_updated',
        progress: data,
        timestamp: new Date().toISOString()
      });

      console.log(`[ProgressRealtime] 更新学习进度: ${userId} - ${courseId} - ${progress}%`);
    } catch (error) {
      console.error('[ProgressRealtime] 更新学习进度失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', '更新学习进度失败', error);
    }
  }

  /**
   * 实时更新路径进度
   *
   * @param userId 用户ID
   * @param pathwayId 路径ID
   * @param itemId 路径项目ID
   * @param completed 是否完成
   */
  async updatePathwayProgress(
    userId: string,
    pathwayId: string,
    itemId: string,
    completed: boolean
  ): Promise<void> {
    try {
      // 获取当前路径进度
      const currentProgress = await this.getPathwayProgress(userId, pathwayId);

      let completedItems = currentProgress?.completed_items || [];
      let completionPercentage = currentProgress?.completion_percentage || 0;
      const totalItems = currentProgress?.total_items || 1;

      // 更新完成项目列表
      if (completed && !completedItems.includes(itemId)) {
        completedItems.push(itemId);
      } else if (!completed && completedItems.includes(itemId)) {
        completedItems = completedItems.filter(id => id !== itemId);
      }

      // 重新计算完成百分比
      completionPercentage = (completedItems.length / totalItems) * 100;

      const updateData = {
        user_id: userId,
        pathway_id: pathwayId,
        current_item_id: completed ? itemId : currentProgress?.current_item_id,
        completed_items: completedItems,
        total_items: totalItems,
        completion_percentage: Math.round(completionPercentage * 100) / 100,
        last_activity_at: new Date().toISOString(),
        completed_at: completionPercentage >= 100 ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('self_learner_pathway_progress')
        .upsert(updateData, {
          onConflict: 'user_id,pathway_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 记录学习活动
      await this.recordLearningActivity({
        user_id: userId,
        activity_type: completed ? 'chapter_complete' : 'course_access',
        target_id: itemId,
        metadata: {
          pathway_id: pathwayId,
          completed,
          completion_percentage: completionPercentage
        }
      });

      // 缓存路径进度数据
      this.pathwayCache.set(`${userId}_${pathwayId}`, data);

      // 广播路径进度更新
      await this.broadcastToUser(userId, {
        type: 'pathway_progress_updated',
        pathway_progress: data,
        timestamp: new Date().toISOString()
      });

      // 如果路径完成，发送成就通知
      if (completionPercentage >= 100) {
        await this.broadcastToUser(userId, {
          type: 'pathway_completed',
          pathway_id: pathwayId,
          completion_percentage: 100,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`[ProgressRealtime] 更新路径进度: ${userId} - ${pathwayId} - ${completionPercentage}%`);
    } catch (error) {
      console.error('[ProgressRealtime] 更新路径进度失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', '更新路径进度失败', error);
    }
  }

  /**
   * 记录学习活动
   *
   * @param activityData 活动数据
   */
  async recordLearningActivity(activityData: Omit<LearningActivity, 'id' | 'created_at'>): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('self_learner_activities')
        .insert({
          user_id: activityData.user_id,
          activity_type: activityData.activity_type,
          target_id: activityData.target_id,
          metadata: activityData.metadata || {}
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 添加到队列进行批量处理
      this.activityQueue.push(data);

      console.log(`[ProgressRealtime] 记录学习活动: ${activityData.activity_type}`);
    } catch (error) {
      console.error('[ProgressRealtime] 记录学习活动失败:', error);
    }
  }

  /**
   * 获取学习进度
   *
   * @param userId 用户ID
   * @param courseId 课程ID
   * @param componentId 组件ID（可选）
   * @returns 学习进度
   */
  async getLearningProgress(
    userId: string,
    courseId: string,
    componentId?: string
  ): Promise<LearningProgress | null> {
    try {
      const cacheKey = `${userId}_${courseId}_${componentId || 'overall'}`;

      // 先从缓存获取
      let progress = this.progressCache.get(cacheKey);
      if (!progress) {
        // 从数据库获取
        let query = this.supabase
          .from('self_learner_pathway_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId);

        if (componentId) {
          query = query.eq('component_id', componentId);
        } else {
          query = query.is('component_id', null);
        }

        const { data, error } = await query.single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        progress = data;
        if (progress) {
          this.progressCache.set(cacheKey, progress);
        }
      }

      return progress;
    } catch (error) {
      console.error('[ProgressRealtime] 获取学习进度失败:', error);
      return null;
    }
  }

  /**
   * 获取路径进度
   *
   * @param userId 用户ID
   * @param pathwayId 路径ID
   * @returns 路径进度
   */
  async getPathwayProgress(userId: string, pathwayId: string): Promise<PathwayProgress | null> {
    try {
      const cacheKey = `${userId}_${pathwayId}`;

      // 先从缓存获取
      let progress = this.pathwayCache.get(cacheKey);
      if (!progress) {
        // 从数据库获取
        const { data, error } = await this.supabase
          .from('self_learner_pathway_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('pathway_id', pathwayId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        progress = data;
        if (progress) {
          this.pathwayCache.set(cacheKey, progress);
        }
      }

      return progress;
    } catch (error) {
      console.error('[ProgressRealtime] 获取路径进度失败:', error);
      return null;
    }
  }

  /**
   * 获取用户所有进度
   *
   * @param userId 用户ID
   * @returns 所有进度数据
   */
  async getUserAllProgress(userId: string): Promise<{
    courseProgress: LearningProgress[];
    pathwayProgress: PathwayProgress[];
    recentActivities: LearningActivity[];
  }> {
    try {
      // 获取课程进度
      const { data: courseProgress } = await this.supabase
        .from('self_learner_pathway_progress')
        .select('*')
        .eq('user_id', userId)
        .not('course_id', 'is', null);

      // 获取路径进度
      const { data: pathwayProgress } = await this.supabase
        .from('self_learner_pathway_progress')
        .select('*')
        .eq('user_id', userId)
        .not('pathway_id', 'is', null);

      // 获取最近活动
      const { data: recentActivities } = await this.supabase
        .from('self_learner_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      return {
        courseProgress: courseProgress || [],
        pathwayProgress: pathwayProgress || [],
        recentActivities: recentActivities || []
      };
    } catch (error) {
      console.error('[ProgressRealtime] 获取用户所有进度失败:', error);
      return {
        courseProgress: [],
        pathwayProgress: [],
        recentActivities: []
      };
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

      // 清理所有监听器和缓存
      this.listeners.clear();
      this.progressCache.clear();
      this.pathwayCache.clear();
      this.channels.clear();
      this.activityQueue = [];

      console.log('[ProgressRealtime] 清理完成');
    } catch (error) {
      console.error('[ProgressRealtime] 清理失败:', error);
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 处理进度更新事件
   */
  private handleProgressUpdate(payload: SupabaseEvent<LearningProgress>): void {
    const channelName = `learning_progress_${payload.record.user_id}`;

    // 更新缓存
    const cacheKey = `${payload.record.user_id}_${payload.record.course_id}_${payload.record.component_id || 'overall'}`;
    this.progressCache.set(cacheKey, payload.record);

    // 通知监听器
    this.notifyListeners(channelName, payload.record);
  }

  /**
   * 处理路径更新事件
   */
  private handlePathwayUpdate(payload: SupabaseEvent<PathwayProgress>): void {
    const channelName = `pathway_progress_${payload.record.pathway_id}`;

    // 更新缓存
    const cacheKey = `${payload.record.user_id}_${payload.record.pathway_id}`;
    this.pathwayCache.set(cacheKey, payload.record);

    // 通知监听器
    this.notifyListeners(channelName, payload.record);
  }

  /**
   * 处理活动更新事件
   */
  private handleActivityUpdate(payload: SupabaseEvent<LearningActivity>): void {
    const channelName = `learning_progress_${payload.record.user_id}`;

    // 通知监听器
    this.notifyListeners(channelName, payload.record);
  }

  /**
   * 初始化用户进度数据
   */
  private async initializeUserProgress(userId: string): Promise<void> {
    try {
      const allProgress = await this.getUserAllProgress(userId);

      // 缓存课程进度
      allProgress.courseProgress.forEach(progress => {
        const cacheKey = `${progress.user_id}_${progress.course_id}_${progress.component_id || 'overall'}`;
        this.progressCache.set(cacheKey, progress);
      });

      // 缓存路径进度
      allProgress.pathwayProgress.forEach(progress => {
        const cacheKey = `${progress.user_id}_${progress.pathway_id}`;
        this.pathwayCache.set(cacheKey, progress);
      });
    } catch (error) {
      console.error('[ProgressRealtime] 初始化用户进度失败:', error);
    }
  }

  /**
   * 广播消息给用户
   */
  private async broadcastToUser(userId: string, message: any): Promise<void> {
    try {
      const channelName = `learning_progress_${userId}`;
      const channel = this.channels.get(channelName);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'progress_update',
          payload: message
        });
      }
    } catch (error) {
      console.error(`[ProgressRealtime] 广播给用户失败: ${userId}`, error);
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
          console.error('[ProgressRealtime] 监听器执行失败:', error);
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
      this.processActivityQueue();
    }, 2000); // 每2秒处理一次活动队列
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
   * 处理活动队列
   */
  private processActivityQueue(): void {
    if (this.activityQueue.length === 0) {
      return;
    }

    const activities = [...this.activityQueue];
    this.activityQueue = [];

    // 按用户ID分组
    const userGroups = new Map<string, LearningActivity[]>();
    activities.forEach(activity => {
      if (!userGroups.has(activity.user_id)) {
        userGroups.set(activity.user_id, []);
      }
      userGroups.get(activity.user_id)!.push(activity);
    });

    // 为每个用户广播活动汇总
    userGroups.forEach((userActivities, userId) => {
      this.broadcastToUser(userId, {
        type: 'activities_batch',
        activities: userActivities,
        count: userActivities.length,
        timestamp: new Date().toISOString()
      });
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
      console.log(`[ProgressRealtime] 连接状态更新: ${newStatus}`);
    }
  }

  /**
   * 取消订阅学习进度
   */
  private unsubscribeFromLearningProgress(userId: string, callback: ProgressEventListener): void {
    const channelName = `learning_progress_${userId}`;
    this.removeListener(channelName, callback);
  }

  /**
   * 取消订阅路径进度
   */
  private unsubscribeFromPathwayProgress(pathwayId: string, callback: ProgressEventListener): void {
    const channelName = `pathway_progress_${pathwayId}`;
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
      request_id: `progress_${Date.now()}`
    };
  }
}

// =============================================================================
// 单例模式导出
// =============================================================================

/**
 * 学习进度实时管理器单例实例
 */
export const progressRealtime = new ProgressRealtimeManager();

/**
 * 便利函数：订阅学习进度
 */
export async function subscribeToLearningProgress(
  userId: string,
  onProgress: ProgressEventListener
): Promise<UnsubscribeFunction> {
  return progressRealtime.subscribeToLearningProgress(userId, onProgress);
}

/**
 * 便利函数：订阅路径进度
 */
export async function subscribeToPathwayProgress(
  pathwayId: string,
  onProgress: ProgressEventListener
): Promise<UnsubscribeFunction> {
  return progressRealtime.subscribeToPathwayProgress(pathwayId, onProgress);
}

/**
 * 便利函数：更新学习进度
 */
export async function updateLearningProgress(
  userId: string,
  courseId: string,
  progress: number,
  componentId?: string,
  timeSpentMinutes?: number
): Promise<void> {
  return progressRealtime.updateLearningProgress(userId, courseId, progress, componentId, timeSpentMinutes);
}

/**
 * 便利函数：更新路径进度
 */
export async function updatePathwayProgress(
  userId: string,
  pathwayId: string,
  itemId: string,
  completed: boolean
): Promise<void> {
  return progressRealtime.updatePathwayProgress(userId, pathwayId, itemId, completed);
}

/**
 * 便利函数：记录学习活动
 */
export async function recordLearningActivity(
  activityData: Omit<LearningActivity, 'id' | 'created_at'>
): Promise<void> {
  return progressRealtime.recordLearningActivity(activityData);
}

/**
 * 便利函数：获取学习进度
 */
export async function getLearningProgress(
  userId: string,
  courseId: string,
  componentId?: string
): Promise<LearningProgress | null> {
  return progressRealtime.getLearningProgress(userId, courseId, componentId);
}

/**
 * 便利函数：获取路径进度
 */
export async function getPathwayProgress(
  userId: string,
  pathwayId: string
): Promise<PathwayProgress | null> {
  return progressRealtime.getPathwayProgress(userId, pathwayId);
}

/**
 * 便利函数：获取用户所有进度
 */
export async function getUserAllProgress(
  userId: string
): Promise<{
  courseProgress: LearningProgress[];
  pathwayProgress: PathwayProgress[];
  recentActivities: LearningActivity[];
}> {
  return progressRealtime.getUserAllProgress(userId);
}

/**
 * 便利函数：获取连接状态
 */
export function getProgressConnectionStatus(): ConnectionStatus {
  return progressRealtime.getConnectionStatus();
}

/**
 * 便利函数：清理所有连接
 */
export async function cleanupProgressRealtime(): Promise<void> {
  return progressRealtime.cleanup();
}
