'use client'

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Calendar,
  BookOpen,
  FileQuestion,
  Loader2,
  Sparkles,
} from "lucide-react"

interface Session {
  id: string
  session_number: number
  title: string
  description: string | null
  scheduled_date: string
  start_time: string | null
  duration_minutes: number | null
  content_generated: boolean
  posted: boolean
  chapter_id: string | null
  chapter?: {
    id: string
    title: string
  } | null
}

export default function SessionBasedAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [error, setError] = useState("")
  const [targetDuration, setTargetDuration] = useState(20)
  const [questionTypes, setQuestionTypes] = useState({
    mcq: true,
    fill_blank: true,
    code: true,
    linking: true,
  })

  useEffect(() => {
    fetchSessions()
  }, [classId])

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/assignments/sessions?classId=${classId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sessions')
      }

      setSessions(data.sessions || [])
    } catch (err: any) {
      console.error("Error fetching sessions:", err)
      setError(err.message)
    }
  }

  const handleGenerateAssignment = async () => {
    if (!selectedSession) {
      setError("Please select a session")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/assignments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          targetDuration,
          questionTypes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate assignment')
      }

      // Redirect to class page
      router.push(`/teacher/classes/${classId}`)
    } catch (err: any) {
      console.error("Error generating assignment:", err)
      setError(err.message || "Failed to generate assignment")
      setLoading(false)
    }
  }

  const availableSessions = sessions.filter(s => s.content_generated && s.chapter_id)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">WeaveMind</h1>
            <Link href={`/teacher/classes/${classId}`}>
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Generate Assignment from Session</h2>
          </div>
          <p className="text-gray-600">
            Select a session with generated content and let AI create an assignment automatically
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {availableSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Available</h3>
              <p className="text-gray-500 mb-4">
                You need to generate content for at least one session before creating assignments.
              </p>
              <Link href={`/teacher/classes/${classId}`}>
                <Button>Back to Class</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select a Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableSessions.map((session) => {
                    const sessionDate = session.scheduled_date ? new Date(session.scheduled_date) : null
                    return (
                      <div
                        key={session.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedSession?.id === session.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedSession?.id === session.id}
                            onChange={() => setSelectedSession(session)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded">
                                Session {session.session_number}
                              </span>
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                                <BookOpen className="h-3 w-3 inline mr-1" />
                                Content Generated
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {session.title || `Session ${session.session_number}`}
                            </h4>
                            {session.description && (
                              <p className="text-sm text-gray-600 mb-2">{session.description}</p>
                            )}
                            {sessionDate && (
                              <p className="text-sm text-gray-500">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                {sessionDate.toLocaleDateString()}
                                {session.start_time && ` at ${session.start_time}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedSession && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Assignment Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="duration">Target Duration (minutes)</Label>
                    <input
                      id="duration"
                      type="number"
                      min="5"
                      max="60"
                      value={targetDuration}
                      onChange={(e) => setTargetDuration(parseInt(e.target.value) || 20)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      The assignment will be designed to take approximately this long
                    </p>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Question Types to Include</Label>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      {Object.entries(questionTypes).map(([type, enabled]) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={enabled}
                            onCheckedChange={(checked) =>
                              setQuestionTypes(prev => ({
                                ...prev,
                                [type]: checked as boolean
                              }))
                            }
                          />
                          <label htmlFor={type} className="text-sm font-normal cursor-pointer">
                            {type === 'mcq' && 'Multiple Choice Questions'}
                            {type === 'fill_blank' && 'Fill in the Blanks'}
                            {type === 'code' && 'Code Questions'}
                            {type === 'linking' && 'Matching Questions'}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button
                onClick={handleGenerateAssignment}
                disabled={loading || !selectedSession}
                className="flex-1"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Assignment...
                  </>
                ) : (
                  <>
                    <FileQuestion className="h-4 w-4 mr-2" />
                    Generate Assignment
                  </>
                )}
              </Button>
              <Link href={`/teacher/classes/${classId}`} className="flex-1">
                <Button type="button" variant="outline" className="w-full" size="lg">Cancel</Button>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
