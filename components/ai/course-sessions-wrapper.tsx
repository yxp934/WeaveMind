'use client'

import { useRouter } from 'next/navigation'
import { CourseSessionsList } from './course-sessions-list'

interface CourseSession {
  id: string
  session_number: number
  title: string
  description: string | null
  scheduled_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  content_generated: boolean
  chapter_id: string | null
}

interface CourseSessionsWrapperProps {
  sessions: CourseSession[]
  courseId: string
}

export function CourseSessionsWrapper({ sessions, courseId }: CourseSessionsWrapperProps) {
  const router = useRouter()

  const handleGenerateContent = async (sessionId: string) => {
    try {
      // Find the session
      const session = sessions.find(s => s.id === sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      // Generate content for this session using the existing AI generation workflow
      const response = await fetch('/api/ai/generate-session-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          sessionId,
          sessionTitle: session.title,
          sessionDescription: session.description
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate content')
      }

      // Refresh the page to show updated session status
      router.refresh()
    } catch (error: any) {
      console.error('Content generation error:', error)
      alert(`内容生成失败: ${error.message}`)
    }
  }

  return (
    <CourseSessionsList 
      sessions={sessions} 
      courseId={courseId}
      onGenerateContent={handleGenerateContent}
    />
  )
}

