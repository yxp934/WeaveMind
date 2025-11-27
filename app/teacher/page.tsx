import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Building2, Users, BookOpen, BarChart3 } from "lucide-react"

export default async function TeacherDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user's organizations
  const { data: orgMemberships } = await supabase
    .from("organization_members")
    .select(`
      *,
      organizations (*)
    `)
    .eq("user_id", user.id)
    .in("role", ["owner", "teacher"])

  // Get classes count
  const { count: classesCount } = await supabase
    .from("classes")
    .select("*", { count: "exact", head: true })
    .in(
      "organization_id",
      orgMemberships?.map((m: any) => m.organization_id) || []
    )

  // Get courses count
  const { count: coursesCount } = await supabase
    .from("courses")
    .select("*", { count: "exact", head: true })
    .in(
      "organization_id",
      orgMemberships?.map((m: any) => m.organization_id) || []
    )

  // Get total students count
  const { count: studentsCount } = await supabase
    .from("class_members")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")

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
      {/* Sidebar */}
      <DashboardSidebar navItems={navItems} logoText="WeaveMind" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader
          title="Dashboard"
          subtitle="Manage your organizations, classes, and courses"
          userEmail={user.email || ""}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Organizations"
              value={orgMemberships?.length || 0}
              change={5}
              icon={Building2}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
            />
            <StatCard
              title="Classes"
              value={classesCount || 0}
              change={12}
              icon={Users}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Courses"
              value={coursesCount || 0}
              change={8}
              icon={BookOpen}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
            <Link href="/teacher/analytics">
              <StatCard
                title="Total Students"
                value={studentsCount || 0}
                change={15}
                icon={BarChart3}
                iconColor="text-orange-600"
                iconBgColor="bg-orange-100"
              />
            </Link>
          </div>

          {/* Organizations List */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">My Organizations</h3>
              <Link href="/teacher/organizations/new">
                <Button>Create Organization</Button>
              </Link>
            </div>

            {orgMemberships && orgMemberships.length > 0 ? (
              <div className="space-y-4">
                {orgMemberships.map((membership: any) => (
                  <div
                    key={membership.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                            <Building2 className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900">
                              {membership.organizations.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Role: <span className="font-medium capitalize">{membership.role}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <Link href={`/teacher/organizations/${membership.organization_id}`}>
                        <Button variant="outline">Manage</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-2">
                  You haven&apos;t created any organizations yet
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Create your first organization to start managing classes and courses
                </p>
                <Link href="/teacher/organizations/new">
                  <Button>Create Your First Organization</Button>
                </Link>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}

