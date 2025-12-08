'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Loader2,
  Settings,
  Mic,
  Paperclip,
  MoreHorizontal,
  Zap,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Workflow
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useChatbotStore, ChatMessage } from '@/lib/store/chatbot-store';
import WorkflowToolPanel from './WorkflowToolPanel';
import ProgressTracker from './ProgressTracker';

interface AIChatbotProps {
  userRole?: 'teacher' | 'student' | 'self-learner';
  classId?: string;
  courseId?: string;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  className?: string;
}

export function AIChatbot({
  userRole = 'teacher',
  classId,
  courseId,
  isMinimized = false,
  onMinimize,
  onMaximize,
  className
}: AIChatbotProps) {
  const [inputValue, setInputValue] = useState('');
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 使用Zustand状态管理
  const {
    messages,
    workflow,
    isLoading,
    error,
    streamingMessage,
    sendMessage,
    addMessage,
    clearMessages,
    setError,
    getAvailableTools,
    generateOutline,
    startWorkflow,
  } = useChatbotStore();

  // 获取可用的工具
  const availableTools = getAvailableTools(userRole);

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue.trim();
    setInputValue('');

    await sendMessage(messageContent, {
      userRole,
      classId,
      courseId,
    });
  };

  // 处理快捷操作
  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'generate_outline':
        // 直接触发大纲生成流程
        startWorkflow('outline_generation', {
          userRole,
          classId,
          courseId,
        });
        // 添加引导消息
        addMessage({
          role: 'system',
          content: '我将帮您生成课程大纲。请在工作流工具面板中点击"大纲生成器"开始。',
        });
        break;

      case 'create_course':
        setInputValue('请帮我创建新课程');
        inputRef.current?.focus();
        break;

      case 'analyze_progress':
        setInputValue('请分析学习进度');
        inputRef.current?.focus();
        break;

      case 'create_discussion':
        setInputValue('请帮我创建讨论话题');
        inputRef.current?.focus();
        break;

      default:
        const actions = {
          'generate_outline': '请帮我生成课程大纲',
          'create_course': '请帮我创建新课程',
          'analyze_progress': '请分析学习进度',
          'create_discussion': '请帮我创建讨论话题',
        };

        const message = actions[action as keyof typeof actions];
        if (message) {
          setInputValue(message);
          inputRef.current?.focus();
        }
        break;
    }
  };

  // 切换工作流面板
  const toggleWorkflowPanel = () => {
    setShowWorkflowPanel(!showWorkflowPanel);
  };

  // 清除聊天记录
  const handleClearChat = () => {
    if (confirm('确定要清除所有聊天记录吗？')) {
      clearMessages();
      setError(null);
    }
  };

  // 最小化/最大化处理
  const handleToggleSize = () => {
    if (isExpanded) {
      onMinimize?.();
    } else {
      onMaximize?.();
    }
    setIsExpanded(!isExpanded);
  };

  // 最小化版本
  if (isMinimized) {
    return (
      <motion.div
        className={cn(
          "fixed bottom-4 right-4 z-50",
          className
        )}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onMaximize}
                size="lg"
                className="rounded-full w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
              >
                <Bot className="w-6 h-6 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>打开AI助手</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "bg-white rounded-lg shadow-2xl border z-50 flex flex-col",
        isExpanded ? "fixed inset-4" : "fixed bottom-4 right-4 w-96 h-[600px]",
        className
      )}
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* 头部 */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI助手</h3>
              <p className="text-xs text-gray-500">
                {userRole === 'teacher' ? '教师助手' :
                 userRole === 'student' ? '学习助手' : '自学习助手'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleWorkflowPanel}
                    className="h-8 w-8 p-0"
                  >
                    <Workflow className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>工作流工具</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleSize}
                    className="h-8 w-8 p-0"
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isExpanded ? '最小化' : '最大化'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearChat}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>清除聊天</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {onMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMinimize}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 工作流进度显示 */}
      <AnimatePresence>
        {workflow && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b"
          >
            <ProgressTracker workflow={workflow} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-red-50 p-3"
          >
            <div className="flex items-center space-x-2 text-red-700">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="h-6 w-6 p-0 ml-auto"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && !streamingMessage && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm mb-2">你好！我是你的AI助手</p>
              <p className="text-xs text-gray-400 mb-4">
                {userRole === 'teacher' ? '我可以帮助你管理课程、创建讨论、分析学生进度等' :
                 userRole === 'student' ? '我可以帮助你学习、回答问题、提供个性化建议等' :
                 '我可以帮你制定学习计划、跟踪进度等'}
              </p>

              {/* 快捷操作按钮 */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {userRole === 'teacher' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction('generate_outline')}
                      className="text-xs"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      生成大纲
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction('create_course')}
                      className="text-xs"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      创建课程
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction('analyze_progress')}
                  className="text-xs"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  分析进度
                </Button>
                {userRole === 'teacher' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction('create_discussion')}
                    className="text-xs"
                  >
                    <Bot className="w-3 h-3 mr-1" />
                    创建讨论
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          <AnimatePresence>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </AnimatePresence>

          {/* 流式消息 */}
          <AnimatePresence>
            {streamingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex gap-3"
              >
                <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600">
                  <Bot className="w-4 h-4 text-white" />
                </Avatar>
                <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {streamingMessage}
                  </div>
                  <div className="text-xs opacity-70 mt-1 flex items-center">
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    正在输入...
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 加载指示器 */}
          {isLoading && !streamingMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600">
                <Bot className="w-4 h-4 text-white" />
              </Avatar>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">正在思考...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 工作流工具面板 */}
      <AnimatePresence>
        {showWorkflowPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t bg-gray-50"
          >
            <WorkflowToolPanel
              userRole={userRole}
              classId={classId}
              courseId={courseId}
              tools={availableTools}
              onClose={() => setShowWorkflowPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 输入区域 */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入你的问题或需求..."
              className="pr-20"
              disabled={isLoading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Paperclip className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>附件</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Mic className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>语音</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!inputValue.trim() || isLoading}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}

// 消息气泡组件
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-3",
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600">
          <Bot className="w-4 h-4 text-white" />
        </Avatar>
      )}

      <div className={cn(
        "max-w-[80%] rounded-lg p-3",
        isUser
          ? 'bg-blue-500 text-white ml-auto'
          : isSystem
          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          : 'bg-gray-100 text-gray-900'
      )}>
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>

        {/* 工具调用显示 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((toolCall, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  toolCall.status === 'completed' ? 'bg-green-500' :
                  toolCall.status === 'error' ? 'bg-red-500' :
                  toolCall.status === 'running' ? 'bg-blue-500 animate-pulse' :
                  'bg-gray-400'
                )} />
                <span>{toolCall.tool}</span>
                {toolCall.status === 'error' && toolCall.error && (
                  <span className="text-red-600">({toolCall.error})</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {isUser && (
        <Avatar className="w-8 h-8 bg-gray-500">
          <User className="w-4 h-4 text-white" />
        </Avatar>
      )}
    </motion.div>
  );
}

export default AIChatbot;