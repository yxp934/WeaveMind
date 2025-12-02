'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Lock, CheckCircle, Play, BookOpen } from 'lucide-react'
import { format, parseISO, isBefore, isToday, startOfDay } from 'date-fns'
import Link from 'next/link'

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
  posted: boolean
}

interface CourseSessionsDisplayProps {
  sessions: CourseSession[]
  courseId: string
}

export function CourseSessionsDisplay({ sessions, courseId }: CourseSessionsDisplayProps) {
  const today = startOfDay(new Date())

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
    const sessionDate = startOfDay(parseISO(session.scheduled_date))
    const isPosted = session.posted
    const isSessionDay = isToday(sessionDate)
    const isPast = isBefore(sessionDate, today)

    // Session is accessible if it's posted OR if the session date has arrived
    const isAccessible = isPosted || isSessionDay || isPast

    if (isPosted && !isSessionDay && !isPast) {
      return {
        label: 'Early Access',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: BookOpen,
        accessible: true
      }
    }

    if (isSessionDay) {
      return {
        label: "Today's Class",
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Play,
        accessible: isAccessible
      }
    }

    if (isPast) {
      return {
        label: 'Completed',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        accessible: true
      }
    }

    return {
      label: 'Upcoming',
      color: 'bg-gray-100 text-gray-600 border-gray-200',
      icon: Lock,
      accessible: false
    }
  }

  // Separate sessions into past/today/posted and upcoming
  // Sessions are available if they are posted OR if the date has arrived
  const availableSessions = sessions.filter(s => {
    const sessionDate = startOfDay(parseISO(s.scheduled_date))
    return s.posted || isBefore(sessionDate, today) || isToday(sessionDate)
  })

  const upcomingSessions = sessions.filter(s => {
    const sessionDate = startOfDay(parseISO(s.scheduled_date))
    return !s.posted && !isBefore(sessionDate, today) && !isToday(sessionDate)
  })

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No class sessions scheduled yet.</p>
        </CardContent>
      </Card>
    )
  }

  const renderSession = (session: CourseSession) => {
    const status = getSessionStatus(session)
    const StatusIcon = status.icon

    return (
      <div key={session.id} className={`border rounded-lg p-4 transition-colors ${status.accessible ? 'hover:bg-gray-50' : 'opacity-75'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold text-indigo-600">Session {session.session_number}</span>
              <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 border ${status.color}`}>
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
            </div>
          </div>
          <div className="ml-4">
            {status.accessible && session.content_generated && session.chapter_id ? (
              <Link href={`/student/courses/${courseId}/sessions/${session.id}`}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Start Learning
                </Button>
              </Link>
            ) : status.accessible && !session.content_generated ? (
              <Button size="sm" variant="outline" disabled>
                Content Coming Soon
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                <Lock className="h-4 w-4 mr-2" />
                Locked
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {availableSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Available Classes ({availableSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableSessions.map(renderSession)}
          </CardContent>
        </Card>
      )}

      {upcomingSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-gray-500" />
              Upcoming Classes ({upcomingSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.map(renderSession)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

