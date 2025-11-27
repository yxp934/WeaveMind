'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, BookOpen, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO, isBefore } from 'date-fns'
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
  course: {
    id: string
    title: string
    class_id: string | null
    classes: { name: string } | null
  }
}

interface TeacherCalendarViewProps {
  sessions: CourseSession[]
}

export function TeacherCalendarView({ sessions }: TeacherCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, CourseSession[]>()
    sessions.forEach(session => {
      const dateKey = session.scheduled_date
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(session)
    })
    return map
  }, [sessions])

  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return sessionsByDate.get(dateKey) || []
  }, [selectedDate, sessionsByDate])

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return format(date, 'h:mm a')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {daysInMonth.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const daySessions = sessionsByDate.get(dateKey) || []
              const hasSession = daySessions.length > 0
              const isSelected = selectedDate && isSameDay(day, selectedDate)

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square p-1 rounded-lg text-sm transition-colors relative
                    ${isToday(day) ? 'bg-blue-100 font-bold' : ''}
                    ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}
                    ${hasSession ? 'font-semibold' : ''}
                    hover:bg-gray-100`}
                >
                  {format(day, 'd')}
                  {hasSession && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a Date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-gray-500 text-sm">Click on a date to view sessions</p>
          ) : selectedDateSessions.length === 0 ? (
            <p className="text-gray-500 text-sm">No sessions scheduled</p>
          ) : (
            <div className="space-y-3">
              {selectedDateSessions.map(session => (
                <Link key={session.id} href={`/teacher/courses/${session.course.id}`}>
                  <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      {session.content_generated ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                      )}
                      <span className="font-medium text-sm">{session.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{session.course.title}</p>
                    {session.start_time && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

