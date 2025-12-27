'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, Clock, Video, MapPin, FileText, Users, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation } from '@/components/teacher/design';
import { FloatingActionMenu } from '@/components/teacher/FloatingActionMenu';
import SidebarChatbot from '@/components/SidebarChatbot';

interface Session {
  id: string;
  title: string;
  date: string;
  dateIso?: string | null;
  time: string;
  location: string;
  duration: string;
  hasContent: boolean;
  componentsCount: number;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  totalStudents: number;
  submittedCount: number;
}

interface ClassDetailClientProps {
  classData: {
    id: string;
    title: string;
    description: string;
    students: number;
    totalSessions: number;
    totalAssignments: number;
    joinCode: string;
  };
  sessions: Session[];
  assignments: Assignment[];
  teacherData: {
    avatar: string;
    name: string;
    organization: string;
  };
  userId: string;
}

export function ClassDetailClient({
  classData,
  sessions,
  assignments,
  teacherData,
  userId,
}: ClassDetailClientProps) {
  const router = useRouter();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteAssignment = (id: string) => {
    setItemToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/assignments/${itemToDelete}/delete`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete assignment');
      }

      setShowDeleteConfirmation(false);
      setItemToDelete(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setItemToDelete(null);
  };

  const upcomingSessions = sessions.map(s => ({
    title: s.title,
    className: classData.title,
    date: s.date.split(',')[0] || s.date,
    dateIso: s.dateIso || null,
    time: s.time,
    duration: s.duration,
    location: s.location,
    isOnline: s.location.toLowerCase().includes('zoom') || s.location.toLowerCase().includes('online') || s.location.includes('线上'),
    color: '#3FA11B'
  }));

  return (
    <div className="min-h-screen bg-[#f3e8f4]">
      <Navigation
        userName={teacherData.name}
        userAvatar={teacherData.avatar}
        organization={teacherData.organization}
        onNavigateToHome={() => router.push('/teacher')}
        onNavigateToSettings={() => router.push('/teacher/settings')}
        onNavigateToNotifications={() => router.push('/teacher/notifications')}
        onNavigateToDiscussions={() => router.push('/teacher/discussions')}
      />

      <div className="px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Back Button */}
            <button
              onClick={() => router.push('/teacher')}
              className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors"
            >
              <ArrowLeft className="size-5" />
              <span className="text-[14px]">Back to Dashboard</span>
            </button>

            {/* Class Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h1
                className="text-[#B882B1] text-[36px] leading-[1.1] mb-3"
                style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
              >
                {classData.title}
              </h1>
              <p className="text-[#6a7282] text-[16px] mb-3">
                {classData.description || 'No description provided'}
              </p>

              {/* Simple Stats */}
              <div className="flex items-center gap-4 text-[14px] text-[#6a7282]">
                <span>{classData.students} Students</span>
                <span>.</span>
                <span>{classData.totalSessions} Sessions</span>
                <span>.</span>
                <span>{classData.totalAssignments} Assignments</span>
                <span>.</span>
                <span className="font-mono text-[#B882B1]">Code: {classData.joinCode}</span>
              </div>
            </div>

            {/* Sessions Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-[#3FA11B] text-[28px]"
                  style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
                >
                  Sessions
                </h2>
                <button
                  onClick={() => router.push(`/teacher/classes/${classData.id}/sessions/new`)}
                  className="size-12 rounded-xl bg-[#3FA11B] flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
                >
                  <Plus className="size-6 text-white" />
                </button>
              </div>

              {sessions.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-white rounded-[8px] border border-gray-200 p-2.5 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer relative group"
                      onClick={() => router.push(`/teacher/sessions/${session.id}`)}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`${session.hasContent ? 'size-8 rounded-lg' : 'size-1.5 rounded-full mt-1.5'} shrink-0 flex items-center justify-center bg-[#3FA11B]`}
                        >
                          {session.hasContent && (
                            <span className="text-white text-[12px]">{session.componentsCount}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-[#101828] text-[12px] mb-0.5 truncate font-medium">{session.title}</h5>

                          <div className="grid grid-cols-2 gap-1 text-[10px] text-[#6a7282] mt-1.5">
                            <div className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              <span>{session.date.split(',')[0]}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="size-3" />
                              <span>{session.time}</span>
                            </div>
                            <div className="flex items-center gap-1 col-span-2">
                              {session.location.toLowerCase().includes('zoom') || session.location.includes('线上') ? (
                                <>
                                  <Video className="size-3" />
                                  <span>{session.location}</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="size-3" />
                                  <span>{session.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#6a7282] text-[14px] mb-4">No sessions yet</p>
                  <button
                    onClick={() => router.push(`/teacher/classes/${classData.id}/sessions/new`)}
                    className="px-6 py-3 bg-[#3FA11B] text-white rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Create First Session
                  </button>
                </div>
              )}
            </div>

            {/* Assignments Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-[#B882B1] text-[28px]"
                  style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
                >
                  Assignments
                </h2>
                <button
                  onClick={() => router.push(`/teacher/classes/${classData.id}/assignments/new`)}
                  className="size-12 rounded-xl bg-[#B882B1] flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
                >
                  <Plus className="size-6 text-white" />
                </button>
              </div>

              {assignments.length > 0 ? (
                <div className="space-y-2.5">
                  {assignments.map((assignment) => {
                    const submissionRate = assignment.totalStudents > 0
                      ? Math.round((assignment.submittedCount / assignment.totalStudents) * 100)
                      : 0;

                    return (
                      <div
                        key={assignment.id}
                        onClick={() => router.push(`/teacher/assignments/${assignment.id}`)}
                        className="bg-white rounded-[8px] border border-gray-200 p-2.5 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer relative group"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAssignment(assignment.id);
                          }}
                          className="absolute top-2 right-2 size-6 rounded-md border-2 border-red-500 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                        <div className="flex items-start gap-2">
                          <div
                            className="size-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: 'rgba(184, 130, 177, 0.2)' }}
                          >
                            <FileText className="size-3.5" style={{ color: '#B882B1' }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5 className="text-[#101828] text-[12px] mb-0.5 truncate font-medium">{assignment.title}</h5>

                            <div className="flex items-center gap-1.5 text-[10px] text-[#6a7282] mb-1.5">
                              <span>Due: {assignment.dueDate}</span>
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1 text-[#6a7282]">
                                  <Users className="size-3" />
                                  <span>Submissions</span>
                                </div>
                                <span className="text-[#101828] font-medium">{assignment.submittedCount}/{assignment.totalStudents}</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${submissionRate}%`, backgroundColor: '#B882B1' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#6a7282] text-[14px] mb-4">No assignments yet</p>
                  <button
                    onClick={() => router.push(`/teacher/classes/${classData.id}/assignments/new`)}
                    className="px-6 py-3 bg-[#B882B1] text-white rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Create First Assignment
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <SidebarChatbot
              userRole="teacher"
              userId={userId}
              classId={classData.id}
              initialSelectedContexts={[
                { id: classData.id, title: classData.title, type: "class" },
              ]}
              contexts={{
                classes: [{ id: classData.id, title: classData.title }],
                sessions: sessions.map((s) => ({
                  id: s.id,
                  title: s.title,
                  className: classData.title,
                })),
                assignments: assignments.map((a) => ({
                  id: a.id,
                  title: a.title,
                  className: classData.title,
                })),
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <FloatingActionMenu sessions={upcomingSessions} />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-2xl w-[360px]"
            >
              <h3
                className="text-[#B882B1] text-[24px] leading-[1.1] mb-3 text-center"
                style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
              >
                Confirm Delete
              </h3>
              <p className="text-[#6a7282] text-[15px] mb-8 text-center">
                Are you sure you want to delete this assignment?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={cancelDelete}
                  className="px-6 py-2.5 rounded-xl bg-gray-200 text-gray-700 text-[14px] hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-2.5 rounded-xl bg-red-500 text-white text-[14px] hover:opacity-90 transition-opacity shadow-md"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ClassDetailClient;
