'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { recognizeIntent, getWorkflowGuidance } from '@/lib/prompt-engineering/intent-recognition'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  workflowType?: string
  isLoading?: boolean
}

interface ChatbotProps {
  className?: string
}

export default function Chatbot({ className = '' }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是WeaveMind的AI助手。我可以帮你：\n\n• 创建完整的课程\n• 生成课程大纲\n• 创建作业（测验/写作/研究）\n• 优化课程内容\n• 生成教学内容\n\n请告诉我你想要做什么，我会引导你完成整个流程！',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentWorkflow, setCurrentWorkflow] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // 意图识别
      const recognition = recognizeIntent(inputValue, messages)

      let response = ''
      let workflowType = ''

      if (recognition.intent === 'unknown') {
        response = recognition.suggestedResponse
      } else {
        workflowType = recognition.workflowType
        setCurrentWorkflow(workflowType)

        // 获取工作流引导
        const guidance = getWorkflowGuidance(workflowType)
        response = guidance.welcome

        // 如果是创建课程，开始第一步询问
        if (workflowType === 'create_course') {
          response += '\n\n' + guidance.first_question
        }
      }

      // 模拟AI回复延迟
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          workflowType
        }

        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
      }, 1000)

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，出现了一些错误。请稍后再试。',
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
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div className={`flex flex-col h-[600px] border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">WeaveMind AI助手</h3>
          <p className="text-sm text-gray-500">我来帮你完成教育工作</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-green-600" />
              </div>
            )}

            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在思考...</span>
                </div>
              ) : (
                <div className="text-sm leading-relaxed">
                  {formatMessage(message.content)}
                </div>
              )}

              {message.workflowType && (
                <div className="mt-2 text-xs opacity-75">
                  当前工作流: {message.workflowType}
                </div>
              )}

              <div className="text-xs opacity-50 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-green-600" />
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                <span className="text-sm">正在处理你的请求...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的需求，例如：'我想要创建一个Python编程课程'"
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          提示：你可以直接说“创建课程”、“生成大纲”、“创建作业”等，我会引导你完成整个流程
        </div>
      </div>
    </div>
  )
}
