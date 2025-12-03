import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DeleteAssignmentButton } from "@/components/teacher/delete-assignment-button"

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get assignment details
  const { data: assignment } = await supabase
    .from("assignments")
    .select("*, class:classes(name, id)")
    .eq("id", id)
    .single()

  if (!assignment) {
    redirect("/teacher")
  }

  // Get submissions for this assignment
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", id)
    .order("submitted_at", { ascending: false })

  // Get submission stats
  const totalSubmissions = submissions?.length || 0
  const gradedSubmissions = submissions?.filter(s => s.score !== null).length || 0
  const avgScore = submissions && submissions.length > 0
    ? submissions.filter(s => s.score !== null).reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href={`/teacher/classes/${assignment.class_id}`}>
                <Button variant="ghost">← Back to Class</Button>
              </Link>
              <h1 className="text-2xl font-bold text-indigo-600">{assignment.title}</h1>
            </div>
            <span className="text-sm text-gray-700">{user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{assignment.title}</h2>
              <p className="text-gray-600 mb-2">{assignment.description || "No description"}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Class: {assignment.class?.name || "Unknown"}</span>
                {assignment.due_date && (
                  <span>Due: {new Date(assignment.due_date).toLocaleString()}</span>
                )}
                <span>Max Score: {assignment.max_score}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/teacher/assignments/${id}/edit`}>
                <Button variant="outline">Edit Assignment</Button>
              </Link>
              <DeleteAssignmentButton assignmentId={id} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Submissions</h3>
            <p className="text-3xl font-bold text-indigo-600">{totalSubmissions}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Graded</h3>
            <p className="text-3xl font-bold text-indigo-600">{gradedSubmissions}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Average Score</h3>
            <p className="text-3xl font-bold text-indigo-600">
              {gradedSubmissions > 0 ? avgScore.toFixed(1) : "N/A"}
            </p>
          </div>
        </div>

        {/* Assignment Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Instructions</h3>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-gray-700">{assignment.instructions}</p>
          </div>
          {assignment.grading_criteria && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-2">Grading Criteria</h4>
              <p className="whitespace-pre-wrap text-gray-700">{assignment.grading_criteria}</p>
            </div>
          )}
        </div>

        {/* Submissions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Student Submissions</h3>

          {submissions && submissions.length > 0 ? (
            <div className="space-y-4">
              {submissions.map((submission: any) => (
                <div key={submission.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">Student ID: {submission.student_id.substring(0, 8)}...</h4>
                        {submission.grade !== null ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Graded: {submission.grade}/{assignment.max_score}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Pending Review
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        Submitted: {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                      {submission.feedback && (
                        <p className="text-sm text-gray-600 italic">&quot;{submission.feedback}&quot;</p>
                      )}
                    </div>
                    <Link href={`/teacher/submissions/${submission.id}`}>
                      <Button variant="outline">
                        {submission.score !== null ? "Review" : "Grade"}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No submissions yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

