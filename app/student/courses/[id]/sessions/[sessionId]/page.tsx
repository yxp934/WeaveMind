import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ComponentDisplay } from "@/components/student/component-display"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ArrowLeft } from "lucide-react"

export default async function StudentSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Note: course_sessions table doesn't exist in current schema
  // sessionId now refers to a chapter ID
  // Redirect to course page with chapter anchor

  // Get chapter details
  const { data: chapter } = await supabase
    .from("chapters")
    .select("*, course:courses(id, title, class_id, published)")
    .eq("id", sessionId)
    .single()

  if (!chapter) {
    redirect(`/student/courses/${id}`)
  }

  // Check if course is published (unless teacher preview)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isTeacher = profile?.role === "teacher"

  if (!chapter.course?.published && !isTeacher) {
    redirect("/student/courses")
  }

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
          title={`Chapter: ${chapter.title}`}
          subtitle={chapter.course?.title || "Course"}
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Link href={`/student/courses/${id}`} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Course</span>
          </Link>

          {/* Chapter Content */}
          {chapter && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                <h3 className="text-xl font-bold text-gray-900">{chapter.title}</h3>
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
                  <p className="text-gray-500 text-center py-8">No content available</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

