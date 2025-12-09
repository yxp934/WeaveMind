'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';
import MessageRenderer from './MessageRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  workflowType?: string;
  isLoading?: boolean;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  parameters: any;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: string;
}

interface ConversationState {
  sessionId: string;
  workflowType: string;
  currentStep: number;
  collectedData: Record<string, any>;
  status: 'active' | 'completed' | 'paused' | 'error';
}

interface SmartConversationManagerProps {
  className?: string;
}

export default function SmartConversationManager({ className = '' }: SmartConversationManagerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是WeaveMind的智能AI助手。我可以帮你完成教育工作：\n\n• 🎯 创建完整课程（8步引导式流程）\n• 📋 生成课程大纲\n• 📝 创建作业（测验/写作/研究）\n• 🔄 A2A内容优化\n• 📚 生成教学内容\n\n请告诉我你想要做什么，我会智能识别你的意图并引导你完成整个流程！',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息到后端API
  const sendMessageToAPI = useCallback(async (userInput: string): Promise<{
    message: string;
    metadata?: any;
    toolsUsed?: string[];
  }> => {
    try {
      console.log('🤖 [API] 发送消息:', userInput);
      console.log('📊 [API] 会话ID:', sessionId);
      console.log('📝 [API] 消息历史:', messages.length, '条');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          context: {
            userRole: 'teacher',
            sessionId,
            conversationHistory: messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp.toISOString(),
              toolsUsed: msg.toolCalls?.map(tool => tool.name) || []
            }))
          }
        })
      });

      console.log('📡 [API] 响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [API] 请求失败:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ [API] 响应数据:', data);

      if (data.success && data.data) {
        console.log('💬 [API] AI消息内容长度:', data.data.message?.length);
        console.log('🔧 [API] 使用工具:', data.data.toolsUsed);
        console.log('📋 [API] 工作流类型:', data.data.metadata?.workflowType);

        return {
          message: data.data.message,
          metadata: data.data.metadata || {},
          toolsUsed: data.data.toolsUsed || []
        };
      } else {
        console.error('❌ [API] 响应格式错误:', data);
        throw new Error(data.error?.message || 'API returned error');
      }
    } catch (error) {
      console.error('❌ [API] 异常:', error);
      // 返回友好的错误消息
      return {
        message: '抱歉，AI服务暂时不可用。请稍后再试，或者告诉我你想要重新开始。',
        metadata: { error: true },
        toolsUsed: []
      };
    }
  }, [messages, sessionId]);

  // 发送消息处理
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) {
      console.log('⚠️ [HANDLE] 消息为空或正在加载，跳过发送');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    console.log('📤 [HANDLE] 添加用户消息:', userMessage.content);
    setMessages(prev => [...prev, userMessage]);

    const currentInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // 调用后端API
      const apiResponse = await sendMessageToAPI(currentInput);

      // 验证API响应
      if (!apiResponse || !apiResponse.message) {
        console.error('❌ [HANDLE] 无效的API响应:', apiResponse);
        throw new Error('无效的API响应');
      }

      // 创建助手消息
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: apiResponse.message,
        timestamp: new Date(),
        workflowType: apiResponse.metadata?.workflowType,
        toolCalls: apiResponse.toolsUsed?.map((toolName: string) => ({
          id: crypto.randomUUID(),
          name: toolName,
          parameters: {},
          status: 'completed' as const,
          timestamp: new Date().toISOString()
        }))
      };

      console.log('💬 [HANDLE] 创建助手消息:', {
        id: assistantMessage.id,
        contentLength: assistantMessage.content.length,
        workflowType: assistantMessage.workflowType,
        toolCalls: assistantMessage.toolCalls?.length
      });

      console.log('🔍 [HANDLE] 助手消息内容预览:', assistantMessage.content.substring(0, 200) + '...');
      console.log('📝 [HANDLE] 消息类型检查:', {
        isString: typeof assistantMessage.content === 'string',
        hasContent: assistantMessage.content.length > 0,
        firstChars: assistantMessage.content.substring(0, 50)
      });

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);

      // 更新对话状态（如果API返回了工作流信息）
      if (apiResponse.metadata?.workflowType) {
        const newState = {
          sessionId,
          workflowType: apiResponse.metadata.workflowType,
          currentStep: apiResponse.metadata.currentStep || 1,
          collectedData: {},
          status: 'active' as const
        };
        setConversationState(newState);
        console.log('🔄 [HANDLE] 更新工作流状态:', newState.workflowType);
      }

    } catch (error) {
      console.error('❌ [HANDLE] 发送消息错误:', error);
      setIsLoading(false);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，出现了一些错误。请稍后再试，或者告诉我你想要重新开始。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetConversation = () => {
    console.log('🔄 [RESET] 重置对话');
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '对话已重置！我准备好帮助你完成新的任务。请告诉我你想要做什么：\n\n• 创建课程\n• 生成大纲\n• 创建作业\n• 其他需求',
        timestamp: new Date()
      }
    ]);
    setConversationState(null);
    setInputValue('');
    setIsLoading(false);
  };

  return (
    <ErrorBoundary>
      <div className={`flex flex-col h-[700px] border border-gray-200 rounded-lg shadow-lg ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">WeaveMind 智能助手</h3>
              <p className="text-sm text-gray-600">AI驱动的工作流助手</p>
            </div>
          </div>

          {conversationState && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">
                {conversationState.workflowType} - 第{conversationState.currentStep}步
              </span>
            </div>
          )}

          <button
            onClick={resetConversation}
            className="text-sm text-gray-500 hover:text-gray-700 underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            重新开始
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>开始与AI助手对话吧！</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageRenderer key={message.id} message={message} />
            ))
          )}

          {/* 加载指示器 */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 ml-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI正在思考...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的问题或需求..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isLoading ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}