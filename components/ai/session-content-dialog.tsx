'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export function SessionContentDialog({
  open,
  onOpenChange,
  session,
  classId,
  className
}: SessionContentDialogProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: `你好！我将帮助你为 Session ${session.session_number} 生成详细的学习内容。

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
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSend = async () => {
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
      // TODO: Implement AI chat for session content requirements
      // For now, just echo back
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `收到！我了解你想要：${input}\n\n请继续描述更多细节，或者如果准备好了，点击"生成内容"按钮。`
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateContent = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-session-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          classId,
          className,
          sessionTitle: session.title,
          sessionDescription: session.description,
          conversationContext: messages.map(m => `${m.role}: ${m.content}`).join('\n')
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      
      // Close dialog and refresh page
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Content generation error:', error)
      alert('Failed to generate content. Please try again.')
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
            Chat with AI to define the learning content for this session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chat Messages */}
          <div className="h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200'}`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="描述你想要的学习内容... / Describe the learning content you want..."
              disabled={isLoading || isGenerating}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim() || isGenerating}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerateContent} disabled={isGenerating || messages.length < 3}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                'Generate Content'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

