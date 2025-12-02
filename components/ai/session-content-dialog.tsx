'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, BookOpen, CheckCircle, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { A2ARefinementVisualizer } from './a2a-refinement-visualizer'

interface SessionContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: {
    id: string
    session_number: number
    title: string
    description: string | null
    scheduled_date: string
  }
  classId: string
  className: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ScheduleContext {
  class_topic: string | null
  target_audience: string | null
  learning_goals: string | null
  teaching_method: string | null
  total_sessions: number | null
  session_details: Array<{
    session_number: number
    title: string
    topic: string | null
    overview: string | null
  }> | null
}

export function SessionContentDialog({
  open,
  onOpenChange,
  session,
  classId,
  className
}: SessionContentDialogProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')
  const [scheduleContext, setScheduleContext] = useState<ScheduleContext | null>(null)
  const [outlineConfirmed, setOutlineConfirmed] = useState(false)

  // A2A State
  const [a2aActive, setA2aActive] = useState(false)
  const [a2aCurrentIteration, setA2aCurrentIteration] = useState(0)
  const [a2aTotalIterations, setA2aTotalIterations] = useState(3)
  const [a2aCurrentAgent, setA2aCurrentAgent] = useState<'teacher' | 'student' | null>(null)
  const [a2aCurrentActivity, setA2aCurrentActivity] = useState('')
  const [a2aIterations, setA2aIterations] = useState<any[]>([])
  const [a2aFinalComponents, setA2aFinalComponents] = useState<any[]>([])
  const [classDescription, setClassDescription] = useState('')

  // Build initial message based on schedule context
  const buildInitialMessage = (ctx: ScheduleContext | null) => {
    const sessionDetail = ctx?.session_details?.find(
      s => s.session_number === session.session_number
    )

    if (ctx && sessionDetail) {
      return `你好！我将帮助你为 Session ${session.session_number} 规划和生成学习内容。

**已收集的课程信息：**
- 课程主题：${ctx.class_topic || className}
- 目标受众：${ctx.target_audience || '未指定'}
- 学习目标：${ctx.learning_goals || '未指定'}
- 教学方式：${ctx.teaching_method || '标准方式'}

**本节课信息：**
- 标题：${sessionDetail.title}
- 主题：${sessionDetail.topic || '待定'}
- 概述：${sessionDetail.overview || '待定'}
- 日期：${new Date(session.scheduled_date).toLocaleDateString()}

基于以上信息，我来为你规划本节课的大纲。请稍等...

---
Hello! I'll help you plan and generate learning content for Session ${session.session_number}.

**Collected Course Information:**
- Course Topic: ${ctx.class_topic || className}
- Target Audience: ${ctx.target_audience || 'Not specified'}
- Learning Goals: ${ctx.learning_goals || 'Not specified'}
- Teaching Method: ${ctx.teaching_method || 'Standard approach'}

**This Session Info:**
- Title: ${sessionDetail.title}
- Topic: ${sessionDetail.topic || 'To be defined'}
- Overview: ${sessionDetail.overview || 'To be defined'}
- Date: ${new Date(session.scheduled_date).toLocaleDateString()}

Based on this information, let me plan the outline for this session. Please wait...`
    }

    return `你好！我将帮助你为 Session ${session.session_number} 生成详细的学习内容。

**Session 信息：**
- 标题：${session.title}
${session.description ? `- 描述：${session.description}` : ''}
- 日期：${new Date(session.scheduled_date).toLocaleDateString()}

请告诉我你想在这节课中涵盖哪些具体内容、学习目标和练习类型。

---
Hello! I'll help you generate detailed learning content for Session ${session.session_number}.

**Session Information:**
- Title: ${session.title}
${session.description ? `- Description: ${session.description}` : ''}
- Date: ${new Date(session.scheduled_date).toLocaleDateString()}

Please tell me what specific content, learning objectives, and practice types you want to cover in this session.`
  }

  const [messages, setMessages] = useState<Message[]>([])

  // Fetch schedule context and class description on mount
  useEffect(() => {
    const fetchContext = async () => {
      if (!open || !classId) return

      try {
        // Fetch class description
        const classResponse = await fetch(`/api/classes/${classId}`)
        if (classResponse.ok) {
          const data = await classResponse.json()
          setClassDescription(data.description || '')
        }

        // Fetch schedule context
        const contextResponse = await fetch(`/api/classes/${classId}/schedule-context`)
        if (contextResponse.ok) {
          const ctx = await contextResponse.json()
          setScheduleContext(ctx)

          // Set initial message with context
          setMessages([{
            id: 'initial',
            role: 'assistant',
            content: buildInitialMessage(ctx)
          }])

          // If context exists, automatically trigger outline generation
          if (ctx) {
            triggerOutlineGeneration(ctx)
          }
        } else {
          // No context, use default message
          setMessages([{
            id: 'initial',
            role: 'assistant',
            content: buildInitialMessage(null)
          }])
        }
      } catch (error) {
        console.error('Failed to fetch context:', error)
        setMessages([{
          id: 'initial',
          role: 'assistant',
          content: buildInitialMessage(null)
        }])
      }
    }

    fetchContext()
  }, [open, classId, session])

  // Trigger outline generation when context is available
  const triggerOutlineGeneration = async (ctx: ScheduleContext) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/session-content-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: '请根据已收集的信息为这节课生成一个详细的大纲，包括学习目标、内容板块和练习类型。'
          }],
          sessionId: session.id,
          classId
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      const assistantMessageId = Date.now().toString()
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: ''
      }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          assistantMessage += chunk

          // Check for confirmation marker
          if (assistantMessage.includes('[OUTLINE_CONFIRMED]')) {
            setOutlineConfirmed(true)
          }

          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: assistantMessage.replace('[OUTLINE_CONFIRMED]', '') }
              : m
          ))
        }
      }
    } catch (error) {
      console.error('Outline generation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check for outline confirmation in messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant' && lastMessage.content.includes('[OUTLINE_CONFIRMED]')) {
      setOutlineConfirmed(true)
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/session-content-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content.replace('[OUTLINE_CONFIRMED]', '')
          })),
          sessionId: session.id,
          classId
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      const assistantMessageId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: ''
      }])

      if (!reader) {
        throw new Error('No reader available')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        assistantMessage += chunk

        // Check for confirmation marker
        if (assistantMessage.includes('[OUTLINE_CONFIRMED]')) {
          setOutlineConfirmed(true)
        }

        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: assistantMessage.replace('[OUTLINE_CONFIRMED]', '') }
            : m
        ))
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateContent = async () => {
    setIsGenerating(true)
    setA2aActive(true)
    setA2aIterations([])
    setA2aFinalComponents([])

    try {
      const response = await fetch('/api/ai/generate-session-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          classId,
          className,
          classDescription,
          sessionTitle: session.title,
          sessionDescription: session.description,
          conversationContext: messages.map(m => `${m.role}: ${m.content.replace('[OUTLINE_CONFIRMED]', '')}`).join('\n'),
          scheduleContext: scheduleContext
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let currentIterationData: any = {}

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const event = JSON.parse(line)

            switch (event.type) {
              case 'iteration_start':
                setA2aCurrentIteration(event.iteration)
                setA2aTotalIterations(event.total)
                currentIterationData = { iteration: event.iteration }
                break

              case 'agent_activity':
                setA2aCurrentAgent(event.agent)
                setA2aCurrentActivity(event.activity)
                break

              case 'teacher_content':
                currentIterationData.teacherContent = event.components
                currentIterationData.teacherRawResponse = event.rawResponse
                break

              case 'student_feedback':
                currentIterationData.studentFeedback = event.feedback
                currentIterationData.studentRawResponse = event.rawResponse
                break

              case 'iteration_complete':
                setA2aIterations(prev => [...prev, currentIterationData])
                setA2aCurrentAgent(null)
                setA2aCurrentActivity('')
                currentIterationData = {}
                break

              case 'a2a_complete':
                setA2aFinalComponents(event.finalComponents)
                setA2aActive(false)

                // Save the final components to database
                const saveResponse = await fetch('/api/ai/save-session-content', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: session.id,
                    classId,
                    sessionTitle: session.title,
                    sessionDescription: session.description,
                    components: event.finalComponents
                  })
                })

                if (!saveResponse.ok) {
                  throw new Error('Failed to save content')
                }

                // Keep dialog open for 5 seconds to show final results
                setTimeout(() => {
                  onOpenChange(false)
                  router.refresh()
                }, 5000)
                break

              case 'error':
                throw new Error(event.error)
            }
          } catch (parseError) {
            console.error('Failed to parse event:', parseError)
          }
        }
      }
    } catch (error) {
      console.error('Content generation error:', error)
      alert('Failed to generate content. Please try again.')
      setA2aActive(false)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Generate Content for Session {session.session_number}
          </DialogTitle>
          <DialogDescription>
            {outlineConfirmed
              ? 'Outline confirmed! Ready to generate content with A2A refinement.'
              : 'Review and confirm the session outline, then generate content'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Schedule Context Banner */}
          {scheduleContext && !a2aActive && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800 text-sm">
                  使用已收集的课程信息 / Using collected course information
                </span>
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>目标受众: {scheduleContext.target_audience || '未指定'}</div>
                <div>教学方式: {scheduleContext.teaching_method || '未指定'}</div>
              </div>
            </div>
          )}

          {/* A2A Refinement Visualizer */}
          {(a2aActive || a2aIterations.length > 0) && (
            <A2ARefinementVisualizer
              isActive={a2aActive}
              currentIteration={a2aCurrentIteration}
              totalIterations={a2aTotalIterations}
              currentAgent={a2aCurrentAgent}
              currentActivity={a2aCurrentActivity}
              iterations={a2aIterations}
            />
          )}

          {/* Chat Messages - Hide during A2A */}
          {!a2aActive && (
            <>
              <div className="h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200'}`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content.replace('[OUTLINE_CONFIRMED]', '')}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="描述你想要的修改... / Describe your modifications..."
                  disabled={isLoading || isGenerating}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !input.trim() || isGenerating}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>

              {/* Confirmation Status */}
              {outlineConfirmed && !isGenerating && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      大纲已确认！/ Outline Confirmed!
                    </span>
                  </div>
                  <p className="text-sm text-green-700">
                    点击下方按钮开始生成内容。AI将使用双代理系统反复优化内容质量。
                    <br />
                    Click the button below to start content generation. AI will use a dual-agent system to iteratively refine content quality.
                  </p>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateContent}
                  disabled={isGenerating || !outlineConfirmed}
                  className={outlineConfirmed ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating with A2A Refinement...
                    </>
                  ) : outlineConfirmed ? (
                    'Generate Content with A2A'
                  ) : (
                    'Confirm Outline First'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
