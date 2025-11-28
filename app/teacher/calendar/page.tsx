import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TeacherCalendarView } from "@/components/teacher/calendar-view"

export default async function TeacherCalendarPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get all classes created by this teacher
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })

  // Get all sessions for teacher's classes
  const classIds = classes?.map(c => c.id) || []

  let sessions: any[] = []
  if (classIds.length > 0) {
    const { data: sessionData } = await supabase
      .from("course_sessions")
      .select(`
        *,
        class:classes(id, name)
      `)
      .in("class_id", classIds)
      .order("scheduled_date", { ascending: true })

    sessions = sessionData || []
  }

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
          title="Calendar"
          subtitle="View all your scheduled class sessions"
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <TeacherCalendarView sessions={sessions} />
        </main>
      </div>
    </div>
  )
}

