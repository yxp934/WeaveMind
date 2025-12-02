import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StudentCalendarView } from "@/components/student/calendar-view"

export default async function StudentCalendarPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get student's enrolled classes
  const { data: enrollments } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("user_id", user.id)
    .eq("role", "student")

  const classIds = enrollments?.map(e => e.class_id) || []

  // Get all sessions for enrolled classes
  let sessions: any[] = []
  if (classIds.length > 0) {
    // Query chapters as sessions for now
    const { data: sessionData } = await supabase
      .from("chapters")
      .select(`
        *,
        course:courses(id, title, class_id),
        class:classes(id, name)
      `)
      .in("course.class_id", classIds)
      .order("order_index", { ascending: true })

    sessions = sessionData || []
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
          title="Calendar"
          subtitle="View your upcoming class sessions"
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <StudentCalendarView sessions={sessions} />
        </main>
      </div>
    </div>
  )
}

