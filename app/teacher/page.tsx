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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Auth error:', error);
          setError(error.message);
          return;
        }

        console.log('User:', user);
        setUser(user);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
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
            {/* Debug Info */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">调试信息</h3>
              <p className="text-blue-800">用户已登录: {user?.email}</p>
              <p className="text-blue-800">用户ID: {user?.id}</p>
            </div>

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
                value={0}
                icon={Building2}
              />
              <StatCard
                title="班级"
                value={0}
                icon={Users}
              />
              <StatCard
                title="课程"
                value={0}
                icon={BookOpen}
              />
              <StatCard
                title="学生"
                value={0}
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
                  <Link href="/teacher/courses/new-ai">
                    <Button className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      创建班级
                    </Button>
                  </Link>
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
                  <p className="text-gray-500">暂无活动记录</p>
                </div>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
