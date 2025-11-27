import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ArrowLeft, Users, Plus } from "lucide-react"

export default async function OrganizationDetailPage({
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

  // Get organization details
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single()

  if (!org) {
    redirect("/teacher")
  }

  // Get classes in this organization
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("*")
    .eq("organization_id", id)

  if (classesError) {
    console.error("Error fetching classes:", classesError)
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
          title={org.name}
          subtitle={`Slug: ${org.slug}`}
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Link href="/teacher" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Classes</h3>
              <Link href={`/teacher/organizations/${id}/create-class`}>
                <Button className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Class
                </Button>
              </Link>
            </div>

            {classes && classes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((cls: any) => (
                  <div key={cls.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-indigo-300 transition-all">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Users className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-gray-900">{cls.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{cls.description || "No description"}</p>
                      </div>
                    </div>
                    <Link href={`/teacher/classes/${cls.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Class
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No classes yet</p>
                <Link href={`/teacher/organizations/${id}/create-class`}>
                  <Button className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Class
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

