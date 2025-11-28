'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, BookOpen, Loader2, CheckCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'

interface ClassSessionsWrapperProps {
  sessions: any[]
  classId: string
}

export function ClassSessionsWrapper({ sessions, classId }: ClassSessionsWrapperProps) {
  const router = useRouter()
  const [generatingContent, setGeneratingContent] = useState<string | null>(null)

  const handleGenerateContent = async (sessionId: string, sessionTitle: string, sessionDescription: string) => {
    setGeneratingContent(sessionId)
    try {
      const response = await fetch('/api/ai/generate-session-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          sessionId,
          sessionTitle,
          sessionDescription
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate content')
      }

      const data = await response.json()
      
      // Refresh the page to show updated session
      router.refresh()
      
      // Navigate to the generated chapter
      if (data.chapter_id) {
        router.push(`/teacher/chapters/${data.chapter_id}`)
      }
    } catch (error) {
      console.error('Content generation error:', error)
      alert('Failed to generate content. Please try again.')
    } finally {
      setGeneratingContent(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          📚 Class Sessions
        </h3>
        <p className="text-sm text-gray-600">
          {sessions.length} sessions scheduled. Click &quot;Generate Content&quot; to create lesson materials for each session.
        </p>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => (
          <Card key={session.id} className="border-l-4 border-l-indigo-500">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{session.title}</CardTitle>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(parseISO(session.scheduled_date), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                        {session.duration_minutes && ` (${session.duration_minutes} min)`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  {session.content_generated ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">
                      <CheckCircle className="h-4 w-4" />
                      Content Ready
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                      Upcoming
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{session.description}</p>
              <div className="flex gap-2">
                {session.content_generated && session.chapter_id ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/teacher/chapters/${session.chapter_id}`)}
                    className="inline-flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    View Content
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleGenerateContent(session.id, session.title, session.description)}
                    disabled={generatingContent === session.id}
                    className="inline-flex items-center gap-2"
                  >
                    {generatingContent === session.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4" />
                        Generate Content
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

