'use client'

import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Tool } from 'lucide-react';

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

interface MessageRendererProps {
  message: Message;
}

export default function MessageRenderer({ message }: MessageRendererProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // 安全检查消息内容
  const safeContent = React.useMemo(() => {
    if (!message.content || typeof message.content !== 'string') {
      console.warn('⚠️ 消息内容无效:', message.content);
      return '消息内容为空或无效';
    }

    // 检查是否包含Next.js代码
    if (message.content.includes('self.__next_f') ||
        message.content.includes('__NEXT_DATA__') ||
        message.content.includes('script') ||
        message.content.length > 10000) {
      console.error('❌ 检测到可疑内容:', message.content.substring(0, 100));
      return '⚠️ 系统响应异常，请刷新页面重试';
    }

    return message.content;
  }, [message.content]);

  // 格式化消息内容
  const formatContent = (content: string) => {
    try {
      return content.split('\n').map((line, index) => {
        // 处理粗体标记
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <React.Fragment key={index}>
              {parts.map((part, partIndex) => (
                partIndex % 2 === 1 ? (
                  <strong key={partIndex} className="font-semibold">{part}</strong>
                ) : (
                  <span key={partIndex}>{part}</span>
                )
              ))}
              {index < content.split('\n').length - 1 && <br />}
            </React.Fragment>
          );
        }

        // 处理项目符号
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return (
            <React.Fragment key={index}>
              <span className="ml-2">• {line.trim().substring(1).trim()}</span>
              {index < content.split('\n').length - 1 && <br />}
            </React.Fragment>
          );
        }

        // 普通文本
        return (
          <React.Fragment key={index}>
            <span>{line}</span>
            {index < content.split('\n').length - 1 && <br />}
          </React.Fragment>
        );
      });
    } catch (error) {
      console.error('❌ 格式化消息时出错:', error);
      return <span className="text-red-500">消息格式化错误</span>;
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* 头像 */}
      {isAssistant && (
        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">AI</span>
        </div>
      )}

      <div className={`max-w-[85%] p-4 rounded-lg shadow-sm ${
        isUser
          ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white'
          : 'bg-white text-gray-900 border border-gray-200'
      }`}>
        {/* 加载状态 */}
        {message.isLoading ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在智能处理你的请求...</span>
          </div>
        ) : (
          /* 消息内容 */
          <div className="text-sm leading-relaxed">
            {formatContent(safeContent)}
          </div>
        )}

        {/* 工具调用状态 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.toolCalls.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
              >
                <Tool className="w-3 h-3" />
                <span>{tool.name}</span>
                {tool.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                {tool.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-500" />}
                {tool.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
            ))}
          </div>
        )}

        {/* 工作流信息 */}
        {message.workflowType && !message.isLoading && (
          <div className="mt-3 flex items-center gap-2 text-xs opacity-75">
            <CheckCircle className="w-3 h-3" />
            <span>工作流: {message.workflowType}</span>
          </div>
        )}

        {/* 时间戳 */}
        <div className="text-xs opacity-50 mt-2">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>

      {/* 用户头像 */}
      {isUser && (
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">你</span>
        </div>
      )}
    </div>
  );
}