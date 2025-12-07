'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface TeacherDashboardChatProps {
  classes: Array<{ id: number; title: string }>;
  sessions: Array<{ id: number; title: string }>;
  assignments: Array<{ id: number; title: string }>;
}

export function TeacherDashboardChat({ classes, sessions, assignments }: TeacherDashboardChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // 模拟AI响应
  const generateMockResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('jimmy') || lowerMessage.includes('progress')) {
      return "Jimmy is making excellent progress! He has completed 85% of his assignments and shows strong understanding of the material. I've noticed he's particularly engaged with the interactive components.";
    }

    if (lowerMessage.includes('schedule') || lowerMessage.includes('machine learning')) {
      return "I've created a comprehensive schedule for your Machine Learning class. Here's what I suggest:\n\nWeek 1-2: Introduction to ML concepts\nWeek 3-4: Supervised learning algorithms\nWeek 5-6: Unsupervised learning techniques\n\nWould you like me to add specific assignments and dates?";
    }

    if (lowerMessage.includes('assignment') || lowerMessage.includes('due')) {
      return "Here are your assignments due this week:\n\n• Database Design Quiz - Due Wednesday\n• Final Project Draft - Due Friday\n• Peer Review Session - Due Sunday\n\nI recommend sending reminders to students who haven't submitted yet.";
    }

    if (lowerMessage.includes('performance') || lowerMessage.includes('overall')) {
      return "Your overall performance metrics:\n\n📊 Class completion rate: 78%\n📈 Average assignment score: 82%\n👥 Student engagement: High\n⚡ Response time: < 24 hours\n\nYou're doing great! Your students are showing strong progress.";
    }

    return "I'm here to help you manage your classes and improve student outcomes. You can ask me about student progress, assignment status, class schedules, or any other teaching-related questions. What would you like to know?";
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // 模拟AI响应延迟
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateMockResponse(inputValue),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  // 建议点击处理
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  // 键盘事件处理
  const handleKeyPress = (e: React.KeyboardEvent) => {
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
                    <p className="text-[11px] text-[#6a7282] mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* Input Area */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your classes..."
              className="w-full px-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#B882B1] transition-colors text-[14px]"
              disabled={isTyping}
            />
          </div>

          <button
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
    </div>
  );
}

export default TeacherDashboardChat;