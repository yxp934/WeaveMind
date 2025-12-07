'use client';

import { useEffect, useState } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Building2, Users, BookOpen, BarChart3, Plus, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orgMemberships, setOrgMemberships] = useState<any[]>([]);
  const [classesCount, setClassesCount] = useState(0);
  const [coursesCount, setCoursesCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Get user's organizations
        const { data: orgs } = await supabase
          .from("organization_members")
          .select(`
            *,
            organizations (*)
          `)
          .eq("user_id", user.id)
          .in("role", ["owner", "teacher"])

        setOrgMemberships(orgs || []);

        const organizationIds = orgs?.map((m: any) => m.organization_id) || [];

        if (organizationIds.length > 0) {
          // Get classes count
          const { count: classes } = await supabase
            .from("classes")
            .select("*", { count: "exact", head: true })
            .in("organization_id", organizationIds)

          setClassesCount(classes || 0);

          // Get class IDs for course count
          const { data: classesData } = await supabase
            .from("classes")
            .select("id")
            .in("organization_id", organizationIds)

          const classIds = classesData?.map(c => c.id) || [];

          // Get courses count
          const { count: courses } = await supabase
            .from("courses")
            .select("*", { count: "exact", head: true })
            .in("class_id", classIds)

          setCoursesCount(courses || 0);

          // Get total students count
          const { count: students } = await supabase
            .from("class_members")
            .select("*", { count: "exact", head: true })
            .eq("role", "student")

          setStudentsCount(students || 0);
        }
      }

      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">请先登录</h2>
          <Link href="/auth/login">
            <Button>前往登录</Button>
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    { title: "Dashboard", href: "/teacher", icon: "Home" as const },
    { title: "Organizations", href: "/teacher/organizations", icon: "Building2" as const },
    { title: "Classes", href: "/teacher/classes", icon: "Users" as const },
    { title: "Courses", href: "/teacher/courses", icon: "BookOpen" as const },
    { title: "Assignments", href: "/teacher/assignments", icon: "FileText" as const },
    { title: "Discussions", href: "/teacher/discussions", icon: "MessageSquare" as const },
    { title: "Calendar", href: "/teacher/calendar", icon: "Calendar" as const },
    { title: "Analytics", href: "/teacher/analytics", icon: "BarChart3" as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar navItems={navItems} />
      <div className="lg:pl-72">
        <DashboardHeader
          title="教师仪表板"
          subtitle="欢迎使用WeaveMind教学管理系统"
          userEmail={user?.email}
        />
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-gray-900">
                欢迎回来，{user?.user_metadata?.full_name || '教师'}！
              </h1>
              <p className="mt-2 text-gray-600">
                这里是您的教学管理中心，您可以管理课程、学生和班级。
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8"
            >
              <StatCard
                title="组织机构"
                value={orgMemberships?.length || 0}
                icon={Building2}
              />
              <StatCard
                title="班级"
                value={classesCount}
                icon={Users}
              />
              <StatCard
                title="课程"
                value={coursesCount}
                icon={BookOpen}
              />
              <StatCard
                title="学生"
                value={studentsCount}
                icon={BarChart3}
              />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8"
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">快速开始</h3>
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-gray-600 mb-4">
                  创建新组织或班级，开始您的教学之旅。
                </p>
                <div className="flex gap-3">
                  <Link href="/teacher/organizations/new">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      创建组织
                    </Button>
                  </Link>
                  {orgMemberships?.length > 0 && (
                    <Link href={`/teacher/organizations/${orgMemberships[0]?.organization_id}/create-class`}>
                      <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        创建班级
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">AI 助手</h3>
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-gray-600 mb-4">
                  使用 AI 快速生成课程内容和教学材料。
                </p>
                <Link href="/teacher/courses/new-ai">
                  <Button className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    生成课程
                  </Button>
                </Link>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h3>
                <div className="space-y-4">
                  {orgMemberships?.length === 0 ? (
                    <p className="text-gray-500">暂无活动记录</p>
                  ) : (
                    orgMemberships.slice(0, 3).map((org, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              加入组织: {org.organizations?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              角色: {org.role}
                            </p>
                          </div>
                        </div>
                        <Link href={`/teacher/organizations/${org.organization_id}`}>
                          <Button variant="ghost" size="sm">
                            查看
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
