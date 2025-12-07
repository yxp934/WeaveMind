'use client';

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { Bell, Search, Settings, MessageSquare, Building2, BookOpen, Users, Clock, Video, MapPin, MoreHorizontal, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { createClient } from "@/lib/supabase/client"
import { RetroTitle } from '@/components/teacher/RetroTitle'
import { FloatingActionMenu } from '@/components/teacher/FloatingActionMenu'

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

export function TeacherDashboardClient({ classes, upcomingSessions, assignments, teacherData }: TeacherDashboardClientProps) {
  const router = useRouter();
  const classScrollRef = useRef<HTMLDivElement>(null);
  const sessionScrollRef = useRef<HTMLDivElement>(null);
  const assignmentScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right', ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const scrollAmount = 300;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <>
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[#B882B1] text-[32px] cursor-pointer hover:opacity-80 transition-opacity font-bold">
              WeaveMind
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
              <input
                type="text"
                placeholder="Search courses, assignments..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-[320px] focus:outline-none focus:border-[#B882B1] transition-colors"
              />
            </div>

            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="size-5 text-gray-600" />
              <span className="absolute top-1 right-1 size-2 bg-[#B882B1] rounded-full" />
            </button>

            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MessageSquare className="size-5 text-gray-600" />
              <span className="absolute top-1 right-1 size-2 bg-[#B882B1] rounded-full" />
            </button>

            <button
              onClick={() => router.push('/teacher/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="size-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              <img
                src={teacherData.avatar}
                alt={teacherData.name}
                className="size-10 rounded-full object-cover border-2 border-[#B882B1] cursor-pointer hover:opacity-80 transition-opacity"
              />
              <div className="flex flex-col">
                <span className="text-[#364153] text-[15px]">{teacherData.name}</span>
                <div className="flex items-center gap-1">
                  <Building2 className="size-3 text-gray-400" />
                  <span className="text-[11px] text-gray-400">{teacherData.organization}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Welcome Header */}
            <div className="mb-2">
              <RetroTitle
                text="Welcome Back! 👋"
                className="mb-2"
                color="#B882B1"
              />
              <p className="text-[#6a7282] text-[16px]">
                Let&apos;s manage your classes today
              </p>
            </div>

            {/* Classes Section - Horizontal Scroll */}
            <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05)] relative">
              <div className="mb-5">
                <RetroTitle
                  text="Classes"
                  className="text-[24px]"
                  color="#B882B1"
                />
              </div>

              <div className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2">
                {classes.map((classItem) => (
                  <div
                    key={classItem.id}
                    className="flex-none w-[calc(50%-8px)] cursor-pointer"
                    onClick={() => router.push(`/teacher/classes/${classItem.id}`)}
                  >
                    {/* Class Card */}
                    <div className="bg-white rounded-[8px] border border-gray-200 p-3 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5">
                      <div className="flex items-start gap-2.5">
                        <div
                          className="size-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${classItem.color}20` }}
                        >
                          <BookOpen className="size-4" style={{ color: classItem.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-[#101828] text-[13px] mb-0.5 truncate">{classItem.title}</h4>
                          <p className="text-[#6a7282] text-[11px] mb-2">{classItem.instructor}</p>

                          <div className="flex items-center gap-3 text-[11px] text-[#6a7282] mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="size-3" />
                              <span>{classItem.completedSessions}/{classItem.totalSessions}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="size-3" />
                              <span>{classItem.students}</span>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${classItem.progress}%`, backgroundColor: classItem.color }}
                              />
                            </div>
                            <div className="flex items-center justify-end">
                              <span className="text-[10px]" style={{ color: classItem.color }}>
                                {classItem.progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Row: Upcoming Sessions and Assignments */}
            <div className="grid grid-cols-2 gap-6">
              {/* Upcoming Sessions - Vertical Scroll */}
              <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05)] relative">
                <div className="mb-5">
                  <RetroTitle
                    text="Upcoming Sessions"
                    className="text-[24px]"
                    color="#3FA11B"
                  />
                </div>
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide scroll-smooth pr-2">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/teacher/sessions/${session.id}`)}
                    >
                      {/* Session Card */}
                      <div className="bg-white rounded-[8px] border border-gray-200 p-3 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all">
                        <div className="flex items-center gap-3">
                          <div
                            className="size-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${session.color}20` }}
                          >
                            <BookOpen className="size-4" style={{ color: session.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[#101828] text-[13px] mb-0.5 truncate">{session.title}</h4>
                            <p className="text-[#6a7282] text-[11px] mb-1">{session.className}</p>
                            <div className="flex items-center gap-2 text-[11px] text-[#6a7282]">
                              <span>{session.date} • {session.time}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-[#6a7282] mt-1">
                              {session.isOnline ? (
                                <Video className="size-3" />
                              ) : (
                                <MapPin className="size-3" />
                              )}
                              <span>{session.location}</span>
                            </div>
                          </div>
                          <div className="text-[11px] text-[#6a7282]">
                            {session.duration}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignments - Vertical Scroll */}
              <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05)] relative">
                <div className="mb-5">
                  <RetroTitle
                    text="Assignments"
                    className="text-[24px]"
                    color="#B882B1"
                  />
                </div>
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide scroll-smooth pr-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/teacher/assignments/${assignment.id}`)}
                    >
                      {/* Assignment Card */}
                      <div className="bg-white rounded-[8px] border border-gray-200 p-3 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all">
                        <div className="flex items-start gap-3">
                          <div
                            className="size-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${assignment.color}20` }}
                          >
                            <BookOpen className="size-4" style={{ color: assignment.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[#101828] text-[13px] mb-0.5 truncate">{assignment.title}</h4>
                            <p className="text-[#6a7282] text-[11px] mb-2">{assignment.className}</p>
                            <div className="text-[11px] text-[#6a7282] mb-2">Due: {assignment.dueDate}</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(assignment.submittedCount / assignment.totalStudents) * 100}%`,
                                    backgroundColor: assignment.color
                                  }}
                                />
                              </div>
                              <span className="text-[10px]" style={{ color: assignment.color }}>
                                {assignment.submittedCount}/{assignment.totalStudents}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05)] h-full">
              <div className="mb-5">
                <RetroTitle
                  text="AI Assistant"
                  className="text-[24px]"
                  color="#B882B1"
                />
              </div>
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>AI Chatbot coming soon</p>
                <p className="text-sm mt-2">Get help with course creation and management</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <FloatingActionMenu sessions={upcomingSessions} />
    </>
  );
}