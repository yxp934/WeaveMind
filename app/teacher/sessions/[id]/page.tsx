import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SessionDetailClient } from "./SessionDetailClient";

export default async function SessionDetailPage({
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

  // Get session details
  const { data: sessionData } = await supabase
    .from("course_sessions")
    .select(`
      id, title, description, scheduled_date, start_time, end_time, location,
      class_id,
      classes(id, name),
      chapter:chapters(id, title)
    `)
    .eq("id", id)
    .single();

  if (!sessionData) {
    redirect("/teacher");
  }

  // Get class student count
  const { count: studentsCount } = await supabase
    .from("class_members")
    .select("*", { count: "exact", head: true })
    .eq("class_id", sessionData.class_id)
    .eq("role", "student");

  // Get components for this session (if chapter exists)
  let components: any[] = [];
  if (sessionData.chapter?.id) {
    const { data: componentsData } = await supabase
      .from("components")
      .select("id, title, type, order_index")
      .eq("chapter_id", sessionData.chapter.id)
      .order("order_index", { ascending: true });

    components = (componentsData || []).map(c => ({
      id: c.id,
      title: c.title || `Component ${c.order_index + 1}`,
      type: c.type || 'text',
      duration: '5 min' // Placeholder duration
    }));
  }

  // Determine session status
  const now = new Date();
  const sessionDate = sessionData.scheduled_date ? new Date(sessionData.scheduled_date) : null;
  let status: 'upcoming' | 'in_progress' | 'completed' = 'upcoming';

  if (sessionDate) {
    if (sessionDate < now) {
      status = 'completed';
    } else if (sessionDate.toDateString() === now.toDateString()) {
      status = 'in_progress';
    }
  }

  // Transform session data
  const sessionDisplayData = {
    id: id,
    title: sessionData.title || 'Untitled Session',
    description: sessionData.description || '',
    className: sessionData.classes?.name || 'Unknown Class',
    classId: sessionData.class_id,
    date: sessionData.scheduled_date
      ? new Date(sessionData.scheduled_date).toLocaleDateString('en-US', {
          weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
        })
      : 'TBD',
    time: sessionData.start_time
      ? new Date(`2000-01-01T${sessionData.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit'
        })
      : 'TBD',
    endTime: sessionData.end_time
      ? new Date(`2000-01-01T${sessionData.end_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit'
        })
      : 'TBD',
    location: sessionData.location || 'Classroom',
    isOnline: (sessionData.location || '').toLowerCase().includes('zoom') ||
              (sessionData.location || '').toLowerCase().includes('online'),
    studentsCount: studentsCount || 0,
    status
  };

  // Teacher data for display
  const teacherData = {
    avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'Teacher')}&background=B882B1&color=fff`,
    name: user.user_metadata?.full_name || 'Teacher',
    organization: user.user_metadata?.organization || 'Your Organization'
  };

  return (
    <SessionDetailClient
      sessionData={sessionDisplayData}
      components={components}
      teacherData={teacherData}
    />
  );
}
