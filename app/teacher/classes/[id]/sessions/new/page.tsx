import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewSessionClient } from "./NewSessionClient";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: classId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get class details
  const { data: classData } = await supabase
    .from("classes")
    .select("id, name, description, organization_id")
    .eq("id", classId)
    .single();

  if (!classData) {
    redirect("/teacher/classes");
  }

  // Verify teacher has access to this class
  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== 'teacher' && membership.role !== 'owner')) {
    redirect("/teacher/classes");
  }

  // Get next session number
  const { data: lastSession } = await supabase
    .from("course_sessions")
    .select("session_number")
    .eq("class_id", classId)
    .order("session_number", { ascending: false })
    .limit(1)
    .single();

  const nextSessionNumber = (lastSession?.session_number || 0) + 1;

  // Teacher data for display
  const teacherData = {
    avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'Teacher')}&background=B882B1&color=fff`,
    name: user.user_metadata?.full_name || 'Teacher',
    organization: user.user_metadata?.organization || 'Your Organization'
  };

  return (
    <NewSessionClient
      classData={classData}
      nextSessionNumber={nextSessionNumber}
      teacherData={teacherData}
      userId={user.id}
    />
  );
}
