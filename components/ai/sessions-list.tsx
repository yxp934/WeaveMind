'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen, Calendar, Clock, Send, Undo2, FileQuestion } from 'lucide-react'
import Link from 'next/link'
import { SessionContentDialog } from './session-content-dialog'
import { AssignmentGenerationDialog } from './assignment-generation-dialog'

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
  posted: boolean
  chapter?: {
    id: string
    title: string
  } | null
  assignments?: Array<{
    id: string
    title: string
    generation_status: string
    created_at: string
  }>
}

interface SessionsListProps {
  sessions: Session[]
  classId: string
  className: string
}

export function SessionsList({ sessions, classId, className }: SessionsListProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [assignmentSession, setAssignmentSession] = useState<Session | null>(null)
  const [postingId, setPostingId] = useState<string | null>(null)

  const handleGenerateContent = (session: Session) => {
    setSelectedSession(session)
    setDialogOpen(true)
  }

  const handleGenerateAssignment = (session: Session) => {
    setAssignmentSession(session)
    setAssignmentDialogOpen(true)
  }

  const handlePostSession = async (sessionId: string, post: boolean) => {
    try {
      setPostingId(sessionId)
      const response = await fetch(`/api/sessions/${sessionId}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ posted: post }),
      })

      if (!response.ok) {
        throw new Error('Failed to update session')
      }

      // Refresh the page to show updated status
      window.location.reload()
    } catch (error) {
      console.error('Error posting session:', error)
      alert('Failed to update session. Please try again.')
    } finally {
      setPostingId(null)
    }
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
          const hasAssignment = session.assignments && session.assignments.length > 0
          const assignment = hasAssignment && session.assignments ? session.assignments[0] : null

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
                    {hasAssignment && assignment && (
                      <Link href={`/teacher/assignments/${assignment.id}`}>
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full flex items-center gap-1 hover:bg-purple-200 cursor-pointer">
                          <FileQuestion className="h-3 w-3" />
                          Assignment Created
                        </span>
                      </Link>
                    )}
                    {session.posted && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                        <Send className="h-3 w-3" />
                        Posted
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
                  {hasContent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateAssignment(session)}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <FileQuestion className="h-4 w-4 mr-1" />
                      Generate Assignment
                    </Button>
                  )}
                  {hasContent && (
                    <Button
                      variant={session.posted ? "outline" : "default"}
                      size="sm"
                      onClick={() => handlePostSession(session.id, !session.posted)}
                      disabled={postingId === session.id}
                      className={session.posted ? "border-orange-300 text-orange-700 hover:bg-orange-50" : ""}
                    >
                      {postingId === session.id ? (
                        'Updating...'
                      ) : session.posted ? (
                        <>
                          <Undo2 className="h-4 w-4 mr-1" />
                          Unpost
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Post Session
                        </>
                      )}
                    </Button>
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

      {assignmentSession && (
        <AssignmentGenerationDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          session={assignmentSession}
          classId={classId}
          className={className}
        />
      )}
    </>
  )
}

