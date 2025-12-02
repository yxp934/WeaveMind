'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SCHEDULE_INITIAL_MESSAGE } from '@/lib/ai/prompts'
import { Loader2, Send, Calendar, CheckCircle } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ScheduleChatProps {
  entityId: string
  entityType?: 'course' | 'class'
  apiEndpoint?: string
  onScheduleGenerated?: () => void
}

export function ScheduleChat({
  entityId,
  entityType = 'course',
  apiEndpoint = '/api/ai/generate-schedule',
  onScheduleGenerated
}: ScheduleChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', role: 'assistant', content: SCHEDULE_INITIAL_MESSAGE }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [canGenerate, setCanGenerate] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSessions, setGeneratedSessions] = useState<any[]>([])
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check if last message contains the ready marker or is asking for confirmation
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant') {
      // Check if message contains confirmation request
      if (lastMessage.content.includes('Please confirm') && !lastMessage.content.includes('[SCHEDULE_READY]')) {
        setWaitingForConfirmation(true)
        setCanGenerate(false)
      }
      // Check if message contains the ready marker (after confirmation)
      if (lastMessage.content.includes('[SCHEDULE_READY]')) {
        setCanGenerate(true)
        setWaitingForConfirmation(false)
      }
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/schedule-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content.replace('[SCHEDULE_READY]', '')
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      const assistantMessageId = (Date.now() + 1).toString()

      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          assistantMessage += chunk
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId ? { ...m, content: assistantMessage } : m
          ))
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，发生了错误。请重试。 / Sorry, an error occurred. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateSchedule = async () => {
    setIsGenerating(true)
    try {
      // Extract requirements from conversation
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n')

      const requestBody = entityType === 'class'
        ? {
            classId: entityId,
            requirements: { courseOverview: conversationText, totalClasses: 10, frequency: 'twice a week', startDate: new Date().toISOString().split('T')[0] }
          }
        : {
            courseId: entityId,
            requirements: { courseOverview: conversationText, totalClasses: 10, frequency: 'twice a week', startDate: new Date().toISOString().split('T')[0] }
          }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate schedule')
      }

      const data = await response.json()
      setGeneratedSessions(data.sessions)
      if (onScheduleGenerated) {
        onScheduleGenerated()
      }
    } catch (error: any) {
      console.error('Schedule generation error:', error)
      alert(`生成失败: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          AI 课程日程助手 / AI Schedule Assistant
        </CardTitle>
        <p className="text-sm text-gray-600">
          与AI对话，描述你的课程日程需求 / Chat with AI to describe your schedule requirements
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg mb-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200'}`}>
                <p className="text-sm whitespace-pre-wrap">{message.content.replace('[SCHEDULE_READY]', '')}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入你的课程日程需求..." disabled={isLoading || isGenerating} onKeyPress={(e) => e.key === 'Enter' && handleSend()} className="flex-1" />
          <Button onClick={handleSend} disabled={isLoading || !input.trim() || isGenerating}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {waitingForConfirmation && !isGenerating && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">等待确认 / Waiting for Confirmation</span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              AI已经收集了课程信息并生成了摘要。请在上方确认信息是否准确和完整，然后回复&quot;确认&quot;或&quot;confirm&quot;以继续。/ AI has collected course information and created a summary. Please confirm above if the information is accurate and complete, then reply &quot;确认&quot; or &quot;confirm&quot; to proceed.
            </p>
            <div className="text-xs text-yellow-600">
              💡 提示: 直接回复&quot;确认&quot;、&quot;好的&quot;、&quot;Yes&quot;或&quot;Confirm&quot;即可 / Simply reply &quot;确认&quot;, &quot;好的&quot;, &quot;Yes&quot;, or &quot;Confirm&quot;
            </div>
          </div>
        )}

        {canGenerate && !isGenerating && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">信息收集完成！Ready to generate!</span>
            </div>
            <Button onClick={handleGenerateSchedule} disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-700">
              生成课程日程 / Generate Schedule
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div className="text-center">
                <p className="font-semibold text-blue-900 mb-1">
                  正在生成课程日程... / Generating Schedule...
                </p>
                <p className="text-sm text-blue-700">
                  正在创建课时安排，请稍候 / Creating sessions, please wait...
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

