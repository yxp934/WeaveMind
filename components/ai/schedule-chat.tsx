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
  courseId: string
  onScheduleGenerated: () => void
}

export function ScheduleChat({ courseId, onScheduleGenerated }: ScheduleChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', role: 'assistant', content: SCHEDULE_INITIAL_MESSAGE }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [canGenerate, setCanGenerate] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSessions, setGeneratedSessions] = useState<any[]>([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check if last message contains the ready marker
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant' && lastMessage.content.includes('[SCHEDULE_READY]')) {
      setCanGenerate(true)
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
      
      const response = await fetch('/api/ai/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          requirements: { courseOverview: conversationText, totalClasses: 10, frequency: 'twice a week', startDate: new Date().toISOString().split('T')[0] }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate schedule')
      }

      const data = await response.json()
      setGeneratedSessions(data.sessions)
      onScheduleGenerated()
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

        {canGenerate && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">信息收集完成！Ready to generate!</span>
            </div>
            <Button onClick={handleGenerateSchedule} disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-700">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />生成中...</> : '生成课程日程 / Generate Schedule'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

