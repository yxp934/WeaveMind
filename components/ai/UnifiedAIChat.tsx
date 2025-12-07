'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Settings, Mic, Paperclip, MoreHorizontal, Zap, Sparkles } from 'lucide-react';
// TODO: 修复AI SDK导入
// import { useChat } from 'ai/react';

// Stub for useChat hook
const useChat = (props?: any) => ({
  messages: [] as any[],
  input: '',
  handleInputChange: () => {},
  handleSubmit: () => {},
  isLoading: false,
  stop: () => {},
  setInput: () => {},
  append: (message: any) => {}
});
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// AI工具定义
interface AITool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'course' | 'discussion' | 'assessment' | 'progress' | 'communication' | 'analysis';
}

// 15个AI工具配置
const AI_TOOLS: AITool[] = [
  // 课程管理工具
  { id: 'generate_course', name: '生成课程', description: '基于大纲自动生成完整课程内容', icon: Sparkles, category: 'course' },
  { id: 'edit_chapter', name: '编辑章节', description: '智能编辑和优化课程章节内容', icon: Settings, category: 'course' },
  { id: 'create_assessment', name: '创建评估', description: '自动生成课程评估和练习题', icon: Zap, category: 'assessment' },

  // 讨论管理工具
  { id: 'create_discussion', name: '创建讨论', description: '智能创建讨论话题和引导问题', icon: Bot, category: 'discussion' },
  { id: 'moderate_thread', name: '管理讨论', description: '智能管理讨论线程和回复', icon: Settings, category: 'communication' },
  { id: 'generate_insights', name: '生成洞察', description: '分析讨论内容并生成见解', icon: Sparkles, category: 'analysis' },

  // 学习分析工具
  { id: 'analyze_progress', name: '分析进度', description: '分析学习进度并提供建议', icon: Bot, category: 'progress' },
  { id: 'personalize_path', name: '个性化路径', description: '为学生定制学习路径', icon: Sparkles, category: 'progress' },
  { id: 'generate_report', name: '生成报告', description: '生成学习分析报告', icon: Zap, category: 'analysis' },

  // 沟通工具
  { id: 'send_notification', name: '发送通知', description: '智能通知学生和教师', icon: Bot, category: 'communication' },
  { id: 'schedule_meeting', name: '安排会议', description: '智能安排师生会议时间', icon: Settings, category: 'communication' },
  { id: 'send_message', name: '发送消息', description: '批量发送个性化消息', icon: Zap, category: 'communication' },

  // 评估工具
  { id: 'grade_assignment', name: '评分作业', description: '智能评分和反馈', icon: Bot, category: 'assessment' },
  { id: 'generate_feedback', name: '生成反馈', description: '为学习者生成个性化反馈', icon: Sparkles, category: 'assessment' },
  { id: 'optimize_content', name: '优化内容', description: '优化课程内容以提高效果', icon: Zap, category: 'analysis' }
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    tool: string;
    args: any;
    result?: any;
  }>;
}

interface UnifiedAIChatProps {
  userRole: 'teacher' | 'student' | 'self-learner';
  classId?: string;
  courseId?: string;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

export function UnifiedAIChat({
  userRole,
  classId,
  courseId,
  isMinimized = false,
  onMinimize
}: UnifiedAIChatProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI聊天状态
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append
  } = useChat({
    api: '/api/chat',
    body: {
      userRole,
      classId,
      courseId,
      selectedTool
    }
  });

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 获取用户角色对应的可用工具
  const getAvailableTools = () => {
    if (userRole === 'teacher') {
      return AI_TOOLS; // 教师可以使用所有工具
    } else if (userRole === 'student') {
      return AI_TOOLS.filter(tool =>
        ['analyze_progress', 'personalize_path', 'generate_report', 'generate_feedback'].includes(tool.id)
      );
    } else {
      return AI_TOOLS.filter(tool =>
        ['personalize_path', 'generate_report'].includes(tool.id)
      );
    }
  };

  // 处理工具调用
  const handleToolCall = async (toolId: string) => {
    setSelectedTool(toolId);
    const tool = AI_TOOLS.find(t => t.id === toolId);
    if (tool) {
      // 添加用户消息
      await append({
        role: 'user',
        content: `请使用${tool.name}工具：${tool.description}`
      });
      setShowTools(false);
    }
  };

  // 获取类别颜色
  const getCategoryColor = (category: string) => {
    const colors = {
      course: 'bg-blue-100 text-blue-800',
      discussion: 'bg-green-100 text-green-800',
      assessment: 'bg-purple-100 text-purple-800',
      progress: 'bg-orange-100 text-orange-800',
      communication: 'bg-pink-100 text-pink-800',
      analysis: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isMinimized) {
    return (
      <motion.div
        className="fixed bottom-4 right-4 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onMinimize}
                size="lg"
                className="rounded-full w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
              >
                <Bot className="w-6 h-6" />
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
      className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border z-50 flex flex-col"
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
                    onClick={() => setShowTools(!showTools)}
                    className="h-8 w-8 p-0"
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI工具</p>
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
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 工具面板 */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-gray-50"
          >
            <div className="p-3">
              <h4 className="text-sm font-medium mb-2">AI工具</h4>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {getAvailableTools().map(tool => (
                  <TooltipProvider key={tool.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToolCall(tool.id)}
                          className="justify-start text-xs h-auto p-2"
                        >
                          <tool.icon className="w-3 h-3 mr-1" />
                          <div className="text-left">
                            <div className="font-medium">{tool.name}</div>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs mt-1", getCategoryColor(tool.category))}
                            >
                              {tool.category}
                            </Badge>
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{tool.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">你好！我是你的AI助手</p>
              <p className="text-xs mt-2">
                {userRole === 'teacher' ? '我可以帮助你管理课程、创建讨论、分析学生进度等' :
                 userRole === 'student' ? '我可以帮助你学习、回答问题、提供个性化建议等' :
                 '我可以帮你制定学习计划、跟踪进度等'}
              </p>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600">
                    <Bot className="w-4 h-4 text-white" />
                  </Avatar>
                )}

                <div className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-gray-100 text-gray-900'
                )}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 bg-gray-500">
                    <User className="w-4 h-4 text-white" />
                  </Avatar>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
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

      {/* 输入区域 */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder={selectedTool ? "描述你想要的..." : "输入你的问题..."}
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
            disabled={!input.trim() || isLoading}
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

export default UnifiedAIChat;