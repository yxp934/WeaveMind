'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, BookOpen, Loader2, CheckCircle, Play } from 'lucide-react'
import { format, parseISO, isBefore, isToday } from 'date-fns'

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

interface CourseSessionsListProps {
  sessions: CourseSession[]
  courseId: string
  onGenerateContent: (sessionId: string) => Promise<void>
}

export function CourseSessionsList({ sessions, courseId, onGenerateContent }: CourseSessionsListProps) {
  const [generatingSessionId, setGeneratingSessionId] = useState<string | null>(null)

  const handleGenerateContent = async (sessionId: string) => {
    setGeneratingSessionId(sessionId)
    try {
      await onGenerateContent(sessionId)
    } finally {
      setGeneratingSessionId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy (EEEE)')
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    try {
      const [hours, minutes] = timeStr.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes))
      return format(date, 'h:mm a')
    } catch {
      return timeStr
    }
  }

  const getSessionStatus = (session: CourseSession) => {
    const sessionDate = parseISO(session.scheduled_date)
    const now = new Date()
    
    if (session.content_generated) {
      return { label: 'Content Ready', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    }
    if (isToday(sessionDate)) {
      return { label: 'Today', color: 'bg-blue-100 text-blue-800', icon: Play }
    }
    if (isBefore(sessionDate, now)) {
      return { label: 'Past', color: 'bg-gray-100 text-gray-600', icon: Clock }
    }
    return { label: 'Upcoming', color: 'bg-yellow-100 text-yellow-800', icon: Calendar }
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No sessions scheduled yet.</p>
          <p className="text-sm text-gray-400 mt-2">Use the AI Schedule Assistant to generate your course schedule.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Course Sessions ({sessions.length} classes)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => {
            const status = getSessionStatus(session)
            const StatusIcon = status.icon
            const isGenerating = generatingSessionId === session.id

            return (
              <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-indigo-600">Session {session.session_number}</span>
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                    <h4 className="font-semibold text-lg mb-1">{session.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{session.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(session.scheduled_date)}
                      </span>
                      {session.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                      )}
                      {session.duration_minutes && (
                        <span>{session.duration_minutes} min</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {session.content_generated ? (
                      <a href={`/teacher/chapters/${session.chapter_id}`}>
                        <Button variant="outline" size="sm">
                          <BookOpen className="h-4 w-4 mr-2" />
                          View Content
                        </Button>
                      </a>
                    ) : (
                      <Button onClick={() => handleGenerateContent(session.id)} disabled={isGenerating} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                        {isGenerating ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                        ) : (
                          <><BookOpen className="h-4 w-4 mr-2" />Generate Content</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

