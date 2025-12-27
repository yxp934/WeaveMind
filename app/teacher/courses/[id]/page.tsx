import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AIGenerationPanel } from "@/components/ai/ai-generation-panel"
import { CourseEditorAssistantWrapper } from "@/components/ai/course-editor-assistant-wrapper"

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



  // Check if this course has an AI-generated outline (required for Phase 4 generation)
  const { data: outlines } = await supabase
    .from("course_outlines")
    .select("id, schedule_generated")
    .eq("course_id", id)
    .limit(1)

  const hasOutline = !!(outlines && outlines.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
	      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
	        <div className="flex justify-between h-16 items-center">
	          <div className="flex items-center space-x-4">
	            {course.class_id ? (
	              <Link href={`/teacher/classes/${course.class_id}`}>
	                <Button variant="ghost">← Back to Class</Button>
	              </Link>
	            ) : (
	              <Link href="/teacher">
	                <Button variant="ghost">← Back to Courses</Button>
	              </Link>
	            )}
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
	                  {course.class?.name ? `Class: ${course.class.name}` : "AI Draft (no class yet)"}
	                </span>
	              </div>
            </div>
            <Link href={`/teacher/courses/${id}/edit`}>
              <Button variant="outline">Edit Course</Button>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">

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

        {/* Deprecation Notice for AI Generation */}
        {!hasOutline && course.class_id && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-800 mb-2">💡 New: Class-Level Content Generation</h3>
            <p className="text-sm text-yellow-700 mb-4">
              We&apos;ve moved AI content generation to the class level for a more streamlined workflow.
              Instead of generating content for individual courses, you can now:
            </p>
            <ol className="text-sm text-yellow-700 mb-4 list-decimal list-inside space-y-1">
              <li>Generate a class schedule with AI</li>
              <li>Create a course outline for all sessions</li>
              <li>Generate detailed content for each session</li>
            </ol>
            <Link href={`/teacher/classes/${course.class_id}`}>
              <Button className="bg-yellow-600 hover:bg-yellow-700">
                Go to Class Page to Generate Content
              </Button>
            </Link>
          </div>
        )}

        {/* Legacy AI Tools - Only for courses with existing outlines */}
        {hasOutline && (
          <div className="mt-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-700">
                ℹ️ This course has a legacy AI-generated outline. You can continue using these tools,
                but we recommend using the new class-level generation workflow for future courses.
              </p>
            </div>
            <AIGenerationPanel courseId={id} hasOutline={hasOutline} />
          </div>
        )}

        {/* Phase 5: AI Course Editor - Only show if course has chapters */}
        {chapters && chapters.length > 0 && (
          <div className="mt-8">
            <CourseEditorAssistantWrapper courseId={id} />
          </div>
        )}
      </main>
    </div>
  )
}
