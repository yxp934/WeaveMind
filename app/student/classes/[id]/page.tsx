import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function StudentClassPage({
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

  // Get class details
  const { data: classData } = await supabase
    .from("classes")
    .select("*, organization:organizations(name)")
    .eq("id", id)
    .single()

  if (!classData) {
    redirect("/student")
  }

  // Get published courses in this class
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("class_id", id)
    .eq("published", true)
    .order("created_at", { ascending: false })

  // Get assignments in this class
  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("class_id", id)
    .order("due_date", { ascending: true })

  // Get student's submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("assignment_id, score")
    .eq("student_id", user.id)

  const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) || [])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href="/student">
                <Button variant="ghost">← Back</Button>
              </Link>
              <h1 className="text-2xl font-bold text-indigo-600">{classData.name}</h1>
            </div>
            <span className="text-sm text-gray-700">{user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{classData.name}</h2>
          <p className="text-gray-600 mb-2">{classData.description || "No description"}</p>
          <p className="text-sm text-gray-500">
            Organization: {classData.organization?.name || "Unknown"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Available Courses</h3>
            <p className="text-3xl font-bold text-indigo-600">{courses?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Assignments</h3>
            <p className="text-3xl font-bold text-indigo-600">{assignments?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Completed</h3>
            <p className="text-3xl font-bold text-indigo-600">{submissions?.length || 0}</p>
          </div>
        </div>

        {/* Courses Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Courses</h3>

          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course: any) => (
                <Link key={course.id} href={`/student/courses/${course.id}`}>
                  <div className="border rounded-lg p-4 hover:bg-gray-50 hover:border-indigo-300 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-lg mb-2">{course.title}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {course.description || "No description"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No courses available yet</p>
            </div>
          )}
        </div>

        {/* Assignments Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Assignments</h3>

          {assignments && assignments.length > 0 ? (
            <div className="space-y-4">
              {assignments.map((assignment: any) => {
                const submission = submissionMap.get(assignment.id)
                const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()
                
                return (
                  <div key={assignment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{assignment.title}</h4>
                          {submission ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              Submitted {submission.score !== null ? `• ${submission.score}/${assignment.max_score}` : ""}
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                              Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {assignment.due_date 
                            ? `Due: ${new Date(assignment.due_date).toLocaleString()}`
                            : "No due date"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {assignment.description || "No description"}
                        </p>
                      </div>
                      <Link href={`/student/assignments/${assignment.id}`}>
                        <Button variant="outline">
                          {submission ? "View" : "Submit"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No assignments yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

