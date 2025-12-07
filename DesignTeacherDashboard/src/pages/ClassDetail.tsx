import { ArrowLeft, Plus, Calendar, Clock, Video, MapPin, FileText, Users, Trash2 } from 'lucide-react';
import Navigation from '../components/Navigation';
import AIChatbot from '../components/AIChatbot';
import FloatingActionMenu from '../components/FloatingActionMenu';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ClassDetailProps {
  classId: number;
  onNavigateToSession: (sessionId: number) => void;
  onNavigateToAssignment: (assignmentId: number) => void;
  onBack: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToDiscussions?: () => void;
}

export default function ClassDetail({ classId, onNavigateToSession, onNavigateToAssignment, onBack, onNavigateToNotifications, onNavigateToSettings, onNavigateToDiscussions }: ClassDetailProps) {
  const teacherData = {
    avatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    name: 'Prof. Sarah Chen',
    organization: 'Stanford University'
  };

  const classData = {
    0: {
      title: 'Machine Learning Fundamentals',
      description: 'A comprehensive introduction to machine learning concepts, algorithms, and practical applications. Students will learn supervised and unsupervised learning techniques, neural networks, and real-world implementation strategies.',
      students: 45,
      totalSessions: 24,
      totalAssignments: 8,
      color: '#B882B1'
    },
    1: {
      title: 'Web Development & Design',
      description: 'Master modern web development using React, TypeScript, and contemporary design principles. Build responsive, accessible web applications with industry-standard tools and best practices.',
      students: 38,
      totalSessions: 20,
      totalAssignments: 6,
      color: '#B882B1'
    },
    2: {
      title: 'Data Structures & Algorithms',
      description: 'Deep dive into fundamental data structures and algorithms essential for technical interviews and efficient software development.',
      students: 52,
      totalSessions: 18,
      totalAssignments: 10,
      color: '#B882B1'
    }
  }[classId] || classData[0];

  const sessions = [
    {
      id: 0,
      title: 'Neural Networks Deep Dive',
      date: 'Dec 06, 2024',
      time: '10:00 AM',
      location: 'Zoom Meeting',
      hasContent: true,
      componentsCount: 12
    },
    {
      id: 1,
      title: 'Supervised Learning Basics',
      date: 'Dec 03, 2024',
      time: '2:00 PM',
      location: 'Room A-101',
      hasContent: true,
      componentsCount: 8
    },
    {
      id: 2,
      title: 'Reinforcement Learning',
      date: 'Dec 09, 2024',
      time: '11:00 AM',
      location: 'Zoom Meeting',
      hasContent: true,
      componentsCount: 10
    }
  ];

  const assignments = [
    {
      id: 0,
      title: 'Neural Network Project',
      dueDate: 'Dec 10, 2024',
      totalStudents: 45,
      submittedCount: 38
    },
    {
      id: 1,
      title: 'ML Algorithm Implementation',
      dueDate: 'Dec 15, 2024',
      totalStudents: 45,
      submittedCount: 12
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
    }
  ];

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'session' | 'assignment', id: number } | null>(null);

  const handleDelete = (type: 'session' | 'assignment', id: number) => {
    setItemToDelete({ type, id });
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === 'session') {
        // Logic to delete session
        const updatedSessions = sessions.filter(session => session.id !== itemToDelete.id);
        // Update sessions state or API call
      } else if (itemToDelete.type === 'assignment') {
        // Logic to delete assignment
        const updatedAssignments = assignments.filter(assignment => assignment.id !== itemToDelete.id);
        // Update assignments state or API call
      }
      setShowDeleteConfirmation(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

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

            {/* Class Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h1 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[36px] leading-[1.1] mb-3">
                {classData.title}
              </h1>
              <p className="text-[#6a7282] text-[16px] mb-3">
                {classData.description}
              </p>

              {/* Simple Stats */}
              <div className="flex items-center gap-4 text-[14px] text-[#6a7282]">
                <span>{classData.students} Students</span>
                <span>·</span>
                <span>{classData.totalSessions} Sessions</span>
                <span>·</span>
                <span>{classData.totalAssignments} Assignments</span>
              </div>
            </div>

            {/* Sessions Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-['Slackey:Regular',sans-serif] text-[#3FA11B] text-[28px]">
                  Sessions
                </h2>
                <button className="size-12 rounded-xl bg-[#3FA11B] flex items-center justify-center hover:opacity-90 transition-opacity shadow-md">
                  <Plus className="size-6 text-white" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-[8px] border border-gray-200 p-2.5 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer relative group"
                    onClick={() => onNavigateToSession(session.id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete('session', session.id);
                      }}
                      className="absolute top-2 right-2 size-6 rounded-md border-2 border-red-500 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <div className="flex items-start gap-2">
                      <div
                        className={`${session.hasContent ? 'size-8 rounded-lg' : 'size-1.5 rounded-full mt-1.5'} shrink-0 flex items-center justify-center`}
                        style={{ backgroundColor: '#3FA11B' }}
                      >
                        {session.hasContent && (
                          <span className="text-white text-[12px]">{session.componentsCount}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[#101828] text-[12px] mb-0.5 truncate">{session.title}</h5>
                        
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
                            {session.location.includes('Zoom') ? (
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
            </div>

            {/* Assignments Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[28px]">
                  Assignments
                </h2>
                <button className="size-12 rounded-xl bg-[#B882B1] flex items-center justify-center hover:opacity-90 transition-opacity shadow-md">
                  <Plus className="size-6 text-white" />
                </button>
              </div>

              <div className="space-y-2.5">
                {assignments.map((assignment) => {
                  const submissionRate = Math.round((assignment.submittedCount / assignment.totalStudents) * 100);
                  return (
                    <div
                      key={assignment.id}
                      onClick={() => onNavigateToAssignment(assignment.id)}
                      className="bg-white rounded-[8px] border border-gray-200 p-2.5 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer relative group"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete('assignment', assignment.id);
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
                          <h5 className="text-[#101828] text-[12px] mb-0.5 truncate">{assignment.title}</h5>
                          
                          <div className="flex items-center gap-1.5 text-[10px] text-[#6a7282] mb-1.5">
                            <span>Due: {assignment.dueDate}</span>
                          </div>
                          
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1 text-[#6a7282]">
                                <Users className="size-3" />
                                <span>Submissions</span>
                              </div>
                              <span className="text-[#101828]">{assignment.submittedCount}/{assignment.totalStudents}</span>
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
            </div>
          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <AIChatbot initialContext={{ id: classId, title: classData.title, type: 'class' }} />
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
              <h3 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[24px] leading-[1.1] mb-3 text-center">
                Confirm Delete
              </h3>
              <p className="text-[#6a7282] text-[15px] mb-8 text-center">
                Are you sure you want to delete this {itemToDelete?.type}?
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
    </>
  );
}