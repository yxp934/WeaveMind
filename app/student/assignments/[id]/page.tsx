"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function StudentAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [assignment, setAssignment] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [submissionText, setSubmissionText] = useState("")
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          router.push("/auth/login")
          return
        }
        setUser(currentUser)

        // Get assignment details
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select("*, class:classes(name, id)")
          .eq("id", id)
          .single()

        if (assignmentError) throw assignmentError
        setAssignment(assignmentData)

        // Check if student has already submitted
        const { data: submissionData } = await supabase
          .from("submissions")
          .select("*")
          .eq("assignment_id", id)
          .eq("student_id", currentUser.id)
          .single()

        if (submissionData) {
          // Parse content if it's a JSON string
          if (submissionData.content && typeof submissionData.content === 'string') {
            try {
              submissionData.content = JSON.parse(submissionData.content)
            } catch (e) {
              // If parsing fails, keep as is
            }
          }

          setSubmission(submissionData)
          setSubmissionText(submissionData.content?.text || "")
        }

        setLoading(false)
      } catch (err: any) {
        console.error("Error fetching data:", err)
        setError(err.message || "Failed to load assignment")
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      if (submission) {
        // Update existing submission
        const { error: updateError } = await supabase
          .from("submissions")
          .update({
            content: { text: submissionText },
            submitted_at: new Date().toISOString(),
          })
          .eq("id", submission.id)

        if (updateError) throw updateError
      } else {
        // Create new submission
        const { error: insertError } = await supabase
          .from("submissions")
          .insert({
            assignment_id: id,
            student_id: user.id,
            content: { text: submissionText },
            submitted_at: new Date().toISOString(),
          })

        if (insertError) throw insertError
      }

      router.push(`/student/classes/${assignment.class_id}`)
    } catch (err: any) {
      console.error("Error submitting:", err)
      setError(err.message || "Failed to submit assignment")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Assignment not found</p>
      </div>
    )
  }

  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()
  const isGraded = submission && submission.grade !== null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">Assignment</h1>
            <Link href={`/student/classes/${assignment.class_id}`}>
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Assignment Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{assignment.title}</h2>
              <p className="text-gray-600 mb-2">{assignment.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Class: {assignment.class?.name}</span>
                {assignment.due_date && (
                  <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                    Due: {new Date(assignment.due_date).toLocaleString()}
                  </span>
                )}
                <span>Max Score: {assignment.max_score}</span>
              </div>
            </div>
            {isGraded && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-semibold">Graded</p>
                <p className="text-2xl font-bold text-green-800">
                  {submission.grade}/{assignment.max_score}
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <p className="whitespace-pre-wrap text-gray-700">{assignment.instructions}</p>
          </div>

          {assignment.grading_criteria && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2">Grading Criteria</h3>
              <p className="whitespace-pre-wrap text-gray-700">{assignment.grading_criteria}</p>
            </div>
          )}
        </div>

        {/* Submission Form or View */}
        {isGraded ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4">Your Submission</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="whitespace-pre-wrap text-gray-700">{submission.content?.text || "No content"}</p>
            </div>
            {submission.feedback && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Teacher Feedback</h4>
                <p className="whitespace-pre-wrap text-blue-800">{submission.feedback}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4">
              {submission ? "Update Your Submission" : "Submit Your Work"}
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}

            {isOverdue && !submission && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
                ⚠️ This assignment is overdue. You can still submit, but it may affect your grade.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="submission">Your Answer</Label>
                <textarea
                  id="submission"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={12}
                  placeholder="Type your answer here..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : submission ? "Update Submission" : "Submit Assignment"}
                </Button>
                <Link href={`/student/classes/${assignment.class_id}`}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}

