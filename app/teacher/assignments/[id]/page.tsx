import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AssignmentDetailClient } from "./AssignmentDetailClient";

export default async function AssignmentDetailPage({
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

  // Get assignment details
  const { data: assignment } = await supabase
    .from("assignments")
    .select("*, class:classes(name, id)")
    .eq("id", id)
    .single();

  if (!assignment) {
    redirect("/teacher");
  }

  // Get class student count
  const { count: totalStudents } = await supabase
    .from("class_members")
    .select("*", { count: "exact", head: true })
    .eq("class_id", assignment.class_id)
    .eq("role", "student");

  // Get submissions based on assignment type
  let submissions: any[] = [];
  let submittedCount = 0;
  let gradedCount = 0;

  if (assignment.assignment_subtype === 'writing') {
    const { data } = await supabase
      .from("writing_submissions")
      .select("*")
      .eq("assignment_id", id)
      .order("final_submitted_at", { ascending: false });
    submissions = data || [];
  } else if (assignment.assignment_subtype === 'research') {
    const { data } = await supabase
      .from("research_submissions")
      .select("*")
      .eq("assignment_id", id)
      .order("final_submitted_at", { ascending: false });
    submissions = data || [];
  } else {
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", id)
      .order("submitted_at", { ascending: false });
    submissions = data || [];
  }

  // Count submissions
  submittedCount = submissions.filter(s =>
    s.status === 'submitted' || s.status === 'graded' || s.final_submitted_at
  ).length;

  gradedCount = submissions.filter(s =>
    s.status === 'graded' || s.score !== null
  ).length;

  // Transform submissions for the UI
  const transformedSubmissions = await Promise.all(
    submissions.map(async (submission) => {
      // Get student info
      const { data: studentData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", submission.student_id)
        .single();

      const isNewType = assignment.assignment_subtype === 'writing' || assignment.assignment_subtype === 'research';
      const submittedAt = isNewType ? submission.final_submitted_at : submission.submitted_at;
      const status = submission.status === 'graded' || submission.score !== null ? 'graded' : 'pending';

      return {
        id: submission.id,
        studentName: studentData?.full_name || `Student ${submission.student_id.substring(0, 8)}`,
        studentAvatar: studentData?.avatar_url || `https://ui-avatars.com/api/?name=Student&background=B882B1&color=fff`,
        submittedAt: submittedAt
          ? new Date(submittedAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
            })
          : 'Not submitted yet',
        status: status as 'pending' | 'graded',
        grade: submission.score || null
      };
    })
  );

  // Teacher data for display
  const teacherData = {
    avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'Teacher')}&background=B882B1&color=fff`,
    name: user.user_metadata?.full_name || 'Teacher',
    organization: user.user_metadata?.organization || 'Your Organization'
  };

  const todayIso = new Date().toISOString();
  const { data: upcomingSessionsData } = await supabase
    .from('course_sessions')
    .select('id, title, scheduled_date, start_time, end_time, duration_minutes, location')
    .eq('class_id', assignment.class_id)
    .gte('scheduled_date', todayIso)
    .order('scheduled_date', { ascending: true })
    .limit(6);

  const upcomingSessions = (upcomingSessionsData || []).map((session) => {
    const durationFromTimes =
      session.start_time && session.end_time
        ? Math.round(
            (new Date(`2000-01-01T${session.end_time}`).getTime() -
              new Date(`2000-01-01T${session.start_time}`).getTime()) /
              (1000 * 60),
          )
        : null;
    const durationMinutes =
      session.duration_minutes ?? durationFromTimes ?? null;
    const locationText = session.location || '未设置';
    const locationLower = locationText.toLowerCase();

    return {
      title: session.title || 'Untitled Session',
      className: assignment.class?.name || 'Unknown Class',
      date: session.scheduled_date
        ? new Date(session.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '未设置',
      dateIso: session.scheduled_date || null,
      time: session.start_time
        ? new Date(`2000-01-01T${session.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '未设置',
      duration: durationMinutes ? `${durationMinutes}m` : '未设置',
      location: locationText,
      isOnline: locationLower.includes('zoom') || locationLower.includes('online') || locationLower.includes('线上'),
      color: '#3FA11B'
    };
  });

  // Assignment data for display
  const assignmentDisplayData = {
    id: id,
    title: assignment.title || 'Untitled Assignment',
    className: assignment.class?.name || 'Unknown Class',
    classId: assignment.class_id,
    description: assignment.description || '',
    instructions: assignment.instructions || '',
    dueDate: assignment.due_date
      ? new Date(assignment.due_date).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        })
      : 'No due date',
    totalStudents: totalStudents || 0,
    submittedCount,
    gradedCount,
    maxScore: assignment.max_score || 100
  };

  return (
    <AssignmentDetailClient
      assignmentData={assignmentDisplayData}
      submissions={transformedSubmissions}
      upcomingSessions={upcomingSessions}
      teacherData={teacherData}
    />
  );
}
