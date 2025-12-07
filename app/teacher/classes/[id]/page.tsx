import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClassDetailClient } from "./ClassDetailClient";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get class details
  const { data: classData } = await supabase
    .from("classes")
    .select("*, organization:organizations(name)")
    .eq("id", id)
    .single();

  if (!classData) {
    redirect("/teacher");
  }

  // Get class members count (students)
  const { count: studentCount } = await supabase
    .from("class_members")
    .select("*", { count: "exact", head: true })
    .eq("class_id", id)
    .eq("role", "student");

  // Get class sessions
  const { data: sessionsData } = await supabase
    .from("course_sessions")
    .select(`
      id, title, description, scheduled_date, start_time, end_time, location,
      chapter:chapters(id, title)
    `)
    .eq("class_id", id)
    .order("scheduled_date", { ascending: true });

  // Get assignments in this class
  const { data: assignmentsData } = await supabase
    .from("assignments")
    .select("*")
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  // Transform sessions data
  const sessions = (sessionsData || []).map((session) => ({
    id: session.id,
    title: session.title || 'Untitled Session',
    date: session.scheduled_date
      ? new Date(session.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'TBD',
    time: session.start_time
      ? new Date(`2000-01-01T${session.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : 'TBD',
    location: session.location || 'Classroom',
    hasContent: !!session.chapter,
    componentsCount: 0 // This could be fetched separately if needed
  }));

  // Transform assignments data
  const assignments = await Promise.all(
    (assignmentsData || []).map(async (assignment) => {
      // Get submission count
      const { count: submittedCount } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("assignment_id", assignment.id);

      return {
        id: assignment.id,
        title: assignment.title || 'Untitled Assignment',
        dueDate: assignment.due_date
          ? new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'No due date',
        totalStudents: studentCount || 0,
        submittedCount: submittedCount || 0
      };
    })
  );

  // Teacher data for display
  const teacherData = {
    avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'Teacher')}&background=B882B1&color=fff`,
    name: user.user_metadata?.full_name || 'Teacher',
    organization: classData.organization?.name || 'Your Organization'
  };

  // Class data for display
  const classDisplayData = {
    id: id,
    title: classData.name,
    description: classData.description || '',
    students: studentCount || 0,
    totalSessions: sessions.length,
    totalAssignments: assignments.length,
    joinCode: classData.join_code || ''
  };

  return (
    <ClassDetailClient
      classData={classDisplayData}
      sessions={sessions}
      assignments={assignments}
      teacherData={teacherData}
    />
  );
}
