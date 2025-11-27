import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ComponentDisplay } from "@/components/student/component-display"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ArrowLeft, Calendar, Clock, Lock } from "lucide-react"
import { format, parseISO, isBefore, isToday, startOfDay } from "date-fns"

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

  // Get session details
  const { data: session } = await supabase
    .from("course_sessions")
    .select("*, course:courses(id, title, class_id, published, classes(name))")
    .eq("id", sessionId)
    .single()

  if (!session) {
    redirect(`/student/courses/${id}`)
  }

  // Check date-based access control
  const today = startOfDay(new Date())
  const sessionDate = startOfDay(parseISO(session.scheduled_date))
  const isAccessible = isBefore(sessionDate, today) || isToday(sessionDate)

  // Get user's role for teacher preview
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isTeacher = profile?.role === "teacher"

  // If not accessible and not a teacher, redirect
  if (!isAccessible && !isTeacher) {
    redirect(`/student/courses/${id}`)
  }

  // Get chapter content if available
  let chapter = null
  if (session.chapter_id) {
    const { data: chapterData } = await supabase
      .from("chapters")
      .select("*, components(*)")
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

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return format(date, 'h:mm a')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar navItems={navItems} logoText="WeaveMind" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title={`Session ${session.session_number}: ${session.title}`}
          subtitle={session.course?.title || "Course"}
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Link href={`/student/courses/${id}`} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Course</span>
          </Link>

          {/* Session Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-4 text-gray-600 mb-4">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(parseISO(session.scheduled_date), 'MMMM d, yyyy (EEEE)')}
              </span>
              {session.start_time && (
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {formatTime(session.start_time)} - {formatTime(session.end_time)}
                </span>
              )}
            </div>
            {session.description && (
              <p className="text-gray-700">{session.description}</p>
            )}
          </div>

          {/* Session Content */}
          {chapter ? (
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
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">Content for this session is being prepared.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

