import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ComponentDisplay } from "@/components/student/component-display"
import { Button } from "@/components/ui/button"

export default async function StudentCoursePage({
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

  // Get user's role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isTeacher = profile?.role === "teacher"

  // Get course details
  const { data: course } = await supabase
    .from("courses")
    .select("*, class:classes(name, id)")
    .eq("id", id)
    .single()

  if (!course) {
    redirect("/student")
  }

  // Allow teachers to preview unpublished courses, but students can only see published courses
  if (!course.published && !isTeacher) {
    redirect("/student")
  }

  // Get chapters with components
  const { data: chapters } = await supabase
    .from("chapters")
    .select(`
      *,
      components (*)
    `)
    .eq("course_id", id)
    .order("order_index", { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href={`/student/classes/${course.class_id}`}>
                <Button variant="ghost">← Back to Class</Button>
              </Link>
              <h1 className="text-2xl font-bold text-indigo-600">{course.title}</h1>
            </div>
            <span className="text-sm text-gray-700">{user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Teacher Preview Banner */}
        {isTeacher && !course.published && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-yellow-800 font-semibold">👁️ Teacher Preview Mode</span>
              <span className="ml-2 text-yellow-700 text-sm">
                This course is unpublished. Students cannot see this content yet.
              </span>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h2>
          <p className="text-gray-600 mb-2">{course.description || "No description"}</p>
          <p className="text-sm text-gray-500">
            Class: {course.class?.name || "Unknown"}
          </p>
        </div>

        {/* Course Content */}
        <div className="space-y-6">
          {chapters && chapters.length > 0 ? (
            chapters.map((chapter: any, chapterIndex: number) => (
              <div key={chapter.id} className="bg-white rounded-lg shadow">
                <div className="p-6 border-b bg-indigo-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-indigo-600">
                      Chapter {chapterIndex + 1}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{chapter.title}</h3>
                  </div>
                  {chapter.description && (
                    <p className="text-gray-600 mt-2">{chapter.description}</p>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  {chapter.components && chapter.components.length > 0 ? (
                    chapter.components
                      .sort((a: any, b: any) => a.order_index - b.order_index)
                      .map((component: any) => (
                        <ComponentDisplay
                          key={component.id}
                          component={component}
                          courseId={id}
                          chapterId={chapter.id}
                        />
                      ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No content in this chapter</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No chapters available yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

