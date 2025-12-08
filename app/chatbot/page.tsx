import SmartConversationManager from '@/components/chatbot/SmartConversationManager'
import { ArrowLeft, MessageCircle, Zap, Target, BookOpen, FileText } from 'lucide-react'
import Link from 'next/link'

export default function ChatbotPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                返回首页
              </Link>
              <div className="w-px h-6 bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">智能AI助手</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>AI驱动的工作流助手</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                与AI助手对话
              </h2>
              <p className="text-gray-600">
                告诉我你想要做什么，我会智能识别你的意图并引导你完成整个流程
              </p>
            </div>
            <SmartConversationManager className="w-full" />
          </div>

          {/* Features Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                快速开始
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-medium text-green-800 mb-1">🎯 创建课程</div>
                  <div className="text-sm text-green-700">
                    8步引导式流程，完整规划你的课程
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-medium text-blue-800 mb-1">📋 生成大纲</div>
                  <div className="text-sm text-blue-700">
                    基于主题和节数自动生成详细大纲
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="font-medium text-purple-800 mb-1">📝 创建作业</div>
                  <div className="text-sm text-purple-700">
                    测验、写作、研究三种类型作业
                  </div>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                AI能力
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900">智能意图识别</div>
                    <div className="text-sm text-gray-600">
                      自动理解你的真实需求
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900">引导式流程</div>
                    <div className="text-sm text-gray-600">
                      步骤化指导，确保完成任务
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900">上下文理解</div>
                    <div className="text-sm text-gray-600">
                      记住对话历史，提供连贯体验
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900">实时工具调用</div>
                    <div className="text-sm text-gray-600">
                      直接执行各种教育工具
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                示例对话
              </h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-700 mb-1">用户：</div>
                  <div className="text-gray-600">"我想创建一个Python编程课程"</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-medium text-green-700 mb-1">AI助手：</div>
                  <div className="text-green-600">
                    "好的！我来帮你创建Python编程课程。让我们开始第一步..."
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold">系统状态</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span>AI模型已连接</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span>数据库已就绪</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span>工作流系统正常</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}