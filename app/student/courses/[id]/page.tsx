import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ComponentDisplay } from "@/components/student/component-display"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ArrowLeft, AlertCircle } from "lucide-react"

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

  // Get course sessions
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("course_id", id)
    .order("session_number", { ascending: true })

  // Get chapters with components
  const { data: chapters } = await supabase
    .from("chapters")
    .select(`
      *,
      components (*)
    `)
    .eq("course_id", id)
    .order("order_index", { ascending: true })

  const hasSessions = sessions && sessions.length > 0

  const navItems = [
    { title: "Dashboard", href: "/student", icon: "Home" as const },
    { title: "My Classes", href: "/student/classes", icon: "GraduationCap" as const },
    { title: "Courses", href: "/student/courses", icon: "BookOpen" as const },
    { title: "Assignments", href: "/student/assignments", icon: "FileText" as const },
    { title: "Calendar", href: "/student/calendar", icon: "Calendar" as const },
    { title: "Messages", href: "/student/messages", icon: "MessageSquare" as const },
    { title: "Profile", href: "/student/profile", icon: "User" as const },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar navItems={navItems} logoText="WeaveMind" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title={course.title}
          subtitle={`Class: ${course.class?.name || "Unknown"}`}
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Link href={`/student/classes/${course.class_id}`} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Class</span>
          </Link>

          {/* Teacher Preview Banner */}
          {isTeacher && !course.published && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-800 font-semibold">Teacher Preview Mode</span>
                <span className="text-yellow-700 text-sm">
                  This course is unpublished. Students cannot see this content yet.
                </span>
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-gray-600">{course.description || "No description"}</p>
          </div>

          {/* Course Content (chapters-based view) */}
          <div className="space-y-6">
            {chapters && chapters.length > 0 ? (
              chapters.map((chapter: any, chapterIndex: number) => (
                <div key={chapter.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-sm font-semibold text-indigo-600 bg-white rounded-full shadow-sm">
                        Chapter {chapterIndex + 1}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900">{chapter.title}</h3>
                    </div>
                    {chapter.description && (
                      <p className="text-gray-600 mt-3">{chapter.description}</p>
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
                      <p className="text-gray-500 text-center py-8">No content in this chapter</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">No content available yet</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

