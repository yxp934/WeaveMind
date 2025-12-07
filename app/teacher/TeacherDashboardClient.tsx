'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { createClient } from "@/lib/supabase/client";

// Design-compliant components
import { Navigation, ClassCard, SessionCard, TeacherAssignmentCard, SectionCard } from '@/components/teacher/design';
import { FloatingActionMenu } from '@/components/teacher/FloatingActionMenu';
import { TeacherDashboardChat } from '@/components/teacher/TeacherDashboardChat';

interface ClassData {
  id: number;
  title: string;
  instructor: string;
  progress: number;
  totalSessions: number;
  completedSessions: number;
  students: number;
  color: string;
}

interface SessionData {
  id: number;
  title: string;
  className: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  isOnline: boolean;
  color: string;
}

interface AssignmentData {
  id: number;
  title: string;
  className: string;
  dueDate: string;
  totalStudents: number;
  submittedCount: number;
  color: string;
}

interface TeacherDashboardClientProps {
  classes: ClassData[];
  upcomingSessions: SessionData[];
  assignments: AssignmentData[];
  teacherData: {
    avatar: string;
    name: string;
    organization: string;
  };
}

export function TeacherDashboardClient({
  classes,
  upcomingSessions,
  assignments,
  teacherData
}: TeacherDashboardClientProps) {
  const router = useRouter();
  const classScrollRef = useRef<HTMLDivElement>(null);
  const sessionScrollRef = useRef<HTMLDivElement>(null);
  const assignmentScrollRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-[#f3e8f4]">
      {/* Top Navigation */}
      <Navigation
        userName={teacherData.name}
        userAvatar={teacherData.avatar}
        organization={teacherData.organization}
        onNavigateToSettings={() => router.push('/teacher/settings')}
        onNavigateToHome={() => router.push('/teacher')}
        onNavigateToNotifications={() => router.push('/teacher/notifications')}
        onNavigateToDiscussions={() => router.push('/teacher/discussions')}
      />

      {/* Main Dashboard */}
      <div className="px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Welcome Header */}
            <div className="mb-2">
              <h1
                className="text-[#B882B1] text-[40px] leading-[1.1] mb-2"
                style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
              >
                Welcome Back!
              </h1>
              <p className="text-[#6a7282] text-[16px]">
                Let&apos;s manage your classes today
              </p>
            </div>

            {/* Classes Section - Horizontal Scroll */}
            <SectionCard title="Classes" titleColor="#B882B1">
              <div
                ref={classScrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {classes.length > 0 ? (
                  classes.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="flex-none w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-10.666px)] min-w-[280px] max-w-[350px]"
                    >
                      <ClassCard
                        {...classItem}
                        onClick={() => router.push(`/teacher/classes/${classItem.id}`)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="w-full text-center py-8">
                    <p className="text-[#6a7282] text-[14px]">No classes yet. Create your first class to get started!</p>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Bottom Row: Upcoming Sessions and Assignments */}
            <div className="grid grid-cols-2 gap-6">
              {/* Upcoming Sessions - Vertical Scroll */}
              <SectionCard title="Upcoming Sessions" titleColor="#3FA11B">
                <div
                  ref={sessionScrollRef}
                  className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide scroll-smooth pr-2"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {upcomingSessions.length > 0 ? (
                    upcomingSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        {...session}
                        onClick={() => router.push(`/teacher/sessions/${session.id}`)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[#6a7282] text-[14px]">No upcoming sessions</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Assignments - Vertical Scroll */}
              <SectionCard title="Assignments" titleColor="#B882B1">
                <div
                  ref={assignmentScrollRef}
                  className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide scroll-smooth pr-2"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {assignments.length > 0 ? (
                    assignments.map((assignment) => (
                      <TeacherAssignmentCard
                        key={assignment.id}
                        {...assignment}
                        onClick={() => router.push(`/teacher/assignments/${assignment.id}`)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[#6a7282] text-[14px]">No assignments yet</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <TeacherDashboardChat
              classes={classes.map(c => ({ id: c.id, title: c.title }))}
              sessions={upcomingSessions.map(s => ({ id: s.id, title: s.title }))}
              assignments={assignments.map(a => ({ id: a.id, title: a.title }))}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <FloatingActionMenu sessions={upcomingSessions} />
    </div>
  );
}

export default TeacherDashboardClient;
