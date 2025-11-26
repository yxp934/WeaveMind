import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ClassDetailPage({
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
    redirect("/teacher")
  }

  // Get courses in this class
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("class_id", id)
    .order("created_at", { ascending: false })

  // Get assignments in this class
  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("class_id", id)
    .order("created_at", { ascending: false })

  // Get class members count
  const { count: studentCount } = await supabase
    .from("class_members")
    .select("*", { count: "exact", head: true })
    .eq("class_id", id)
    .eq("role", "student")

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href="/teacher">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Students</h3>
            <p className="text-3xl font-bold text-indigo-600">{studentCount || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Courses</h3>
            <p className="text-3xl font-bold text-indigo-600">{courses?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Assignments</h3>
            <p className="text-3xl font-bold text-indigo-600">{assignments?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Class Join Code</h3>
            <p className="font-mono text-xl text-indigo-600 break-all">
              {classData.join_code}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Share this code with students so they can join this class from their student dashboard.
            </p>
          </div>
        </div>

        {/* Courses Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Courses</h3>
            <Link href={`/teacher/classes/${id}/courses/new`}>
              <Button>Create Course</Button>
            </Link>
          </div>

          {courses && courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course: any) => (
                <div key={course.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg">{course.title}</h4>
                        {course.published ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Published</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Draft</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{course.description || "No description"}</p>
                    </div>
                    <Link href={`/teacher/courses/${course.id}`}>
                      <Button variant="outline">Manage</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No courses yet</p>
              <Link href={`/teacher/classes/${id}/courses/new`}>
                <Button>Create Your First Course</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Assignments Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Assignments</h3>
            <Link href={`/teacher/classes/${id}/assignments/new`}>
              <Button>Create Assignment</Button>
            </Link>
          </div>

          {assignments && assignments.length > 0 ? (
            <div className="space-y-4">
              {assignments.map((assignment: any) => (
                <div key={assignment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-lg">{assignment.title}</h4>
                      <p className="text-sm text-gray-500">
                        Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No due date"}
                      </p>
                    </div>
                    <Link href={`/teacher/assignments/${assignment.id}`}>
                      <Button variant="outline">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No assignments yet</p>
              <Link href={`/teacher/classes/${id}/assignments/new`}>
                <Button>Create Your First Assignment</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

