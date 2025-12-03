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

  // Get user's class memberships with class details - with error handling
  let classMemberships: any[] = []
  let classesWithDetails: Array<{
    id: string
    class_id: string
    class_name: string
    class_description: string | null
    organization_name: string
  }> = []
  let coursesCount = 0
  let assignmentsCount = 0

  try {
    // Fetch class memberships with class and organization details
    const { data, error } = await supabase
      .from("class_members")
      .select(`
        id,
        class_id,
        role,
        classes:class_id (
          id,
          name,
          description,
          organizations:organization_id (
            name
          )
        )
      `)
      .eq("user_id", user.id)
      .eq("role", "student")

    if (error) {
      console.error("Error fetching class memberships:", error)
    } else {
      classMemberships = data || []

      // Transform data to include class details
      classesWithDetails = classMemberships.map((membership: any) => ({
        id: membership.id,
        class_id: membership.class_id,
        class_name: membership.classes?.name || "Unknown Class",
        class_description: membership.classes?.description || null,
        organization_name: membership.classes?.organizations?.name || "Unknown Organization"
      }))

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

            {classesWithDetails.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classesWithDetails.map((classItem) => (
                  <Link
                    key={classItem.id}
                    href={`/student/classes/${classItem.class_id}`}
                    className="block"
                  >
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border hover:border-blue-300">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {classItem.class_name}
                          </h4>
                          {classItem.class_description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {classItem.class_description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {classItem.organization_name}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
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
