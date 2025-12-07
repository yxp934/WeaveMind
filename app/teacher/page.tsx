import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Building2, Users, BookOpen, BarChart3, Plus, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

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

  // Get class IDs for course count
  const { data: classes } = await supabase
    .from("classes")
    .select("id")
    .in(
      "organization_id",
      orgMemberships?.map((m: any) => m.organization_id) || []
    )

  const classIds = classes?.map(c => c.id) || []

  // Get courses count
  const { count: coursesCount } = await supabase
    .from("courses")
    .select("*", { count: "exact", head: true })
    .in("class_id", classIds)

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
          title="Welcome to WeaveMind"
          subtitle="Your intelligent learning management platform"
          userEmail={user.email || ""}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/90 to-green-700/90" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    Ready to transform education with AI?
                  </h2>
                  <p className="text-green-100 text-lg">
                    Create engaging courses, manage classes, and track student progress with intelligent tools.
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/teacher/courses/new-ai">
                    <Button className="bg-white text-green-600 hover:bg-green-50 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Create AI Course
                    </Button>
                  </Link>
                </motion.div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full" />
            </div>
          </motion.div>

          {/* Statistics Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <StatCard
                title="Organizations"
                value={orgMemberships?.length || 0}
                change={5}
                icon={Building2}
                iconColor="text-purple-600"
                iconBgColor="bg-purple-100"
              />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <StatCard
                title="Classes"
                value={classesCount || 0}
                change={12}
                icon={Users}
                iconColor="text-blue-600"
                iconBgColor="bg-blue-100"
              />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <StatCard
                title="Courses"
                value={coursesCount || 0}
                change={8}
                icon={BookOpen}
                iconColor="text-green-600"
                iconBgColor="bg-green-100"
              />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
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
            </motion.div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <Link href="/teacher/organizations/new">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Plus className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Create Organization</h3>
                    <p className="text-sm text-gray-600">Start your educational journey</p>
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/teacher/classes/new">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Create Class</h3>
                    <p className="text-sm text-gray-600">Organize your students</p>
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/teacher/courses/new-ai">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Course Creation</h3>
                    <p className="text-sm text-gray-600">Generate content with AI</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Organizations List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">My Organizations</h3>
                <Link href="/teacher/organizations/new">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Organization
                  </Button>
                </Link>
              </div>

              {orgMemberships && orgMemberships.length > 0 ? (
                <div className="space-y-4">
                  {orgMemberships.map((membership: any, index: number) => (
                    <motion.div
                      key={membership.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="border border-gray-200 rounded-lg p-6 hover:border-green-300 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-green-200"
                            >
                              <Building2 className="h-7 w-7 text-green-600" />
                            </motion.div>
                            <div>
                              <h4 className="font-semibold text-lg text-gray-900 mb-1">
                                {membership.organizations.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Role: <span className="font-medium capitalize text-green-600">{membership.role}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Created {new Date(membership.organizations.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Link href={`/teacher/organizations/${membership.organization_id}`}>
                            <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50">
                              Manage
                            </Button>
                          </Link>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-16"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 mb-6">
                    <Building2 className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Start your educational journey
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Create your first organization to start managing classes, courses, and students with AI-powered tools
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link href="/teacher/organizations/new">
                      <Button className="bg-green-600 hover:bg-green-700 text-lg px-8 py-3">
                        <Plus className="h-5 w-5 mr-2" />
                        Create Your First Organization
                      </Button>
                    </Link>
                  </motion.div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        </main>
      </div>
    </div>
  )
}

