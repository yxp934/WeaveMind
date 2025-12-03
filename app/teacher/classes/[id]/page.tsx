import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Users, BookOpen, FileText, Key, ArrowLeft, Plus } from "lucide-react"
import { ClassScheduleAssistantWrapper } from "@/components/ai/class-schedule-assistant-wrapper"
import { SessionsList } from "@/components/ai/sessions-list"
import { DeleteClassButton } from "@/components/teacher/delete-class-button"
import { CreateAssignmentButton } from "@/components/teacher/create-assignment-button"

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

  // Get class sessions
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select(`
      *,
      chapter:chapters(id, title),
      assignments(id, title, generation_status, created_at)
    `)
    .eq("class_id", id)
    .order("scheduled_date", { ascending: true })

  const hasSchedule = !!(sessions && sessions.length > 0)

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

          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-gray-600">{classData.description || "No description"}</p>
            </div>
            <DeleteClassButton classId={id} className={classData.name} />
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

          {/* Schedule Generation */}
          {!hasSchedule && (
            <div className="mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">📅 Generate Your Class Schedule</h3>
                <p className="text-sm text-blue-700">
                  Start by creating a schedule for your class. Tell the AI about your class goals,
                  desired number of sessions, frequency, time preferences, and a brief topic for each session.
                </p>
              </div>
              <ClassScheduleAssistantWrapper classId={id} />
            </div>
          )}

          {/* Sessions Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Class Sessions</h3>
            </div>
            <SessionsList
              sessions={sessions || []}
              classId={id}
              className={classData.name}
            />
          </div>

          {/* Assignments Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Assignments</h3>
              <CreateAssignmentButton classId={id} className={classData.name} />
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
                <CreateAssignmentButton classId={id} className={classData.name} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

