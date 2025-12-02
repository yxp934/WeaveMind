import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ComponentDisplay } from "@/components/student/component-display"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ArrowLeft, AlertCircle } from "lucide-react"
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

  // Get class-level sessions (course_id is null for class-level sessions)
  // Sessions are accessible if posted OR if the session date has arrived
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("class_id", course.class_id)
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

          {/* Course Sessions Section */}
          {hasSessions && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Sessions</h3>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                  {sessions?.map((session: any) => {
                    const sessionDate = new Date(session.scheduled_date)
                    const today = new Date()
                    const isPosted = session.posted
                    const isSessionDay = sessionDate.toDateString() === today.toDateString()
                    const isPast = sessionDate < today
                    const isAccessible = isPosted || isSessionDay || isPast

                    return (
                      <div key={session.id} className={`border rounded-lg p-4 ${isAccessible ? 'hover:bg-gray-50' : 'opacity-75'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-indigo-600">Session {session.session_number}</span>
                              {isPosted && !isSessionDay && !isPast && (
                                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                                  Early Access
                                </span>
                              )}
                              {isSessionDay && (
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                  Today&apos;s Class
                                </span>
                              )}
                              {isPast && (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-200">
                                  Completed
                                </span>
                              )}
                              {!isAccessible && (
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                  Upcoming
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-lg mb-1">{session.title}</h4>
                            <p className="text-sm text-gray-600 mb-3">{session.description || 'No description'}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>
                                📅 {sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {session.start_time && (
                                <span>
                                  🕐 {session.start_time}
                                  {session.duration_minutes && ` (${session.duration_minutes} min)`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            {isAccessible && session.content_generated && session.chapter_id ? (
                              <Link href={`/student/courses/${id}/sessions/${session.id}`}>
                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                                  Start Learning
                                </Button>
                              </Link>
                            ) : isAccessible && !session.content_generated ? (
                              <Button size="sm" variant="outline" disabled>
                                Content Coming Soon
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                🔒 Locked
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

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

