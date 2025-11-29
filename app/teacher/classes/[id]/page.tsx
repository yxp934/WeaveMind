import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Users, BookOpen, FileText, Key, ArrowLeft, Plus, Calendar, Clock } from "lucide-react"
import { ClassScheduleAssistantWrapper } from "@/components/ai/class-schedule-assistant-wrapper"
import { ClassSessionsWrapper } from "@/components/ai/class-sessions-wrapper"
import { ClassOutlineAssistantWrapper } from "@/components/ai/class-outline-assistant-wrapper"

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

  // Get courses in this class (kept for backward compatibility with assignments)
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

  // Get class sessions with chapter information
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select(`
      *,
      chapter:chapters(id, title)
    `)
    .eq("class_id", id)
    .order("scheduled_date", { ascending: true })

  const hasSchedule = !!(sessions && sessions.length > 0)

  // Get class outline
  const { data: outline } = await supabase
    .from("course_outlines")
    .select("*")
    .eq("class_id", id)
    .single()

  const hasOutline = !!outline

  const navItems = [
    { title: "Dashboard", href: "/teacher", icon: "Home" as const },
    { title: "Organizations", href: "/teacher/organizations", icon: "Building2" as const },
    { title: "Classes", href: "/teacher/classes", icon: "Users" as const },
    { title: "Courses", href: "/teacher/courses", icon: "BookOpen" as const },
    { title: "Analytics", href: "/teacher/analytics", icon: "BarChart3" as const },
    { title: "Assignments", href: "/teacher/assignments", icon: "FileText" as const },
    { title: "Calendar", href: "/teacher/calendar", icon: "Calendar" as const },
    { title: "Settings", href: "/teacher/settings", icon: "Settings" as const },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar navItems={navItems} logoText="WeaveMind" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title={classData.name}
          subtitle={`Organization: ${classData.organization?.name || "Unknown"}`}
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Link href="/teacher" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="mb-6">
            <p className="text-gray-600">{classData.description || "No description"}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Students"
              value={studentCount || 0}
              change={0}
              icon={Users}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Courses"
              value={courses?.length || 0}
              change={0}
              icon={BookOpen}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
            />
            <StatCard
              title="Assignments"
              value={assignments?.length || 0}
              change={0}
              icon={FileText}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
            />
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Class Join Code</p>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Key className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="font-mono text-2xl font-bold text-gray-900 break-all">
                {classData.join_code}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Share this code with students
              </p>
            </div>
          </div>

          {/* Multi-Step Workflow */}
          <div className="mb-8">
            {/* Step 1: Schedule Generation */}
            {!hasSchedule && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-800 mb-2">📅 Step 1: Generate Your Class Schedule</h3>
                  <p className="text-sm text-blue-700">
                    Start by creating a schedule for your class. Tell the AI about your class goals,
                    desired number of sessions, frequency, and time preferences.
                  </p>
                </div>
                <ClassScheduleAssistantWrapper classId={id} />
              </div>
            )}

            {/* Step 2: Outline Generation */}
            {hasSchedule && !hasOutline && (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Step 1 Complete: Schedule Created</h3>
                  <p className="text-sm text-green-700 mb-3">
                    Great! You have {sessions?.length || 0} sessions scheduled. Now let&apos;s create a course outline to plan what you&apos;ll teach in each session.
                  </p>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-800 mb-2">📝 Step 2: Generate Course Outline</h3>
                    <p className="text-sm text-purple-700">
                      Tell the AI about your course content, learning objectives, and topics you want to cover.
                      The AI will create a structured outline that you can review and edit.
                    </p>
                  </div>
                </div>
                <ClassOutlineAssistantWrapper classId={id} />
              </div>
            )}

            {/* Step 3: Session Content Generation */}
            {hasSchedule && hasOutline && (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Steps 1 & 2 Complete: Schedule & Outline Ready</h3>
                  <p className="text-sm text-green-700 mb-3">
                    Excellent! You have {sessions?.length || 0} sessions scheduled and a course outline ready.
                    Now you can generate detailed content for each session.
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-800 mb-2">🎯 Step 3: Generate Session Content</h3>
                    <p className="text-sm text-orange-700">
                      Click &quot;Generate Content&quot; on any session below to create detailed learning materials
                      based on your outline. The AI will create chapters, learning objectives, and practice questions.
                    </p>
                  </div>
                </div>
                <ClassSessionsWrapper sessions={sessions || []} classId={id} />
              </div>
            )}
          </div>

          {/* Sessions Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Class Sessions</h3>
            </div>

            {sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session: any) => {
                  const sessionDate = session.scheduled_date ? new Date(session.scheduled_date) : null
                  const hasContent = session.content_generated || session.chapter_id

                  return (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded">
                              Session {session.session_number}
                            </span>
                            {hasContent ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                Content Generated
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                No Content
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">{session.title || `Session ${session.session_number}`}</h4>
                          {session.description && (
                            <p className="text-sm text-gray-600 mb-2">{session.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {sessionDate && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {sessionDate.toLocaleDateString()}
                                </span>
                                {session.start_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {session.start_time}
                                    {session.duration_minutes && ` (${session.duration_minutes} min)`}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!hasContent && (
                            <Button variant="default" size="sm">
                              Generate Content
                            </Button>
                          )}
                          {hasContent && session.chapter_id && (
                            <Link href={`/teacher/chapters/${session.chapter_id}`}>
                              <Button variant="outline" size="sm">
                                View Content
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No sessions scheduled yet</p>
                <p className="text-sm text-gray-400">Use the AI Schedule Assistant above to create your class schedule</p>
              </div>
            )}
          </div>

          {/* Assignments Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Assignments</h3>
              <Link href={`/teacher/classes/${id}/assignments/new`}>
                <Button className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Assignment
                </Button>
              </Link>
            </div>

            {assignments && assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map((assignment: any) => (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{assignment.title}</h4>
                        <p className="text-sm text-gray-500">
                          Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No due date"}
                        </p>
                      </div>
                      <Link href={`/teacher/assignments/${assignment.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No assignments yet</p>
                <Link href={`/teacher/classes/${id}/assignments/new`}>
                  <Button className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Assignment
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

