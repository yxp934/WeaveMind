'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, CheckCircle, Clock, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation } from '@/components/teacher/design';
import { FloatingActionMenu } from '@/components/teacher/FloatingActionMenu';
import SidebarChatbot from '@/components/SidebarChatbot';

interface Submission {
  id: string;
  studentName: string;
  studentAvatar: string;
  submittedAt: string;
  status: 'pending' | 'graded';
  grade: number | null;
}

interface UpcomingSession {
  title: string;
  className: string;
  date: string;
  dateIso?: string | null;
  time: string;
  duration: string;
  location: string;
  isOnline: boolean;
  color: string;
}

interface AssignmentDetailClientProps {
  assignmentData: {
    id: string;
    title: string;
    className: string;
    classId: string;
    description: string;
    instructions: string;
    dueDate: string;
    totalStudents: number;
    submittedCount: number;
    gradedCount: number;
    maxScore: number;
  };
  submissions: Submission[];
  upcomingSessions: UpcomingSession[];
  teacherData: {
    avatar: string;
    name: string;
    organization: string;
  };
}

export function AssignmentDetailClient({
  assignmentData,
  submissions,
  upcomingSessions,
  teacherData
}: AssignmentDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'graded' | 'ungraded'>('ungraded');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/assignments/${assignmentData.id}/delete`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete assignment');
      }

      setShowDeleteConfirmation(false);
      router.push(`/teacher/classes/${assignmentData.classId}`);
    } catch (error) {
      console.error('Failed to delete assignment:', error);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const gradedSubmissions = submissions.filter(s => s.status === 'graded');
  const ungradedSubmissions = submissions.filter(s => s.status === 'pending');

  const submissionRate = assignmentData.totalStudents > 0
    ? Math.round((assignmentData.submittedCount / assignmentData.totalStudents) * 100)
    : 0;
  const gradingRate = assignmentData.submittedCount > 0
    ? Math.round((assignmentData.gradedCount / assignmentData.submittedCount) * 100)
    : 0;

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
              onClick={() => router.push(`/teacher/classes/${assignmentData.classId}`)}
              className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors"
            >
              <ArrowLeft className="size-5" />
              <span className="text-[14px]">Back to Class</span>
            </button>

            {/* Assignment Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm relative">
              <button
                onClick={handleDelete}
                className="absolute top-6 right-6 size-10 rounded-xl border-2 border-red-500 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="size-5" />
              </button>
              <h1
                className="text-[#B882B1] text-[36px] leading-[1.1] mb-2 pr-16"
                style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
              >
                {assignmentData.title}
              </h1>
              <p className="text-[#3FA11B] text-[18px] mb-3">{assignmentData.className}</p>
              <p className="text-[#6a7282] text-[16px] mb-3">{assignmentData.description}</p>

              {/* Simple Stats */}
              <div className="flex items-center gap-4 text-[14px]">
                <span className="text-[#6a7282]">Due: <span className="text-[#101828]">{assignmentData.dueDate}</span></span>
                <span className="text-[#6a7282]">.</span>
                <span className="text-[#6a7282]">Submitted: <span className="text-[#101828]">{assignmentData.submittedCount}/{assignmentData.totalStudents} ({submissionRate}%)</span></span>
                <span className="text-[#6a7282]">.</span>
                <span className="text-[#6a7282]">Graded: <span className="text-[#101828]">{assignmentData.gradedCount}/{assignmentData.submittedCount} ({gradingRate}%)</span></span>
              </div>
            </div>

            {/* Instructions Section */}
            {assignmentData.instructions && (
              <div className="bg-white rounded-3xl p-8 shadow-sm">
                <h2
                  className="text-[#B882B1] text-[24px] mb-4"
                  style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
                >
                  Instructions
                </h2>
                <p className="text-[#6a7282] text-[14px] whitespace-pre-wrap">{assignmentData.instructions}</p>
              </div>
            )}

            {/* Tab Toggle */}
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('ungraded')}
                className={`px-6 py-3 rounded-xl text-[14px] transition-all ${
                  activeTab === 'ungraded'
                    ? 'bg-[#3FA11B] text-white shadow-md'
                    : 'bg-white text-[#6a7282] hover:bg-gray-50'
                }`}
              >
                Ungraded ({ungradedSubmissions.length})
              </button>
              <button
                onClick={() => setActiveTab('graded')}
                className={`px-6 py-3 rounded-xl text-[14px] transition-all ${
                  activeTab === 'graded'
                    ? 'bg-[#6a7282] text-white shadow-md'
                    : 'bg-white text-[#6a7282] hover:bg-gray-50'
                }`}
              >
                Graded ({gradedSubmissions.length})
              </button>
            </div>

            {/* Submissions List */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h2
                className="text-[#101828] text-[24px] mb-6"
                style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
              >
                {activeTab === 'ungraded' ? 'Ungraded Submissions' : 'Graded Submissions'}
              </h2>

              <div className="space-y-2.5">
                {(activeTab === 'ungraded' ? ungradedSubmissions : gradedSubmissions).length > 0 ? (
                  (activeTab === 'ungraded' ? ungradedSubmissions : gradedSubmissions).map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-white rounded-[8px] border border-gray-200 p-3 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer"
                      onClick={() => router.push(`/teacher/submissions/${submission.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={submission.studentAvatar}
                            alt={submission.studentName}
                            className="size-10 rounded-full object-cover"
                          />
                          <div>
                            <h3 className="text-[14px] text-[#101828] mb-0.5 font-medium">
                              {submission.studentName}
                            </h3>
                            <p className="text-[10px] text-[#6a7282] flex items-center gap-1">
                              <Clock className="size-3" />
                              {submission.submittedAt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {submission.status === 'graded' ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="size-4 text-[#3FA11B]" />
                              <div className="text-right">
                                <p className="text-[10px] text-[#6a7282]">Grade</p>
                                <p className="text-[16px] text-[#3FA11B] font-medium">{submission.grade}/{assignmentData.maxScore}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 rounded-lg bg-[#FFF3E0] text-[#F59E0B] text-[10px]">
                              Pending Review
                            </div>
                          )}
                          <button className="size-8 rounded-lg border border-gray-200 hover:border-[#3FA11B] hover:bg-[#3FA11B] hover:text-white transition-all flex items-center justify-center">
                            <Eye className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="size-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-[#6a7282] text-[14px]">
                      {activeTab === 'ungraded' ? 'No ungraded submissions' : 'No graded submissions yet'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <SidebarChatbot
              userRole="teacher"
              classId={assignmentData.classId}
              initialSelectedContexts={[
                {
                  id: assignmentData.classId,
                  title: assignmentData.className,
                  type: "class",
                },
                {
                  id: assignmentData.id,
                  title: assignmentData.title,
                  type: "assignment",
                },
              ]}
              contexts={{
                classes: [{ id: assignmentData.classId, title: assignmentData.className }],
                sessions: [],
                assignments: [{ id: assignmentData.id, title: assignmentData.title, className: assignmentData.className }],
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

export default AssignmentDetailClient;
