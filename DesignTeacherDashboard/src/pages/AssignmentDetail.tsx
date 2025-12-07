import { useState } from 'react';
import { ArrowLeft, Eye, CheckCircle, Clock, FileText, Trash2 } from 'lucide-react';
import Navigation from '../components/Navigation';
import AIChatbot from '../components/AIChatbot';
import FloatingActionMenu from '../components/FloatingActionMenu';
import { motion, AnimatePresence } from 'motion/react';

interface AssignmentDetailProps {
  assignmentId: number;
  onBack: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToDiscussions?: () => void;
  onNavigateToSubmission?: (submissionId: number) => void;
}

export default function AssignmentDetail({ assignmentId, onBack, onNavigateToNotifications, onNavigateToSettings, onNavigateToDiscussions, onNavigateToSubmission }: AssignmentDetailProps) {
  const [activeTab, setActiveTab] = useState<'graded' | 'ungraded'>('ungraded');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    // Logic to delete assignment
    console.log('Assignment deleted');
    setShowDeleteConfirmation(false);
    onBack(); // Navigate back after deletion
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const teacherData = {
    avatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    name: 'Prof. Sarah Chen',
    organization: 'Stanford University'
  };

  const assignmentData = {
    title: 'Neural Network Project',
    className: 'Machine Learning Fundamentals',
    description: 'Build and train a neural network from scratch to classify handwritten digits using the MNIST dataset. Document your approach, results, and analysis.',
    dueDate: 'Dec 10, 2024',
    totalStudents: 45,
    submittedCount: 38,
    gradedCount: 25
  };

  const submissions = [
    {
      id: 1,
      studentName: 'Alex Johnson',
      studentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      submittedAt: 'Dec 08, 2024 - 3:45 PM',
      status: 'graded',
      grade: 95
    },
    {
      id: 2,
      studentName: 'Emma Davis',
      studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      submittedAt: 'Dec 07, 2024 - 11:20 AM',
      status: 'graded',
      grade: 88
    },
    {
      id: 3,
      studentName: 'Michael Chen',
      studentAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      submittedAt: 'Dec 08, 2024 - 9:15 AM',
      status: 'pending',
      grade: null
    },
    {
      id: 4,
      studentName: 'Sophie Williams',
      studentAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      submittedAt: 'Dec 09, 2024 - 2:30 PM',
      status: 'pending',
      grade: null
    },
    {
      id: 5,
      studentName: 'David Martinez',
      studentAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      submittedAt: 'Dec 08, 2024 - 5:10 PM',
      status: 'graded',
      grade: 92
    }
  ];

  const gradedSubmissions = submissions.filter(s => s.status === 'graded');
  const ungradedSubmissions = submissions.filter(s => s.status === 'pending');

  const submissionRate = Math.round((assignmentData.submittedCount / assignmentData.totalStudents) * 100);
  const gradingRate = Math.round((assignmentData.gradedCount / assignmentData.submittedCount) * 100);

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
    }
  ];

  return (
    <>
      <Navigation userName={teacherData.name} userAvatar={teacherData.avatar} organization={teacherData.organization} onNavigateToHome={onBack} onNavigateToNotifications={onNavigateToNotifications} onNavigateToSettings={onNavigateToSettings} onNavigateToDiscussions={onNavigateToDiscussions} />
      
      <div className="px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors"
            >
              <ArrowLeft className="size-5" />
              <span className="text-[14px]">Back to Dashboard</span>
            </button>

            {/* Assignment Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm relative">
              <button
                onClick={handleDelete}
                className="absolute top-6 right-6 size-10 rounded-xl border-2 border-red-500 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="size-5" />
              </button>
              <h1 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[36px] leading-[1.1] mb-2 pr-16">
                {assignmentData.title}
              </h1>
              <p className="text-[#3FA11B] text-[18px] mb-3">{assignmentData.className}</p>
              <p className="text-[#6a7282] text-[16px] mb-3">{assignmentData.description}</p>
              
              {/* Simple Stats */}
              <div className="flex items-center gap-4 text-[14px]">
                <span className="text-[#6a7282]">Due: <span className="text-[#101828]">{assignmentData.dueDate}</span></span>
                <span className="text-[#6a7282]">·</span>
                <span className="text-[#6a7282]">Submitted: <span className="text-[#101828]">{assignmentData.submittedCount}/{assignmentData.totalStudents} ({submissionRate}%)</span></span>
                <span className="text-[#6a7282]">·</span>
                <span className="text-[#6a7282]">Graded: <span className="text-[#101828]">{assignmentData.gradedCount}/{assignmentData.submittedCount} ({gradingRate}%)</span></span>
              </div>
            </div>

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
                Ungraded ({assignmentData.submittedCount - assignmentData.gradedCount})
              </button>
              <button
                onClick={() => setActiveTab('graded')}
                className={`px-6 py-3 rounded-xl text-[14px] transition-all ${
                  activeTab === 'graded'
                    ? 'bg-[#6a7282] text-white shadow-md'
                    : 'bg-white text-[#6a7282] hover:bg-gray-50'
                }`}
              >
                Graded ({assignmentData.gradedCount})
              </button>
            </div>

            {/* Submissions List */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h2 className="font-['Slackey:Regular',sans-serif] text-[#101828] text-[24px] mb-6">
                {activeTab === 'ungraded' ? 'Ungraded Submissions' : 'Graded Submissions'}
              </h2>

              <div className="space-y-2.5">
                {(activeTab === 'ungraded' ? ungradedSubmissions : gradedSubmissions).map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-white rounded-[8px] border border-gray-200 p-3 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer"
                    onClick={() => onNavigateToSubmission && onNavigateToSubmission(submission.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={submission.studentAvatar}
                          alt={submission.studentName}
                          className="size-10 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="text-[14px] text-[#101828] mb-0.5">
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
                              <p className="text-[16px] text-[#3FA11B]">{submission.grade}</p>
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
                ))}
              </div>
            </div>

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
                    <h3 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[24px] leading-[1.1] mb-3 text-center">
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

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <AIChatbot initialContext={{ id: assignmentId, title: assignmentData.title, type: 'assignment' }} />
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <FloatingActionMenu sessions={upcomingSessions} />
    </>
  );
}