'use client';

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, Settings, MessageSquare, Building2, BookOpen, Users, Clock, Video, MapPin, MoreHorizontal, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { createClient } from "@/lib/supabase/client"
import { RetroText } from '@/components/landing/RetroText'

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const classScrollRef = useRef<HTMLDivElement>(null);
  const sessionScrollRef = useRef<HTMLDivElement>(null);
  const assignmentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Auth error:', error);
          setError(error.message);
          setLoading(false);
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  // Mock data based on DesignTeacherDashboard
  const teacherData = {
    avatar: user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'Teacher')}&background=B882B1&color=fff`,
    name: user?.user_metadata?.full_name || 'Teacher',
    organization: user?.user_metadata?.organization || 'Your Organization'
  };

  const classes = [
    {
      id: 0,
      title: 'Machine Learning Fundamentals',
      instructor: teacherData.name,
      progress: 75,
      totalSessions: 24,
      completedSessions: 18,
      students: 45,
      color: '#B882B1'
    },
    {
      id: 1,
      title: 'Web Development & Design',
      instructor: teacherData.name,
      progress: 60,
      totalSessions: 20,
      completedSessions: 12,
      students: 38,
      color: '#B882B1'
    },
    {
      id: 2,
      title: 'Data Structures & Algorithms',
      instructor: teacherData.name,
      progress: 85,
      totalSessions: 18,
      completedSessions: 15,
      students: 52,
      color: '#B882B1'
    }
  ];

  const upcomingSessions = [
    {
      id: 0,
      title: 'Neural Networks Deep Dive',
      className: 'Machine Learning Fundamentals',
      date: 'Dec 06',
      time: '10:00 AM',
      duration: '2h',
      location: 'Zoom Meeting',
      isOnline: true,
      color: '#3FA11B'
    },
    {
      id: 1,
      title: 'React Hooks & State',
      className: 'Web Development',
      date: 'Dec 07',
      time: '2:00 PM',
      duration: '1.5h',
      location: 'Room B-204',
      isOnline: false,
      color: '#3FA11B'
    },
    {
      id: 2,
      title: 'Binary Trees Introduction',
      className: 'Data Structures',
      date: 'Dec 08',
      time: '11:00 AM',
      duration: '1.5h',
      location: 'Room A-101',
      isOnline: false,
      color: '#3FA11B'
    }
  ];

  const assignments = [
    {
      id: 0,
      title: 'Neural Network Project',
      className: 'Machine Learning',
      dueDate: 'Dec 10, 2024',
      totalStudents: 45,
      submittedCount: 38,
      color: '#B882B1'
    },
    {
      id: 1,
      title: 'Portfolio Website',
      className: 'Web Development',
      dueDate: 'Dec 08, 2024',
      totalStudents: 38,
      submittedCount: 35,
      color: '#B882B1'
    },
    {
      id: 2,
      title: 'Sorting Algorithms Analysis',
      className: 'Data Structures',
      dueDate: 'Dec 12, 2024',
      totalStudents: 52,
      submittedCount: 48,
      color: '#B882B1'
    }
  ];

  const scroll = (direction: 'left' | 'right', ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const scrollAmount = 300;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#B882B1] border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-3 bg-[#B882B1] text-white rounded-xl hover:bg-[#A172A1] transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access your teacher dashboard.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-3 bg-[#B882B1] text-white rounded-xl hover:bg-[#A172A1] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

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
              <div className="text-[#B882B1] text-[40px] leading-[1.1] mb-2 font-bold">
                Welcome Back! 👋
              </div>
              <p className="text-[#6a7282] text-[16px]">
                Let&apos;s manage your classes today
              </p>
            </div>

            {/* Classes Section - Horizontal Scroll */}
            <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05)] relative">
              <h2 className="text-[24px] mb-5 text-[#B882B1] font-bold">
                Classes
              </h2>

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
                <h2 className="text-[24px] mb-5 text-[#3FA11B] font-bold">
                  Upcoming Sessions
                </h2>
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
                <h2 className="text-[24px] mb-5 text-[#B882B1] font-bold">
                  Assignments
                </h2>
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
              <h2 className="text-[24px] mb-5 text-[#B882B1] font-bold">
                AI Assistant
              </h2>
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
      <div className="fixed bottom-6 right-6">
        <button className="bg-[#B882B1] hover:bg-[#A172A1] text-white rounded-full p-4 shadow-lg transition-all hover:scale-105">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}
