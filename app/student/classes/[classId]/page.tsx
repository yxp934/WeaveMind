import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { BookOpen, FileText, CheckCircle, ArrowLeft } from "lucide-react"

export default async function StudentClassPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
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
    redirect("/student")
  }

  // Get class-level sessions (shared across all courses in the class)
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("class_id", classId)
    .order("session_number", { ascending: true })

  // Get assignments in this class
  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("class_id", classId)
    .order("due_date", { ascending: true })

  // Get student's submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("assignment_id, score")
    .eq("student_id", user.id)

  const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) || [])

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
          title={classData.name}
          subtitle={`Organization: ${classData.organization?.name || "Unknown"}`}
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Link href="/student" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="mb-6">
            <p className="text-gray-600">{classData.description || "No description"}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCard
              title="Sessions"
              value={sessions?.length || 0}
              change={0}
              icon={BookOpen}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Assignments"
              value={assignments?.length || 0}
              change={0}
              icon={FileText}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
            />
            <StatCard
              title="Completed"
              value={submissions?.length || 0}
              change={0}
              icon={CheckCircle}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
          </div>

          {/* Sessions Section - continued in next part */}
          {renderSessionsSection(sessions, classId)}

          {/* Assignments Section */}
          {renderAssignmentsSection(assignments, submissionMap)}
        </main>
      </div>
    </div>
  )
}

function renderSessionsSection(sessions: any[] | null, classId: string) {
  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Sessions</h3>
      <div className="space-y-4">
        {sessions.map((session: any) => {
          const sessionDate = new Date(session.scheduled_date)
          const today = new Date()
          const isPosted = session.posted
          const isSessionDay = sessionDate.toDateString() === today.toDateString()
          const isPast = sessionDate < today
          const isAccessible = isPosted || isSessionDay || isPast

          return (
            <SessionCard 
              key={session.id} 
              session={session} 
              classId={classId}
              sessionDate={sessionDate}
              isPosted={isPosted}
              isSessionDay={isSessionDay}
              isPast={isPast}
              isAccessible={isAccessible}
            />
          )
        })}
      </div>
    </div>
  )
}

function SessionCard({ session, classId, sessionDate, isPosted, isSessionDay, isPast, isAccessible }: any) {
  return (
    <div className={`border rounded-lg p-4 ${isAccessible ? 'hover:bg-gray-50' : 'opacity-75'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <SessionBadges isPosted={isPosted} isSessionDay={isSessionDay} isPast={isPast} isAccessible={isAccessible} sessionNumber={session.session_number} />
          <h4 className="font-semibold text-lg mb-1">{session.title}</h4>
          <p className="text-sm text-gray-600 mb-3">{session.description || 'No description'}</p>
          <SessionMeta sessionDate={sessionDate} startTime={session.start_time} durationMinutes={session.duration_minutes} />
        </div>
        <div className="ml-4">
          <SessionButton session={session} classId={classId} isAccessible={isAccessible} />
        </div>
      </div>
    </div>
  )
}

function SessionBadges({ isPosted, isSessionDay, isPast, isAccessible, sessionNumber }: any) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-sm font-bold text-indigo-600">Session {sessionNumber}</span>
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
  )
}

function SessionMeta({ sessionDate, startTime, durationMinutes }: any) {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-500">
      <span>
        📅 {sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
      {startTime && (
        <span>
          🕐 {startTime}
          {durationMinutes && ` (${durationMinutes} min)`}
        </span>
      )}
    </div>
  )
}

function SessionButton({ session, classId, isAccessible }: any) {
  if (isAccessible && session.content_generated && session.chapter_id) {
    return (
      <Link href={`/student/classes/${classId}/sessions/${session.id}`}>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          Start Learning
        </Button>
      </Link>
    )
  }
  if (isAccessible && !session.content_generated) {
    return (
      <Button size="sm" variant="outline" disabled>
        Content Coming Soon
      </Button>
    )
  }
  return (
    <Button size="sm" variant="outline" disabled>
      🔒 Locked
    </Button>
  )
}

function renderAssignmentsSection(assignments: any[] | null, submissionMap: Map<string, any>) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Assignments</h3>

      {assignments && assignments.length > 0 ? (
        <div className="space-y-3">
          {assignments.map((assignment: any) => {
            const submission = submissionMap.get(assignment.id)
            const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()

            return (
              <div key={assignment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                      {submission ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          Submitted {submission.score !== null ? `• ${submission.score}/${assignment.max_score}` : ""}
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      {assignment.due_date
                        ? `Due: ${new Date(assignment.due_date).toLocaleString()}`
                        : "No due date"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {assignment.description || "No description"}
                    </p>
                  </div>
                  <Link href={`/student/assignments/${assignment.id}`}>
                    <Button variant="outline" size="sm">
                      {submission ? "View" : "Submit"}
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No assignments yet</p>
        </div>
      )}
    </div>
  )
}

