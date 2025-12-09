'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { recognizeIntent, getWorkflowGuidance } from '@/lib/prompt-engineering/intent-recognition'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  workflowType?: string
  isLoading?: boolean
  toolCalls?: ToolCall[]
}

interface ToolCall {
  id: string
  name: string
  parameters: any
  result?: any
  status: 'pending' | 'running' | 'completed' | 'failed'
  timestamp: string
}

interface ConversationState {
  sessionId: string
  workflowType: string
  currentStep: number
  collectedData: Record<string, any>
  status: 'active' | 'completed' | 'paused' | 'error'
}

interface SmartConversationManagerProps {
  className?: string
}

export default function SmartConversationManager({ className = '' }: SmartConversationManagerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是WeaveMind的智能AI助手。我可以帮你完成教育工作：\n\n• 🎯 创建完整课程（8步引导式流程）\n• 📋 生成课程大纲\n• 📝 创建作业（测验/写作/研究）\n• 🔄 A2A内容优化\n• 📚 生成教学内容\n\n请告诉我你想要做什么，我会智能识别你的意图并引导你完成整个流程！',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationState, setConversationState] = useState<ConversationState | null>(null)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 发送消息到后端API
  const sendMessageToAPI = useCallback(async (userInput: string) => {
    try {
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
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        return {
          message: data.data.message,
          metadata: data.data.metadata || {},
          toolsUsed: data.data.toolsUsed || []
        }
      } else {
        throw new Error(data.error?.message || 'API returned error')
      }
    } catch (error) {
      console.error('API Error:', error)
      // 返回友好的错误消息
      return {
        message: '抱歉，AI服务暂时不可用。请稍后再试，或者告诉我你想要重新开始。',
        metadata: { error: true },
        toolsUsed: []
      }
    }
  }, [messages, sessionId])

  // 发送消息处理
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    try {
      console.log('🤖 发送消息到API:', currentInput)
      // 调用后端API
      const apiResponse = await sendMessageToAPI(currentInput)
      console.log('📡 API响应:', apiResponse)

      // 验证API响应
      if (!apiResponse || !apiResponse.message) {
        throw new Error('无效的API响应')
      }

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
      }

      console.log('💬 创建助手消息:', assistantMessage)
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)

      // 更新对话状态（如果API返回了工作流信息）
      if (apiResponse.metadata?.workflowType) {
        setConversationState({
          sessionId,
          workflowType: apiResponse.metadata.workflowType,
          currentStep: apiResponse.metadata.currentStep || 1,
          collectedData: {},
          status: 'active'
        })
        console.log('🔄 更新工作流状态:', apiResponse.metadata.workflowType)
      }

    } catch (error) {
      console.error('❌ 发送消息错误:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，出现了一些错误。请稍后再试，或者告诉我你想要重新开始。',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatMessage = (content: string) => {
    // 验证内容
    if (!content || typeof content !== 'string') {
      console.warn('⚠️ 消息内容无效:', content)
      return <span className="text-red-500">消息内容为空或无效</span>
    }

    // 检查是否是Next.js代码
    if (content.includes('self.__next_f') || content.includes('__NEXT_DATA__')) {
      console.error('❌ 检测到Next.js代码:', content.substring(0, 100))
      return (
        <div className="text-red-500 bg-red-50 p-2 rounded border">
          ⚠️ 系统响应异常，请刷新页面重试
        </div>
      )
    }

    try {
      return content.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          <span>{line}</span>
          {index < content.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))
    } catch (error) {
      console.error('❌ 格式化消息时出错:', error)
      return <span className="text-red-500">消息格式化错误</span>
    }
  }

  const resetConversation = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '对话已重置！我准备好帮助你完成新的任务。请告诉我你想要做什么：\n\n• 创建课程\n• 生成大纲\n• 创建作业\n• 其他需求',
        timestamp: new Date()
      }
    ])
    setConversationState(null)
  }

  return (
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
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          重新开始
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[85%] p-4 rounded-lg shadow-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>正在智能处理你的请求...</span>
                </div>
              ) : (
                <div className="text-sm leading-relaxed">
                  {formatMessage(message.content)}
                </div>
              )}

              {message.workflowType && (
                <div className="mt-3 flex items-center gap-2 text-xs opacity-75">
                  <CheckCircle className="w-3 h-3" />
                  <span>工作流: {message.workflowType}</span>
                </div>
              )}

              <div className="text-xs opacity-50 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                <span className="text-sm">正在使用AI分析你的需求并生成智能回复...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex gap-3">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的需求，例如：'我想要创建一个Python编程课程' 或 '生成数学课程的大纲'"
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          💡 智能提示：你可以直接说"创建课程"、"生成大纲"、"创建作业"等，我会智能识别你的意图并引导完成整个流程
        </div>
      </div>
    </div>
  )
}