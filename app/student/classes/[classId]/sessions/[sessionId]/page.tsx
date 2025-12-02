import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ComponentDisplay } from "@/components/student/component-display"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ArrowLeft } from "lucide-react"

export default async function StudentClassSessionPage({
  params,
}: {
  params: Promise<{ classId: string; sessionId: string }>
}) {
  const { classId, sessionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get class details
  const { data: classData } = await supabase
    .from("classes")
    .select("*, organization:organizations(name)")
    .eq("id", classId)
    .single()

  if (!classData) {
    redirect("/student/classes")
  }

  // Get session details
  const { data: session } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("class_id", classId)
    .single()

  if (!session) {
    redirect(`/student/classes/${classId}`)
  }

  // Check if session is accessible (posted or date has arrived)
  const sessionDate = new Date(session.scheduled_date)
  const today = new Date()
  const isPosted = session.posted
  const isSessionDay = sessionDate.toDateString() === today.toDateString()
  const isPast = sessionDate < today
  const isAccessible = isPosted || isSessionDay || isPast

  // Redirect if not accessible
  if (!isAccessible) {
    redirect(`/student/classes/${classId}`)
  }

  // Get chapter with components if content is generated
  let chapter = null
  if (session.chapter_id) {
    const { data: chapterData } = await supabase
      .from("chapters")
      .select(`
        *,
        components (
          *,
          order_index
        )
      `)
      .eq("id", session.chapter_id)
      .single()

    chapter = chapterData
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
          title={session.title}
          subtitle={`${classData.name} • Session ${session.session_number}`}
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Link href={`/student/classes/${classId}`} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Class</span>
          </Link>

          {/* Session Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>
                📅 {sessionDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              {session.start_time && (
                <span>
                  🕐 {session.start_time}
                  {session.duration_minutes && ` (${session.duration_minutes} min)`}
                </span>
              )}
            </div>
            {session.description && (
              <p className="text-gray-700">{session.description}</p>
            )}
          </div>

          {/* Session Content */}
          {chapter ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 text-sm font-semibold text-indigo-600 bg-white rounded-full shadow-sm">
                      Session {session.session_number} Content
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
                          courseId={classId}
                          chapterId={chapter.id}
                        />
                      ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No content in this chapter</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">Content has not been generated yet</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
