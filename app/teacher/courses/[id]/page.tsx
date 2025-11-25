import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function CourseDetailPage({
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

  // Get course details
  const { data: course } = await supabase
    .from("courses")
    .select("*, class:classes(name, id)")
    .eq("id", id)
    .single()

  if (!course) {
    redirect("/teacher")
  }

  // Get chapters with component counts
  const { data: chapters } = await supabase
    .from("chapters")
    .select("*, components(count)")
    .eq("course_id", id)
    .order("order_index", { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href={`/teacher/classes/${course.class_id}`}>
                <Button variant="ghost">← Back to Class</Button>
              </Link>
              <h1 className="text-2xl font-bold text-indigo-600">{course.title}</h1>
            </div>
            <span className="text-sm text-gray-700">{user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h2>
              <p className="text-gray-600 mb-2">{course.description || "No description"}</p>
              <div className="flex items-center gap-2">
                {course.published ? (
                  <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">Published</span>
                ) : (
                  <span className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full">Draft</span>
                )}
                <span className="text-sm text-gray-500">
                  Class: {course.class?.name || "Unknown"}
                </span>
              </div>
            </div>
            <Link href={`/teacher/courses/${id}/edit`}>
              <Button variant="outline">Edit Course</Button>
            </Link>
          </div>
        </div>

        {/* Course Structure */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Course Structure</h3>
            <Link href={`/teacher/courses/${id}/chapters/new`}>
              <Button>Add Chapter</Button>
            </Link>
          </div>

          {chapters && chapters.length > 0 ? (
            <div className="space-y-4">
              {chapters.map((chapter: any, index: number) => (
                <div key={chapter.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">Chapter {index + 1}</span>
                        <h4 className="font-semibold text-lg">{chapter.title}</h4>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{chapter.description || "No description"}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{chapter.components?.[0]?.count || 0} components</span>
                        <span>Order: {chapter.order_index}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/teacher/chapters/${chapter.id}`}>
                        <Button variant="outline">Manage</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No chapters yet. Start building your course content!</p>
              <Link href={`/teacher/courses/${id}/chapters/new`}>
                <Button>Add Your First Chapter</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold mb-2">Course Content</h4>
            <p className="text-sm text-gray-600 mb-4">
              {chapters?.length || 0} chapters with learning materials
            </p>
            <Link href={`/teacher/courses/${id}/chapters/new`}>
              <Button variant="outline" className="w-full">Add Chapter</Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold mb-2">Publishing</h4>
            <p className="text-sm text-gray-600 mb-4">
              {course.published ? "Course is live" : "Course is in draft mode"}
            </p>
            <Link href={`/teacher/courses/${id}/edit`}>
              <Button variant="outline" className="w-full">
                {course.published ? "Unpublish" : "Publish Course"}
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold mb-2">Preview</h4>
            <p className="text-sm text-gray-600 mb-4">
              See how students will view this course
            </p>
            <Link href={`/student/courses/${id}`}>
              <Button variant="outline" className="w-full">Preview as Student</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

