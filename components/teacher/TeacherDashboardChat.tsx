'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Bot, User, BookOpen, Calendar, FileText, X, Users, Clock, CheckCircle } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  functionResult?: {
    type: 'class' | 'session' | 'assignment' | 'student' | 'schedule' | 'deadline' | 'progress';
    data: any;
    success: boolean;
  };
}

interface TeacherDashboardChatProps {
  classes: Array<{ id: number; title: string }>;
  sessions: Array<{ id: number; title: string }>;
  assignments: Array<{ id: number; title: string }>;
}

// Function Result Card Component
interface FunctionResultCardProps {
  type: Message['functionResult']['type'];
  data: any;
  success: boolean;
}

function FunctionResultCard({ type, data, success }: FunctionResultCardProps) {
  const getCardColor = () => {
    switch (type) {
      case 'class':
        return 'from-[#B882B1]/10 to-[#B882B1]/5';
      case 'session':
        return 'from-[#3FA11B]/10 to-[#3FA11B]/5';
      case 'assignment':
        return 'from-[#B882B1]/10 to-[#B882B1]/5';
      case 'student':
        return 'from-[#4ECDC4]/10 to-[#4ECDC4]/5';
      case 'schedule':
        return 'from-[#3FA11B]/10 to-[#3FA11B]/5';
      case 'deadline':
        return 'from-[#FF6B6B]/10 to-[#FF6B6B]/5';
      case 'progress':
        return 'from-[#B882B1]/10 to-[#B882B1]/5';
      default:
        return 'from-gray-100 to-gray-50';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'class':
        return <BookOpen className="size-4 text-[#B882B1]" />;
      case 'session':
        return <Calendar className="size-4 text-[#3FA11B]" />;
      case 'assignment':
        return <FileText className="size-4 text-[#B882B1]" />;
      case 'student':
        return <Users className="size-4 text-[#4ECDC4]" />;
      case 'schedule':
        return <Clock className="size-4 text-[#3FA11B]" />;
      case 'deadline':
        return <Calendar className="size-4 text-[#FF6B6B]" />;
      case 'progress':
        return <CheckCircle className="size-4 text-[#B882B1]" />;
      default:
        return null;
    }
  };

  const renderClassData = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-[#101828] text-[14px]">{data.className}</h4>
        <span className="text-[12px] font-medium text-[#B882B1]">{data.averageProgress}%</span>
      </div>
      <div className="flex items-center gap-4 text-[12px] text-[#6a7282]">
        <div className="flex items-center gap-1">
          <Users className="size-3" />
          <span>{data.studentCount} students</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="size-3" />
          <span>{data.completedSessions}/{data.totalSessions} sessions</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#B882B1] rounded-full transition-all"
          style={{ width: `${data.averageProgress}%` }}
        />
      </div>
    </div>
  );

  const renderSessionData = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-[#101828] text-[14px]">{data.title}</h4>
      <div className="flex items-center gap-4 text-[12px] text-[#6a7282]">
        <div className="flex items-center gap-1">
          <Calendar className="size-3" />
          <span>{data.date}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="size-3" />
          <span>{data.time}</span>
        </div>
      </div>
      {data.duration && (
        <p className="text-[12px] text-[#6a7282]">{data.duration} minutes</p>
      )}
    </div>
  );

  const renderAssignmentData = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-[#101828] text-[14px]">{data.title}</h4>
      <div className="flex items-center gap-4 text-[12px] text-[#6a7282]">
        <div className="flex items-center gap-1">
          <Calendar className="size-3" />
          <span>{data.dueDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="size-3" />
          <span>{data.submissionCount}/{data.totalStudents}</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#B882B1] rounded-full transition-all"
          style={{
            width: `${data.totalStudents > 0 ? (data.submissionCount / data.totalStudents) * 100 : 0}%`
          }}
        />
      </div>
    </div>
  );

  const renderStudentData = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-[#101828] text-[14px]">{data.name}</h4>
      <div className="flex items-center gap-4 text-[12px] text-[#6a7282]">
        <span>{data.progress}% complete</span>
        <span>{data.submissions} submissions</span>
      </div>
    </div>
  );

  const renderScheduleData = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-[#101828] text-[14px]">{data.title}</h4>
      <div className="flex items-center gap-4 text-[12px] text-[#6a7282]">
        <div className="flex items-center gap-1">
          <Calendar className="size-3" />
          <span>{data.date}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="size-3" />
          <span>{data.time}</span>
        </div>
      </div>
    </div>
  );

  const renderDeadlineData = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-[#101828] text-[14px]">{data.title}</h4>
      <div className="flex items-center gap-4 text-[12px] text-[#6a7282]">
        <div className="flex items-center gap-1">
          <Calendar className="size-3" />
          <span>Due: {data.dueDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="size-3" />
          <span>{data.submissionCount}/{data.totalStudents} submitted</span>
        </div>
      </div>
    </div>
  );

  const renderProgressData = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-[#101828] text-[14px]">{data.className}</h4>
      <div className="flex items-center gap-4 text-[12px] text-[#6a7282]">
        <div className="flex items-center gap-1">
          <Users className="size-3" />
          <span>{data.studentCount} students</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="size-3" />
          <span>{data.averageProgress}% progress</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#B882B1] rounded-full transition-all"
          style={{ width: `${data.averageProgress}%` }}
        />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'class':
        return renderClassData();
      case 'session':
        return renderSessionData();
      case 'assignment':
        return renderAssignmentData();
      case 'student':
        return renderStudentData();
      case 'schedule':
        return renderScheduleData();
      case 'deadline':
        return renderDeadlineData();
      case 'progress':
        return renderProgressData();
      default:
        return <pre className="text-[12px] text-[#6a7282]">{JSON.stringify(data, null, 2)}</pre>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${getCardColor()} border border-gray-200 rounded-xl p-4 mt-2`}
    >
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-lg bg-white/50 flex items-center justify-center">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
        {success && (
          <CheckCircle className="size-5 text-[#3FA11B] flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );
}

export function TeacherDashboardChat({ classes, sessions, assignments }: TeacherDashboardChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextTab, setContextTab] = useState<'classes' | 'sessions' | 'assignments'>('classes');
  const [selectedContext, setSelectedContext] = useState<{
    classId?: string;
    sessionId?: string;
    assignmentId?: string;
  }>({});
  const [contextTags, setContextTags] = useState<Array<{
    id: string;
    title: string;
    type: 'class' | 'session' | 'assignment';
  }>>([]);

  const suggestions = [
    "How is Jimmy's assignment progress?",
    "Create a schedule for my Machine Learning class",
    "What assignments are due this week?",
    "Show me my overall performance",
  ];

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理上下文添加
  const handleAddContext = (item: { id: string | number; title: string; type: 'class' | 'session' | 'assignment' }) => {
    const newTag = {
      id: `${item.type}-${item.id}`,
      title: item.title,
      type: item.type
    };

    // 检查是否已存在
    if (!contextTags.some(tag => tag.id === newTag.id)) {
      setContextTags(prev => [...prev, newTag]);

      // 更新选中的上下文
      if (item.type === 'class') {
        setSelectedContext(prev => ({ ...prev, classId: item.id.toString() }));
      } else if (item.type === 'session') {
        setSelectedContext(prev => ({ ...prev, sessionId: item.id.toString() }));
      } else if (item.type === 'assignment') {
        setSelectedContext(prev => ({ ...prev, assignmentId: item.id.toString() }));
      }
    }

    setShowContextMenu(false);
  };

  // 处理上下文移除
  const handleRemoveContext = (tag: { id: string; type: 'class' | 'session' | 'assignment' }) => {
    setContextTags(prev => prev.filter(t => t.id !== tag.id));

    // 更新选中的上下文
    if (tag.type === 'class') {
      setSelectedContext(prev => {
        const newContext = { ...prev };
        delete newContext.classId;
        return newContext;
      });
    } else if (tag.type === 'session') {
      setSelectedContext(prev => {
        const newContext = { ...prev };
        delete newContext.sessionId;
        return newContext;
      });
    } else if (tag.type === 'assignment') {
      setSelectedContext(prev => {
        const newContext = { ...prev };
        delete newContext.assignmentId;
        return newContext;
      });
    }
  };

  // 获取图标
  const getIcon = (type: 'class' | 'session' | 'assignment') => {
    switch (type) {
      case 'class':
        return <BookOpen className="size-3" />;
      case 'session':
        return <Calendar className="size-3" />;
      case 'assignment':
        return <FileText className="size-3" />;
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/teacher-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context: selectedContext,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.data?.message || data.data?.response || 'Response received.',
          isUser: false,
          timestamp: new Date(),
          functionResult: data.data?.functionResults && data.data.functionResults.length > 0
            ? data.data.functionResults[0] // Use first function result as the main card
            : undefined,
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Handle error - ensure we get a string, not an object
        let errorText = '抱歉，我遇到了一个错误。请重试。';
        if (typeof data.error === 'string') {
          errorText = data.error;
        } else if (data.error?.message) {
          errorText = data.error.message;
        }
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: errorText,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // 处理网络错误
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '网络错误，请检查连接后重试。',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // 建议点击处理 - 直接发送消息
  const handleSuggestionClick = async (suggestion: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: suggestion,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/teacher-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: suggestion,
          context: selectedContext,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.data?.message || data.data?.response || 'Response received.',
          isUser: false,
          timestamp: new Date(),
          functionResult: data.data?.functionResults && data.data.functionResults.length > 0
            ? data.data.functionResults[0] // Use first function result as the main card
            : undefined,
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Handle error - ensure we get a string, not an object
        let errorText = 'Sorry, I encountered an error. Please try again.';
        if (typeof data.error === 'string') {
          errorText = data.error;
        } else if (data.error?.message) {
          errorText = data.error.message;
        }
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: errorText,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Network error, please check your connection and try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // 键盘事件处理 - 使用 onKeyDown 替代已弃用的 onKeyPress
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white rounded-[20px] border border-gray-200 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)] h-full flex flex-col">
      {/* Header Section */}
      <div className="bg-[#f3e8f4] px-6 py-4 border-b border-gray-200">
        <h2 className="text-[18px] font-bold text-[#101828] mb-1">Weaver AI</h2>
        <p className="text-[13px] text-[#6a7282]">Your intelligent teaching assistant</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-gradient-to-br from-[#89BCFF]/20 to-[#FF86E1]/20 blur-3xl rounded-full w-32 h-32 mb-6"></div>
            <h3 className="text-[20px] font-bold text-[#101828] mb-2">How can I help you?</h3>
            <p className="text-[14px] text-[#6a7282] mb-6">Suggestions on what to ask</p>

            {/* Suggestion Buttons Grid */}
            <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="bg-white/40 backdrop-blur-md border border-gray-200/80 rounded-[12px] px-4 py-3 text-left text-[13px] text-[#101828] hover:bg-white/60 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          // Messages List
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!message.isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#B882B1] to-[#a06e9d] flex items-center justify-center mr-3 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-[10px] px-4 py-3 ${
                      message.isUser
                        ? 'bg-gray-100 text-[#101828]'
                        : 'bg-[#f3e8f4] border border-[rgba(184,130,177,0.2)] text-[#101828]'
                    }`}
                  >
                    <p className="text-[14px] whitespace-pre-wrap">{message.text}</p>
                    {message.functionResult && (
                      <FunctionResultCard
                        type={message.functionResult.type}
                        data={message.functionResult.data}
                        success={message.functionResult.success}
                      />
                    )}
                    <p className="text-[11px] text-[#6a7282] mt-1">
                      {typeof message.timestamp === 'object' && message.timestamp instanceof Date
                        ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {message.isUser && (
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center ml-3 mt-1">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#B882B1] to-[#a06e9d] flex items-center justify-center mr-3 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#f3e8f4] border border-[rgba(184,130,177,0.2)] rounded-[10px] px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#B882B1] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#B882B1] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-[#B882B1] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Context Tags Display */}
      {contextTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 px-6">
          {contextTags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-2 bg-white/40 backdrop-blur-xl border border-gray-200 rounded-full px-3 py-1.5"
            >
              {getIcon(tag.type)}
              <span className="text-[12px] text-[#101828]">{tag.title}</span>
              <button
                onClick={() => handleRemoveContext(tag)}
                className="size-4 rounded-full hover:bg-gray-200 flex items-center justify-center"
              >
                <X className="size-3 text-[#6a7282]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your classes..."
              className="w-full px-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#B882B1] transition-colors text-[14px]"
              disabled={isTyping}
            />
          </div>

          <button
            onClick={() => setShowContextMenu(!showContextMenu)}
            className="size-9 border border-gray-300 rounded-[8px] flex items-center justify-center hover:border-[#B882B1] transition-colors"
            disabled={isTyping}
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>

          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="size-9 bg-[#B882B1] hover:bg-[#a06e9d] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-[8px] flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-24 right-6 bg-white rounded-xl border border-gray-200 shadow-lg z-50 w-[320px]"
          >
            {/* Category Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setContextTab('classes')}
                className={`flex-1 px-4 py-3 text-[12px] flex items-center justify-center gap-2 ${
                  contextTab === 'classes'
                    ? 'bg-[#f3e8f4] text-[#B882B1] border-b-2 border-[#B882B1]'
                    : 'text-gray-500'
                }`}
              >
                <BookOpen className="size-4" />
                Classes
              </button>
              <button
                onClick={() => setContextTab('sessions')}
                className={`flex-1 px-4 py-3 text-[12px] flex items-center justify-center gap-2 ${
                  contextTab === 'sessions'
                    ? 'bg-[#E8F5E9] text-[#3FA11B] border-b-2 border-[#3FA11B]'
                    : 'text-gray-500'
                }`}
              >
                <Calendar className="size-4" />
                Sessions
              </button>
              <button
                onClick={() => setContextTab('assignments')}
                className={`flex-1 px-4 py-3 text-[12px] flex items-center justify-center gap-2 ${
                  contextTab === 'assignments'
                    ? 'bg-[#f3e8f4] text-[#B882B1] border-b-2 border-[#B882B1]'
                    : 'text-gray-500'
                }`}
              >
                <FileText className="size-4" />
                Assignments
              </button>
            </div>

            {/* List Items */}
            <div className="max-h-[200px] overflow-y-auto p-2">
              {contextTab === 'classes' && classes.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddContext({ ...item, type: 'class' as const })}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 flex items-center gap-3 group"
                >
                  <div className="size-8 rounded-lg flex items-center justify-center bg-[#f3e8f4]">
                    <BookOpen className="size-4 text-[#B882B1]" />
                  </div>
                  <span className="flex-1 text-[13px] text-[#101828] truncate">{item.title}</span>
                  <Plus className="size-4 text-[#6a7282] opacity-0 group-hover:opacity-100" />
                </button>
              ))}

              {contextTab === 'sessions' && sessions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddContext({ ...item, type: 'session' as const })}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 flex items-center gap-3 group"
                >
                  <div className="size-8 rounded-lg flex items-center justify-center bg-[#E8F5E9]">
                    <Calendar className="size-4 text-[#3FA11B]" />
                  </div>
                  <span className="flex-1 text-[13px] text-[#101828] truncate">{item.title}</span>
                  <Plus className="size-4 text-[#6a7282] opacity-0 group-hover:opacity-100" />
                </button>
              ))}

              {contextTab === 'assignments' && assignments.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddContext({ ...item, type: 'assignment' as const })}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 flex items-center gap-3 group"
                >
                  <div className="size-8 rounded-lg flex items-center justify-center bg-[#f3e8f4]">
                    <FileText className="size-4 text-[#B882B1]" />
                  </div>
                  <span className="flex-1 text-[13px] text-[#101828] truncate">{item.title}</span>
                  <Plus className="size-4 text-[#6a7282] opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TeacherDashboardChat;