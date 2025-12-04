"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function SubmissionGradingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  
  const [submission, setSubmission] = useState<any>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [score, setScore] = useState<number>(0)
  const [feedback, setFeedback] = useState("")
  const [submissionTable, setSubmissionTable] = useState<string>("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        let submissionData = null
        let tableName = ""

        // Try to find the submission in all three tables
        const tables = ["submissions", "writing_submissions", "research_submissions"]

        for (const table of tables) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("id", id)
            .single()

          if (!error && data) {
            submissionData = data
            tableName = table
            setSubmissionTable(table)
            break
          }
        }

        if (!submissionData) {
          throw new Error("Submission not found in any table")
        }

        // Parse content if it's a JSON string
        if (submissionData.content && typeof submissionData.content === 'string') {
          try {
            submissionData.content = JSON.parse(submissionData.content)
          } catch (e) {
            // If parsing fails, keep as is
          }
        }

        setSubmission(submissionData)
        setScore(submissionData.score || submissionData.grade || 0)
        setFeedback(submissionData.feedback || "")

        // Get assignment details
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select("*, class:classes(name)")
          .eq("id", submissionData.assignment_id)
          .single()

        if (assignmentError) throw assignmentError
        setAssignment(assignmentData)

        setLoading(false)
      } catch (err: any) {
        console.error("Error fetching data:", err)
        setError(err.message || "Failed to load submission")
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const updateData: any = {
        feedback,
        updated_at: new Date().toISOString(),
      }

      // Set score field (different tables use different field names)
      if (submissionTable === "submissions") {
        updateData.grade = score
        updateData.graded_at = new Date().toISOString()
      } else {
        updateData.score = score
        updateData.status = 'graded'
      }

      const { error: updateError } = await supabase
        .from(submissionTable)
        .update(updateData)
        .eq("id", id)

      if (updateError) throw updateError

      router.push(`/teacher/assignments/${assignment.id}`)
    } catch (err: any) {
      console.error("Error saving grade:", err)
      setError(err.message || "Failed to save grade")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!submission || !assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Submission not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">Grade Submission</h1>
            <Link href={`/teacher/assignments/${assignment.id}`}>
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Assignment Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">{assignment.title}</h2>
          <p className="text-gray-600 mb-2">{assignment.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Class: {assignment.class?.name}</span>
            <span>Max Score: {assignment.max_score}</span>
          </div>
        </div>

        {/* Submission Content */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Student Submission</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">
              Submitted: {new Date(
                submission.final_submitted_at || submission.submitted_at
              ).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Student ID: {submission.student_id}
            </p>
            {submissionTable !== "submissions" && submission.status && (
              <div className="mb-2">
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Status: {submission.status}
                </span>
              </div>
            )}
            {submission.word_count && (
              <p className="text-sm text-gray-500 mb-2">
                Word Count: {submission.word_count}
              </p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Submission Content</h4>
            {submission.content && typeof submission.content === 'object' && submission.content.text && (
              <div>
                {submission.content.text.split('\n').map((line: string, idx: number) => (
                  <p key={idx} className="whitespace-pre-wrap text-gray-700 mb-2">{line}</p>
                ))}
              </div>
            )}
            {submission.content && typeof submission.content === 'string' && (
              <p className="whitespace-pre-wrap text-gray-700">{submission.content}</p>
            )}
            {submission.content?.url && (
              <div>
                <p className="text-sm text-gray-600 mb-2">File URL:</p>
                <a
                  href={submission.content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {submission.content.url}
                </a>
              </div>
            )}
            {!submission.content && !submission.content?.url && !submission.content?.text && (
              <p className="text-gray-500">No content submitted</p>
            )}
          </div>

          {/* Research AI Conversations */}
          {submissionTable === "research_submissions" && submission.research_notes && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="font-semibold mb-2">AI Conversation History</h4>
              <div className="text-sm text-gray-600">
                {submission.research_notes && typeof submission.research_notes === 'string' ? (
                  <pre className="whitespace-pre-wrap">{submission.research_notes}</pre>
                ) : (
                  <p className="text-gray-500">No conversation history</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grading Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Grade This Submission</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="score">Score (out of {assignment.max_score})</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max={assignment.max_score}
                value={score}
                onChange={(e) => setScore(parseFloat(e.target.value))}
                required
              />
            </div>

            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <textarea
                id="feedback"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={6}
                placeholder="Provide feedback to the student..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Grade"}
              </Button>
              <Link href={`/teacher/assignments/${assignment.id}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

