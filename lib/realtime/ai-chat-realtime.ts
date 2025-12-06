/**
 * WeaveMind LMS AI聊天实时功能系统
 *
 * 这个模块实现了AI聊天系统的实时功能，包括：
 * - 实时AI响应流式传输
 * - 实时工具调用结果展示
 * - 实时对话状态同步
 - 支持多用户AI对话
 * - 实时AI建议推送
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';
import {
  AIChatSession,
  ChatMessage,
  AIResponseChunk,
  ToolCall,
  AISuggestion,
  ChatMessageData,
  RealtimeEventType,
  ConnectionStatus,
  UnsubscribeFunction,
  SupabaseEvent,
  AIChatEventListener,
  RealtimeError,
  RealtimeErrorCode,
  DEFAULT_REALTIME_CONFIG
} from './types';

/**
 * AI聊天实时管理器
 *
 * 负责管理AI聊天系统的所有实时功能，包括消息流、工具调用和建议推送。
 */
export class AIChatRealtimeManager {
  private supabase = createClient();
  private channels = new Map<string, RealtimeChannel>();
  private listeners = new Map<string, Set<AIChatEventListener>>();
  private sessionCache = new Map<string, AIChatSession>();
  private messageBuffer = new Map<string, ChatMessage[]>();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private retryAttempts = 0;
  private readonly maxRetryAttempts = 5;
  private streamProcessors = new Map<string, NodeJS.Timeout>();
  private suggestionQueue: AISuggestion[] = [];
  private batchInterval: NodeJS.Timeout | null = null;

  /**
   * 订阅AI响应流
   *
   * @param sessionId 会话ID
   * @param callback 响应块回调函数
   * @returns 取消订阅函数
   */
  async subscribeToAIResponse(
    sessionId: string,
    callback: AIChatEventListener
  ): Promise<UnsubscribeFunction> {
    try {
      const channelName = `ai_response_${sessionId}`;

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
              table: 'ai_chat_sessions',
              filter: `id=eq.${sessionId}`
            },
            (payload) => this.handleSessionUpdate(payload)
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT' as RealtimeEventType,
              schema: 'public',
              table: 'chat_messages'
            },
            (payload) => this.handleMessageUpdate(payload)
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

      // 初始化会话数据
      await this.initializeSession(sessionId);

      // 启动批量处理建议
      this.startBatchProcessing();

      console.log(`[AIChatRealtime] 订阅AI响应流: ${sessionId}`);

