import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Calendar, Clock, CheckCircle, Play } from "lucide-react"
import { format, parseISO, isBefore, isToday, startOfDay } from "date-fns"

export default async function StudentCoursesPage() {
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

  // Get courses from enrolled classes
  let courses: any[] = []
  if (classIds.length > 0) {
    const { data: courseData } = await supabase
      .from("courses")
      .select(`
        *,
        class:classes(id, name),
        course_sessions(id, scheduled_date, content_generated)
      `)
      .in("class_id", classIds)
      .eq("published", true)
      .order("created_at", { ascending: false })

    courses = courseData || []
  }

  // Categorize courses based on their sessions
  const today = startOfDay(new Date())
  
  const categorizedCourses = courses.map(course => {
    const sessions = course.course_sessions || []
    const futureSessions = sessions.filter((s: any) => {
      const sessionDate = startOfDay(parseISO(s.scheduled_date))
      return !isBefore(sessionDate, today) && !isToday(sessionDate)
    })
    const pastSessions = sessions.filter((s: any) => {
      const sessionDate = startOfDay(parseISO(s.scheduled_date))
      return isBefore(sessionDate, today) || isToday(sessionDate)
    })
    
    const hasUpcoming = futureSessions.length > 0
    const allCompleted = sessions.length > 0 && futureSessions.length === 0
    
    // Find next session date
    const nextSession = sessions
      .filter((s: any) => !isBefore(startOfDay(parseISO(s.scheduled_date)), today))
      .sort((a: any, b: any) => parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime())[0]

    return {
      ...course,
      hasUpcoming,
      allCompleted,
      nextSessionDate: nextSession?.scheduled_date,
      totalSessions: sessions.length,
      completedSessions: pastSessions.length
    }
  })

  const upcomingCourses = categorizedCourses.filter(c => c.hasUpcoming || c.totalSessions === 0)
  const completedCourses = categorizedCourses.filter(c => c.allCompleted && c.totalSessions > 0)

  const navItems = [
    { title: "Dashboard", href: "/student", icon: "Home" as const },
    { title: "My Classes", href: "/student/classes", icon: "GraduationCap" as const },
    { title: "Courses", href: "/student/courses", icon: "BookOpen" as const },
    { title: "Assignments", href: "/student/assignments", icon: "FileText" as const },
    { title: "Calendar", href: "/student/calendar", icon: "Calendar" as const },
    { title: "Messages", href: "/student/messages", icon: "MessageSquare" as const },
    { title: "Profile", href: "/student/profile", icon: "User" as const },
  ]

  const renderCourseCard = (course: any) => (
    <Link key={course.id} href={`/student/courses/${course.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{course.title}</CardTitle>
            {course.allCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Play className="h-5 w-5 text-indigo-600" />
            )}
          </div>
          <p className="text-sm text-gray-500">{course.class?.name || 'Unknown Class'}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description || 'No description'}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {course.completedSessions}/{course.totalSessions} sessions
            </span>
            {course.nextSessionDate && (
              <span className="flex items-center gap-1 text-indigo-600">
                <Calendar className="h-4 w-4" />
                Next: {format(parseISO(course.nextSessionDate), 'MMM d')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar navItems={navItems} logoText="WeaveMind" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title="My Courses"
          subtitle="View all your enrolled courses"
          userEmail={user.email || ""}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Upcoming/Active Courses */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-indigo-600" />
              Active Courses ({upcomingCourses.length})
            </h2>
            {upcomingCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingCourses.map(renderCourseCard)}
              </div>
            ) : (
              <Card><CardContent className="py-8 text-center text-gray-500">No active courses</CardContent></Card>
            )}
          </section>

          {/* Completed Courses */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Completed Courses ({completedCourses.length})
            </h2>
            {completedCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedCourses.map(renderCourseCard)}
              </div>
            ) : (
              <Card><CardContent className="py-8 text-center text-gray-500">No completed courses yet</CardContent></Card>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

