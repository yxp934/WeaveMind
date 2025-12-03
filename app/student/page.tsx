import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { JoinClassForm } from "@/components/student/join-class-form"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { BookOpen, FileText, GraduationCap } from "lucide-react"

export default async function StudentDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user's profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || profile.role !== "student") {
    redirect("/auth/login")
  }

  // Get user's class memberships - with error handling
  let classMemberships: any[] = []
  let coursesCount = 0
  let assignmentsCount = 0

  try {
    const { data, error } = await supabase
      .from("class_members")
      .select("id, class_id, role")
      .eq("user_id", user.id)
      .eq("role", "student")

    if (error) {
      console.error("Error fetching class memberships:", error)
    } else {
      classMemberships = data || []

      // Only query if we have class memberships
      if (classMemberships.length > 0) {
        const classIds = classMemberships.map((m) => m.class_id)

        // Get courses count with error handling
        try {
          const { count } = await supabase
            .from("courses")
            .select("*", { count: "exact", head: true })
            .in("class_id", classIds)
            .eq("published", true)
          coursesCount = count || 0
        } catch (err) {
          console.error("Error fetching courses count:", err)
          coursesCount = 0
        }

        // Get assignments count with error handling
        try {
          const { count } = await supabase
            .from("assignments")
            .select("*", { count: "exact", head: true })
            .in("class_id", classIds)
          assignmentsCount = count || 0
        } catch (err) {
          console.error("Error fetching assignments count:", err)
          assignmentsCount = 0
        }
      }
    }
  } catch (err) {
    console.error("Error in dashboard query:", err)
    // Continue with default values (0s)
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
      {/* Sidebar */}
      <DashboardSidebar navItems={navItems} logoText="WeaveMind" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader
          title="Dashboard"
          subtitle="Welcome back! Here's your learning overview"
          userEmail={user.email || ""}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="My Classes"
              value={classMemberships.length}
              change={12}
              icon={GraduationCap}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Active Courses"
              value={coursesCount}
              change={8}
              icon={BookOpen}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
            <StatCard
              title="Assignments"
              value={assignmentsCount}
              change={-3}
              icon={FileText}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
            />
          </div>

          {/* Classes List */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">My Classes</h3>
              <Link href="/student/classes">
                <Button size="sm">Join New Class</Button>
              </Link>
            </div>

            {classMemberships.length > 0 ? (
              <div className="space-y-4">
                {/* Note: For now showing simple list since we removed the complex join */}
                <div className="text-gray-600 text-center py-8">
                  <p>You are enrolled in {classMemberships.length} class(es).</p>
                  <p className="text-sm mt-2">Visit "My Classes" to view details.</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <GraduationCap className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-2">
                  You haven&apos;t joined any classes yet
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Ask your teacher for a class invitation code to get started
                </p>
                <JoinClassForm />
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}