      return () => this.unsubscribeFromAIResponse(sessionId, callback);
    } catch (error) {
      console.error('[AIChatRealtime] 订阅AI响应流失败:', error);
      throw this.createError('SUBSCRIPTION_FAILED', `订阅AI响应流失败: ${sessionId}`, error);
    }
  }

  /**
   * 订阅AI建议
   *
   * @param userId 用户ID
   * @param callback 建议回调函数
   * @returns 取消订阅函数
   */
  async subscribeToAISuggestions(
    userId: string,
    callback: AIChatEventListener
  ): Promise<UnsubscribeFunction> {
    try {
      const channelName = `ai_suggestions_${userId}`;

      // 创建或获取频道
      let channel = this.channels.get(channelName);
      if (!channel) {
        channel = this.supabase
          .channel(channelName)
          .on(
            'broadcast',
            { event: 'ai_suggestion' },
            (payload) => this.handleAISuggestion(payload)
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

      console.log(`[AIChatRealtime] 订阅AI建议: ${userId}`);

      return () => this.unsubscribeFromAISuggestions(userId, callback);
    } catch (error) {
      console.error('[AIChatRealtime] 订阅AI建议失败:', error);
      throw this.createError('SUBSCRIPTION_FAILED', `订阅AI建议失败: ${userId}`, error);
    }
  }

  /**
   * 实时发送用户消息
   *
   * @param sessionId 会话ID
   * @param messageData 消息数据
   */
  async sendMessage(sessionId: string, messageData: ChatMessageData): Promise<void> {
    try {
      // 创建新消息记录
      const { data: userMessage, error: messageError } = await this.supabase
        .from('chat_messages')
        .insert({
          session_id: messageData.session_id,
          role: messageData.role,
          content: messageData.content,
          metadata: messageData.metadata || {}
        })
        .select()
        .single();

      if (messageError) {
        throw messageError;
      }

      // 广播用户消息
      await this.broadcastToSession(sessionId, {
        type: 'user_message',
        message: userMessage,
        timestamp: new Date().toISOString()
      });

      // 更新会话最后活动时间
      await this.updateSessionActivity(sessionId);

      console.log(`[AIChatRealtime] 发送用户消息: ${sessionId}`);
    } catch (error) {
      console.error('[AIChatRealtime] 发送用户消息失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', '发送用户消息失败', error);
    }
  }

  /**
   * 实时发送AI响应
   *
   * @param sessionId 会话ID
   * @param content AI响应内容
   * @param metadata 响应元数据
   * @param isComplete 是否完成
   */
  async sendAIResponse(
    sessionId: string,
    content: string,
    metadata?: any,
    isComplete: boolean = true
  ): Promise<void> {
    try {
      const chunkId = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const chunk: AIResponseChunk = {
        session_id: sessionId,
        chunk_id: chunkId,
        content,
        is_complete: isComplete,
        metadata: {
          model: metadata?.model || 'default',
          tokens_used: metadata?.tokens_used,
          processing_time: metadata?.processing_time
        }
      };

      // 广播AI响应块
      await this.broadcastToSession(sessionId, {
        type: 'ai_response_chunk',
        chunk,
        timestamp: new Date().toISOString()
      });

      // 如果响应完成，创建完整的AI消息记录
      if (isComplete) {
        await this.createCompleteAIMessage(sessionId, content, metadata);
      }

      console.log(`[AIChatRealtime] 发送AI响应: ${sessionId}`);
    } catch (error) {
      console.error('[AIChatRealtime] 发送AI响应失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', '发送AI响应失败', error);
    }
  }

  /**
   * 实时工具调用
   *
   * @param sessionId 会话ID
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns 工具执行结果
   */
  async executeToolCall(
    sessionId: string,
    toolName: string,
    params: any
  ): Promise<ToolCall> {
    try {
      const toolCall: ToolCall = {
        id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: toolName,
        arguments: params,
        execution_time: 0
      };

      const startTime = Date.now();

      // 广播工具调用开始
      await this.broadcastToSession(sessionId, {
        type: 'tool_call_start',
        tool_call: toolCall,
        timestamp: new Date().toISOString()
      });

      // 这里应该调用实际的工具逻辑
      // 为了演示，我们模拟工具执行
      const result = await this.mockToolExecution(toolName, params);
      toolCall.result = result;
      toolCall.execution_time = Date.now() - startTime;

      // 广播工具调用结果
      await this.broadcastToSession(sessionId, {
        type: 'tool_call_result',
        tool_call: toolCall,
        timestamp: new Date().toISOString()
      });

      console.log(`[AIChatRealtime] 工具调用完成: ${toolName}`);
      return toolCall;
    } catch (error) {
      console.error('[AIChatRealtime] 工具调用失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', `工具调用失败: ${toolName}`, error);
    }
  }

  /**
   * 创建新AI聊天会话
   *
   * @param userId 用户ID
   * @param contextType 上下文类型
   * @param contextId 上下文ID
   * @param title 会话标题
   * @returns 新会话
   */
  async createChatSession(
    userId: string,
    contextType: AIChatSession['context_type'],
    contextId?: string,
    title?: string
  ): Promise<AIChatSession> {
    try {
      const { data, error } = await this.supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: userId,
          context_type: contextType,
          context_id: contextId,
          title: title,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 缓存会话数据
      this.sessionCache.set(data.id, data);

      // 广播新会话创建
      await this.broadcastToUser(userId, {
        type: 'session_created',
        session: data,
        timestamp: new Date().toISOString()
      });

      console.log(`[AIChatRealtime] 创建新会话: ${data.id}`);
      return data;
    } catch (error) {
      console.error('[AIChatRealtime] 创建会话失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', '创建会话失败', error);
    }
  }

  /**
   * 结束AI聊天会话
   *
   * @param sessionId 会话ID
   */
  async endChatSession(sessionId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('ai_chat_sessions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 更新缓存
      this.sessionCache.set(sessionId, data);

      // 广播会话结束
      await this.broadcastToSession(sessionId, {
        type: 'session_ended',
        session: data,
        timestamp: new Date().toISOString()
      });

      console.log(`[AIChatRealtime] 结束会话: ${sessionId}`);
    } catch (error) {
      console.error('[AIChatRealtime] 结束会话失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', '结束会话失败', error);
    }
  }

  /**
   * 获取聊天会话消息
   *
   * @param sessionId 会话ID
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 消息列表
   */
  async getChatMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('[AIChatRealtime] 获取聊天消息失败:', error);
      return [];
    }
  }

  /**
   * 发送AI建议
   *
   * @param suggestion 建议数据
   */
  async sendAISuggestion(suggestion: Omit<AISuggestion, 'id' | 'created_at'>): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('ai_suggestions')
        .insert({
          user_id: suggestion.user_id,
          type: suggestion.type,
          title: suggestion.title,
          content: suggestion.content,
          relevance_score: suggestion.relevance_score,
          context: suggestion.context,
          is_dismissed: false
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 添加到建议队列
      this.suggestionQueue.push(data);

      // 广播建议
      await this.broadcastToUser(suggestion.user_id, {
        type: 'ai_suggestion',
        suggestion: data,
        timestamp: new Date().toISOString()
      });

      console.log(`[AIChatRealtime] 发送AI建议: ${data.id}`);
    } catch (error) {
      console.error('[AIChatRealtime] 发送AI建议失败:', error);
      throw this.createError('MESSAGE_TOO_LARGE', '发送AI建议失败', error);
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

      // 清除所有流处理器
      for (const [sessionId, processor] of this.streamProcessors) {
        clearTimeout(processor);
      }
      this.streamProcessors.clear();

      // 取消所有频道订阅
      for (const [channelName, channel] of this.channels) {
        await this.supabase.removeChannel(channel);
      }

      // 清理所有监听器和缓存
      this.listeners.clear();
      this.sessionCache.clear();
      this.messageBuffer.clear();
      this.channels.clear();
      this.suggestionQueue = [];

      console.log('[AIChatRealtime] 清理完成');
    } catch (error) {
      console.error('[AIChatRealtime] 清理失败:', error);
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 处理会话更新事件
   */
  private handleSessionUpdate(payload: SupabaseEvent<AIChatSession>): void {
    const channelName = `ai_response_${payload.record.id}`;

    // 更新缓存
    this.sessionCache.set(payload.record.id, payload.record);

    // 通知监听器
    this.notifyListeners(channelName, payload.record);
  }

  /**
   * 处理消息更新事件
   */
  private handleMessageUpdate(payload: SupabaseEvent<ChatMessage>): void {
    const channelName = `ai_response_${payload.record.session_id}`;

    // 添加到消息缓冲区
    if (!this.messageBuffer.has(payload.record.session_id)) {
      this.messageBuffer.set(payload.record.session_id, []);
    }
    this.messageBuffer.get(payload.record.session_id)!.push(payload.record);

    // 通知监听器
    this.notifyListeners(channelName, payload.record);
  }

  /**
   * 处理AI建议事件
   */
  private handleAISuggestion(payload: any): void {
    const channelName = `ai_suggestions_${payload.user_id}`;
    this.notifyListeners(channelName, payload.suggestion);
  }

  /**
   * 初始化会话数据
   */
  private async initializeSession(sessionId: string): Promise<void> {
    try {
      // 获取会话信息
      const { data: session } = await this.supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (session) {
        this.sessionCache.set(sessionId, session);
      }

      // 获取最近的消息
      const messages = await this.getChatMessages(sessionId, 20);
      this.messageBuffer.set(sessionId, messages);
    } catch (error) {
      console.error('[AIChatRealtime] 初始化会话失败:', error);
    }
  }

  /**
   * 更新会话活动时间
   */
  private async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await this.supabase
        .from('ai_chat_sessions')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error('[AIChatRealtime] 更新会话活动时间失败:', error);
    }
  }

  /**
   * 创建完整的AI消息
   */
  private async createCompleteAIMessage(
    sessionId: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content,
          metadata: {
            model: metadata?.model || 'default',
            tokens: metadata?.tokens_used,
            ...metadata
          }
        });
    } catch (error) {
      console.error('[AIChatRealtime] 创建AI消息失败:', error);
    }
  }

  /**
   * 模拟工具执行（生产环境需要替换为真实的工具逻辑）
   */
  private async mockToolExecution(toolName: string, params: any): Promise<any> {
    // 模拟不同工具的执行结果
    switch (toolName) {
      case 'search_course_content':
        return {
          found: true,
          content: `找到相关内容: ${params.query}`,
          relevance_score: 0.95
        };
      case 'generate_quiz':
        return {
          questions: [
            {
              id: 1,
              question: `关于${params.topic}的问题`,
              options: ['A', 'B', 'C', 'D'],
              correct_answer: 'A'
            }
          ]
        };
      case 'analyze_progress':
        return {
          progress: 75,
          strengths: ['理解能力强', '记忆力好'],
          improvements: ['需要更多练习', '建议复习基础概念']
        };
      default:
        return { success: true, message: `工具 ${toolName} 执行成功` };
    }
  }

  /**
   * 广播消息给会话
   */
  private async broadcastToSession(sessionId: string, message: any): Promise<void> {
    try {
      const channelName = `ai_response_${sessionId}`;
      const channel = this.channels.get(channelName);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'ai_chat_update',
          payload: message
        });
      }
    } catch (error) {
      console.error(`[AIChatRealtime] 广播给会话失败: ${sessionId}`, error);
    }
  }

  /**
   * 广播消息给用户
   */
  private async broadcastToUser(userId: string, message: any): Promise<void> {
    try {
      // 获取用户的所有会话，广播给所有相关频道
      const userSessions = Array.from(this.sessionCache.values())
        .filter(session => session.user_id === userId);

      for (const session of userSessions) {
        await this.broadcastToSession(session.id, message);
      }
    } catch (error) {
      console.error(`[AIChatRealtime] 广播给用户失败: ${userId}`, error);
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
          console.error('[AIChatRealtime] 监听器执行失败:', error);
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
      this.processSuggestionQueue();
    }, 3000); // 每3秒处理一次建议队列
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
   * 处理建议队列
   */
  private processSuggestionQueue(): void {
    if (this.suggestionQueue.length === 0) {
      return;
    }

    const suggestions = [...this.suggestionQueue];
    this.suggestionQueue = [];

    // 按用户ID分组
    const userGroups = new Map<string, AISuggestion[]>();
    suggestions.forEach(suggestion => {
      if (!userGroups.has(suggestion.user_id)) {
        userGroups.set(suggestion.user_id, []);
      }
      userGroups.get(suggestion.user_id)!.push(suggestion);
    });

    // 为每个用户广播建议汇总
    userGroups.forEach((userSuggestions, userId) => {
      this.broadcastToUser(userId, {
        type: 'suggestions_batch',
        suggestions: userSuggestions,
        count: userSuggestions.length,
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
      console.log(`[AIChatRealtime] 连接状态更新: ${newStatus}`);
    }
  }

  /**
   * 取消订阅AI响应流
   */
  private unsubscribeFromAIResponse(sessionId: string, callback: AIChatEventListener): void {
    const channelName = `ai_response_${sessionId}`;
    this.removeListener(channelName, callback);
  }

  /**
   * 取消订阅AI建议
   */
  private unsubscribeFromAISuggestions(userId: string, callback: AIChatEventListener): void {
    const channelName = `ai_suggestions_${userId}`;
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
      request_id: `ai_chat_${Date.now()}`
    };
  }
}

// =============================================================================
// 单例模式导出
// =============================================================================

/**
 * AI聊天实时管理器单例实例
 */
export const aiChatRealtime = new AIChatRealtimeManager();

/**
 * 便利函数：订阅AI响应流
 */
export async function subscribeToAIResponse(
  sessionId: string,
  onResponse: AIChatEventListener
): Promise<UnsubscribeFunction> {
  return aiChatRealtime.subscribeToAIResponse(sessionId, onResponse);
}

/**
 * 便利函数：订阅AI建议
 */
export async function subscribeToAISuggestions(
  userId: string,
  onSuggestion: AIChatEventListener
): Promise<UnsubscribeFunction> {
  return aiChatRealtime.subscribeToAISuggestions(userId, onSuggestion);
}

/**
 * 便利函数：发送用户消息
 */
export async function sendChatMessage(messageData: ChatMessageData): Promise<void> {
  return aiChatRealtime.sendMessage(messageData.session_id, messageData);
}

/**
 * 便利函数：发送AI响应
 */
export async function sendAIResponse(
  sessionId: string,
  content: string,
  metadata?: any,
  isComplete?: boolean
): Promise<void> {
  return aiChatRealtime.sendAIResponse(sessionId, content, metadata, isComplete);
}

/**
 * 便利函数：执行工具调用
 */
export async function executeToolCall(
  sessionId: string,
  toolName: string,
  params: any
): Promise<ToolCall> {
  return aiChatRealtime.executeToolCall(sessionId, toolName, params);
}

/**
 * 便利函数：创建聊天会话
 */
export async function createChatSession(
  userId: string,
  contextType: AIChatSession['context_type'],
  contextId?: string,
  title?: string
): Promise<AIChatSession> {
  return aiChatRealtime.createChatSession(userId, contextType, contextId, title);
}

/**
 * 便利函数：结束聊天会话
 */
export async function endChatSession(sessionId: string): Promise<void> {
  return aiChatRealtime.endChatSession(sessionId);
}

/**
 * 便利函数：获取聊天消息
 */
export async function getChatMessages(
  sessionId: string,
  limit?: number,
  offset?: number
): Promise<ChatMessage[]> {
  return aiChatRealtime.getChatMessages(sessionId, limit, offset);
}

/**
 * 便利函数：发送AI建议
 */
export async function sendAISuggestion(
  suggestion: Omit<AISuggestion, 'id' | 'created_at'>
): Promise<void> {
  return aiChatRealtime.sendAISuggestion(suggestion);
}

/**
 * 便利函数：获取连接状态
 */
export function getAIChatConnectionStatus(): ConnectionStatus {
  return aiChatRealtime.getConnectionStatus();
}

/**
 * 便利函数：清理所有连接
 */
export async function cleanupAIChatRealtime(): Promise<void> {
  return aiChatRealtime.cleanup();
}
