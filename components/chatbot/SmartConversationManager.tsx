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

  // 智能响应生成器
  const generateIntelligentResponse = useCallback(async (userInput: string, context: any): Promise<string> => {
    const recognition = recognizeIntent(userInput, messages)

    // 如果没有当前工作流，开始新工作流
    if (!context.workflowType) {
      if (recognition.intent === 'unknown') {
        return recognition.suggestedResponse
      }

      // 初始化工作流
      const newState: ConversationState = {
        sessionId: context.sessionId,
        workflowType: recognition.workflowType,
        currentStep: 1,
        collectedData: {},
        status: 'active'
      }
      setConversationState(newState)

      const guidance = getWorkflowGuidance(recognition.workflowType)
      return `${guidance.welcome}\n\n${guidance.first_question}`
    }

    // 处理当前工作流的下一步
    return handleWorkflowProgress(userInput, context)
  }, [messages])

  // 工作流进度处理
  const handleWorkflowProgress = async (userInput: string, state: ConversationState): Promise<string> => {
    const { workflowType, currentStep } = state

    // 根据工作流类型和步骤生成响应
    if (workflowType === 'create_course') {
      return handleCourseCreationStep(userInput, currentStep, state)
    }

    // 其他工作流的处理逻辑
    return `感谢你的回答。我正在为你处理"${workflowType}"工作流的第${currentStep}步。`
  }

  // 课程创建步骤处理
  const handleCourseCreationStep = (userInput: string, step: number, state: ConversationState): string => {
    const stepPrompts = {
      1: "好的，我了解了课程主题。**您希望这门课程有多少节课？**\nA) 4节课\nB) 8节课\nC) 12节课\nD) 其他（请具体说明）",
      2: "很好！课程数量已确定。**您希望每周上几次课？**\nA) 每周一次\nB) 每周两次\nC) 每周三次\nD) 其他（请具体说明）",
      3: "好的，上课频率已确认。**您希望在哪几天上课？**（根据您选择的频率）",
      4: "很好！现在请告诉我**您希望课程什么时候开始？**（请提供具体日期，格式：YYYY-MM-DD）",
      5: "好的，开始日期已确定。**您希望每节课在什么时间进行？**\nA) 上午 (9:00 AM)\nB) 下午 (2:00 PM)\nC) 晚上 (6:00 PM)\nD) 其他（请具体说明）",
      6: "好的，上课时间已确认。**您希望每节课多长时间？**\nA) 45分钟\nB) 90分钟\nC) 120分钟\nD) 其他（请具体说明）",
      7: "很好！现在请为每个课程节次提供简要的主题或内容概要。我将为每个节次生成一个详细的大纲。\n\n请按顺序列出每节课的主题：",
      8: "太棒了！我已经收集到了所有必要信息。正在为你生成完整的课程大纲...\n\n📋 课程创建完成！\n\n你可以选择：\n1. 查看生成的课程大纲\n2. 开始创建具体的课程节次\n3. 创建相关作业\n4. 开始新的课程"
    }

    if (step < 8) {
      return stepPrompts[step as keyof typeof stepPrompts] || "请继续回答问题。"
    } else {
      return stepPrompts[8]
    }
  }

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
    setInputValue('')
    setIsLoading(true)

    try {
      // 生成智能响应
      const response = await generateIntelligentResponse(inputValue, {
        sessionId,
        workflowType: conversationState?.workflowType,
        currentStep: conversationState?.currentStep
      })

      // 模拟AI处理延迟
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          workflowType: conversationState?.workflowType
        }

        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
      }, 1500)

    } catch (error) {
      console.error('Error sending message:', error)
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
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
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