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

  // Get user's class memberships
  const { data: classMemberships } = await supabase
    .from("class_members")
    .select(`
      *,
      classes (
        *,
        organizations (*)
      )
    `)
    .eq("user_id", user.id)
    .eq("role", "student")

  // Get enrolled courses count
  const { count: coursesCount } = await supabase
    .from("class_courses")
    .select("*", { count: "exact", head: true })
    .in(
      "class_id",
      classMemberships?.map((m: any) => m.class_id) || []
    )

  // Get assignments count
  const { count: assignmentsCount } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .in(
      "class_id",
      classMemberships?.map((m: any) => m.class_id) || []
    )

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
              value={classMemberships?.length || 0}
              change={12}
              icon={GraduationCap}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Active Courses"
              value={coursesCount || 0}
              change={8}
              icon={BookOpen}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
            <StatCard
              title="Assignments"
              value={assignmentsCount || 0}
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
              <Button size="sm">Join New Class</Button>
            </div>

            {classMemberships && classMemberships.length > 0 ? (
              <div className="space-y-4">
                {classMemberships.map((membership: any) => (
                  <div
                    key={membership.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-gray-900">
                          {membership.classes.name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {membership.classes.organizations.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {membership.classes.description || "No description"}
                        </p>
                      </div>
                      <Link href={`/student/classes/${membership.class_id}`}>
                        <Button variant="outline">View Class</Button>
                      </Link>
                    </div>
                  </div>
                ))}
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

