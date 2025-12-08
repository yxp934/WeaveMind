'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIChatbot from './AIChatbot';

export function AIChatbotDemo() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotRole, setChatbotRole] = useState<'teacher' | 'student' | 'self-learner'>('teacher');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-lg mb-6"
          >
            <Bot className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">AI Chatbot 工作流工具</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            WeaveMind AI 助手系统
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            智能的AI驱动的学习管理系统，提供课程生成、工作流工具、进度跟踪等全方位功能
          </motion.p>
        </div>

        {/* 功能展示 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          <Card className="p-6 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900 mb-2">AI 聊天助手</h3>
            <p className="text-sm text-gray-600">
              智能对话，支持多种角色和上下文理解
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h3 className="font-semibold text-gray-900 mb-2">工作流工具</h3>
            <p className="text-sm text-gray-600">
              大纲生成、A2A会话、内容编辑等工具集成
            </p>
          </Card>

          <Card className="p-6 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-purple-600" />
            <h3 className="font-semibold text-gray-900 mb-2">进度跟踪</h3>
            <p className="text-sm text-gray-600">
              实时显示工作流进度和迭代状态
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Bot className="w-12 h-12 mx-auto mb-4 text-orange-600" />
            <h3 className="font-semibold text-gray-900 mb-2">智能优化</h3>
            <p className="text-sm text-gray-600">
              Agent-to-Agent内容优化和质量提升
            </p>
          </Card>
        </motion.div>

        {/* 角色切换和功能演示 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-xl p-8 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">功能演示</h2>
            <div className="flex space-x-2">
              <Button
                variant={chatbotRole === 'teacher' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChatbotRole('teacher')}
              >
                教师模式
              </Button>
              <Button
                variant={chatbotRole === 'student' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChatbotRole('student')}
              >
                学生模式
              </Button>
              <Button
                variant={chatbotRole === 'self-learner' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChatbotRole('self-learner')}
              >
                自学模式
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">系统概览</TabsTrigger>
              <TabsTrigger value="features">核心功能</TabsTrigger>
              <TabsTrigger value="workflow">工作流程</TabsTrigger>
              <TabsTrigger value="demo">在线演示</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">AI Chatbot 工作流工具系统</h3>
                <p className="text-gray-600">
                  这是一个完整的AI驱动的聊天机器人系统，集成多种工作流工具，为教师和学生提供智能化的学习管理体验。
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">核心组件</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>AIChatbot - 主聊天界面</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>WorkflowToolPanel - 工作流工具面板</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>ProgressTracker - 进度跟踪组件</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>OutlineGenerator - 大纲生成器</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>A2ASessionGenerator - A2A会话生成器</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">技术特性</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span>Zustand 状态管理</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        <span>TypeScript 类型安全</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span>Framer Motion 动画</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                        <span>Tailwind CSS 样式</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                        <span>响应式设计</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">核心功能特性</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                      智能聊天界面
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 多角色支持（教师/学生/自学者）</li>
                      <li>• 实时流式响应</li>
                      <li>• 消息历史管理</li>
                      <li>• 快捷操作按钮</li>
                      <li>• 错误处理和恢复</li>
                    </ul>
                  </Card>

                  <Card className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-green-600" />
                      工作流工具集成
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 课程大纲自动生成</li>
                      <li>• A2A内容优化会话</li>
                      <li>• 智能工具推荐</li>
                      <li>• 工具调用状态跟踪</li>
                      <li>• 分类工具管理</li>
                    </ul>
                  </Card>

                  <Card className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
                      进度可视化
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 实时进度条显示</li>
                      <li>• 步骤状态跟踪</li>
                      <li>• A2A迭代可视化</li>
                      <li>• 时间统计和分析</li>
                      <li>• 完成状态反馈</li>
                    </ul>
                  </Card>

                  <Card className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Bot className="w-5 h-5 mr-2 text-orange-600" />
                      AI 工具生态
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 15+ 专业AI工具</li>
                      <li>• 工具分类和筛选</li>
                      <li>• 上下文感知调用</li>
                      <li>• 工具结果展示</li>
                      <li>• 错误处理机制</li>
                    </ul>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="workflow" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">工作流程演示</h3>

                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">启动AI助手</h4>
                      <p className="text-sm text-gray-600">点击右下角的AI助手图标，启动智能对话界面</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-green-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">选择工作流工具</h4>
                      <p className="text-sm text-gray-600">点击工具按钮，浏览和选择适合的AI工具</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-purple-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">配置参数</h4>
                      <p className="text-sm text-gray-600">填写必要信息，设置工作流参数和选项</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-orange-600">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">监控进度</h4>
                      <p className="text-sm text-gray-600">实时查看工作流进度，监控A2A迭代过程</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-red-600">5</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">获取结果</h4>
                      <p className="text-sm text-gray-600">查看生成结果，进行编辑和优化</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="demo" className="mt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  开始体验AI助手
                </h3>
                <p className="text-gray-600 mb-6">
                  当前模式: <span className="font-medium">
                    {chatbotRole === 'teacher' ? '教师助手' :
                     chatbotRole === 'student' ? '学生助手' : '自学者助手'}
                  </span>
                </p>

                <Button
                  onClick={() => setIsChatbotOpen(true)}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Bot className="w-5 h-5 mr-2" />
                  打开AI助手
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* AI助手浮窗 */}
        {isChatbotOpen && (
          <AIChatbot
            userRole={chatbotRole}
            classId="demo-class-123"
            courseId="demo-course-456"
            onMinimize={() => setIsChatbotOpen(false)}
            className="fixed bottom-4 right-4 z-50"
          />
        )}
      </div>
    </div>
  );
}

export default AIChatbotDemo;