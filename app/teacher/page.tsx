import { redirect } from 'next/navigation'
import { createClient } from "@/lib/supabase/server"
import { TeacherDashboardClient } from './TeacherDashboardClient'

// Server Component - fetches data
export default async function TeacherDashboard() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, organization')
    .eq('id', user.id)
    .maybeSingle();

  const { data: orgMembership } = await supabase
    .from('organization_members')
    .select('organization:organizations(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const displayName = profile?.full_name || user.user_metadata?.full_name || 'Teacher';
  const avatarUrl = profile?.avatar_url
    || user.user_metadata?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'Teacher')}&background=B882B1&color=fff`;
  const organizationName =
    orgMembership?.organization?.name ||
    profile?.organization ||
    user.user_metadata?.organization ||
    'Your Organization';

  // Fetch classes where user is a teacher
  const { data: classesData, error: classesError } = await supabase
    .from('classes')
    .select(`
      id, name, description, created_at,
      class_members!inner(
        user_id,
        role
      )
    `)
    .eq('class_members.user_id', user.id)
    .eq('class_members.role', 'teacher');

  // Fetch student counts for each class
  const nowIso = new Date().toISOString();
  const classesWithCounts = await Promise.all(
    (classesData || []).map(async (classItem) => {
      const { count } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classItem.id)
        .eq('role', 'student');

      const { count: totalSessions } = await supabase
        .from('course_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classItem.id);

      const { count: completedSessions } = await supabase
        .from('course_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classItem.id)
        .lt('scheduled_date', nowIso);

      const safeTotalSessions = totalSessions || 0;
      const safeCompletedSessions = completedSessions || 0;
      const progress = safeTotalSessions > 0
        ? Math.min(100, Math.round((safeCompletedSessions / safeTotalSessions) * 100))
        : 0;

      return {
        id: classItem.id,
        title: classItem.name,
        instructor: displayName,
        progress: progress,
        totalSessions: safeTotalSessions,
        completedSessions: safeCompletedSessions,
        students: count || 0,
        color: '#B882B1'
      };
    })
  );

  // Fetch upcoming sessions
  const today = new Date().toISOString().split('T')[0];
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('course_sessions')
    .select(`
      id, title, description, scheduled_date, start_time, end_time, duration_minutes, location,
      classes!inner(
        name
      )
    `)
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(10);

  const upcomingSessions = (sessionsData || []).map((session) => {
    const hasStart = Boolean(session.start_time);
    const hasEnd = Boolean(session.end_time);
    const durationFromTimes =
      hasStart && hasEnd
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
    const isOnline = locationLower.includes('zoom') ||
      locationLower.includes('online') ||
      locationLower.includes('线上');

    return {
      id: session.id,
      title: session.title || 'Untitled Session',
      className: session.classes.name,
      date: session.scheduled_date
        ? new Date(session.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '未设置',
      dateIso: session.scheduled_date || null,
      time: session.start_time
        ? new Date(`2000-01-01T${session.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '未设置',
      duration: durationMinutes ? `${durationMinutes}m` : '未设置',
      location: locationText,
      isOnline,
      color: '#3FA11B'
    };
  });

  // Fetch assignments created by the user
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from('assignments')
    .select(`
      id, title, description, due_date,
      classes!inner(
        name,
        class_members!inner(
          user_id,
          role
        )
      )
    `)
    .eq('created_by', user.id)
    .order('due_date', { ascending: true });

  const assignments = await Promise.all(
    (assignmentsData || []).map(async (assignment) => {
      // Get student count for the class
      const { count: totalStudents } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', assignment.classes.id)
        .eq('role', 'student');

      // Get submission count
      const { count: submittedCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('assignment_id', assignment.id);

      return {
        id: assignment.id,
        title: assignment.title,
        className: assignment.classes.name,
        dueDate: new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        totalStudents: totalStudents || 0,
        submittedCount: submittedCount || 0,
        color: '#B882B1'
      };
    })
  );

  // Teacher data for display
  const teacherData = {
    avatar: avatarUrl,
    name: displayName,
    organization: organizationName
  };

  // Pass data to client component
  return <TeacherDashboardClient
    classes={classesWithCounts}
    upcomingSessions={upcomingSessions}
    assignments={assignments}
    teacherData={teacherData}
    userId={user.id}
  />;
}
