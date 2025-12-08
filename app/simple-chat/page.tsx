'use client';

import React from 'react';
import AIChatbot from '@/components/chatbot/AIChatbot';

export default function SimpleChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            WeaveMind AI 助手
          </h1>
          <p className="text-gray-600">
            智能聊天助手，支持课程生成、工作流工具等功能
          </p>
        </div>
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <AIChatbot />
          </div>
        </div>
      </div>
    </div>
  );
}