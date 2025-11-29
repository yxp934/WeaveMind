'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { SessionContentDialog } from './session-content-dialog'

interface Session {
  id: string
  session_number: number
  title: string
  description: string | null
  scheduled_date: string
  start_time: string | null
  duration_minutes: number | null
  content_generated: boolean
  chapter_id: string | null
  chapter?: {
    id: string
    title: string
  } | null
}

interface SessionsListProps {
  sessions: Session[]
  classId: string
  className: string
}

export function SessionsList({ sessions, classId, className }: SessionsListProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleGenerateContent = (session: Session) => {
    setSelectedSession(session)
    setDialogOpen(true)
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 mb-4">No sessions scheduled yet</p>
        <p className="text-sm text-gray-400">Use the AI Schedule Assistant above to create your class schedule</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {sessions.map((session) => {
          const sessionDate = session.scheduled_date ? new Date(session.scheduled_date) : null
          const hasContent = session.content_generated || session.chapter_id
          
          return (
            <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded">
                      Session {session.session_number}
                    </span>
                    {hasContent ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Content Generated
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        No Content
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">{session.title || `Session ${session.session_number}`}</h4>
                  {session.description && (
                    <p className="text-sm text-gray-600 mb-2">{session.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {sessionDate && (
                      <>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {sessionDate.toLocaleDateString()}
                        </span>
                        {session.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {session.start_time}
                            {session.duration_minutes && ` (${session.duration_minutes} min)`}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {!hasContent && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleGenerateContent(session)}
                    >
                      Generate Content
                    </Button>
                  )}
                  {hasContent && session.chapter_id && (
                    <Link href={`/teacher/chapters/${session.chapter_id}`}>
                      <Button variant="outline" size="sm">
                        View Content
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedSession && (
        <SessionContentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          session={selectedSession}
          classId={classId}
          className={className}
        />
      )}
    </>
  )
}

