'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Video, MapPin, Users, Play, FileText, Plus, Trash2, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation } from '@/components/teacher/design';
import { FloatingActionMenu } from '@/components/teacher/FloatingActionMenu';
import { TeacherDashboardChat } from '@/components/teacher/TeacherDashboardChat';

interface ComponentData {
  id: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'question' | 'interactive';
  duration?: string;
}

interface SessionDetailClientProps {
  sessionData: {
    id: string;
    title: string;
    description: string;
    className: string;
    classId: string;
    date: string;
    time: string;
    endTime: string;
    location: string;
    isOnline: boolean;
    studentsCount: number;
    status: 'upcoming' | 'in_progress' | 'completed';
  };
  components: ComponentData[];
  teacherData: {
    avatar: string;
    name: string;
    organization: string;
  };
}

export function SessionDetailClient({
  sessionData,
  components,
  teacherData
}: SessionDetailClientProps) {
  const router = useRouter();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    // API call to delete session
    console.log('Deleting session:', sessionData.id);
    setShowDeleteConfirmation(false);
    router.push(`/teacher/classes/${sessionData.classId}`);
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const upcomingSessions = [{
    id: parseInt(sessionData.id) || 0,
    title: sessionData.title,
    className: sessionData.className,
    date: sessionData.date,
    time: sessionData.time,
    duration: '1.5h',
    location: sessionData.location,
    isOnline: sessionData.isOnline,
    color: '#3FA11B'
  }];

  const getComponentIcon = (type: ComponentData['type']) => {
    switch (type) {
      case 'text':
        return <FileText className="size-4 text-[#B882B1]" />;
      case 'image':
        return <Play className="size-4 text-[#3FA11B]" />;
      case 'video':
        return <Video className="size-4 text-[#FF6B6B]" />;
      case 'question':
        return <FileText className="size-4 text-[#4ECDC4]" />;
      case 'interactive':
        return <Play className="size-4 text-[#FFE66D]" />;
      default:
        return <FileText className="size-4 text-gray-400" />;
    }
  };

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
              onClick={() => router.push(`/teacher/classes/${sessionData.classId}`)}
              className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors"
            >
              <ArrowLeft className="size-5" />
              <span className="text-[14px]">Back to Class</span>
            </button>

            {/* Session Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm relative">
              <div className="absolute top-6 right-6 flex items-center gap-2">
                <button
                  onClick={() => router.push(`/teacher/sessions/${sessionData.id}/edit`)}
                  className="size-10 rounded-xl border-2 border-[#B882B1] flex items-center justify-center text-[#B882B1] hover:bg-[#f3e8f4] transition-colors"
                >
                  <Edit className="size-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="size-10 rounded-xl border-2 border-red-500 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>

              <h1
                className="text-[#3FA11B] text-[36px] leading-[1.1] mb-2 pr-24"
                style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
              >
                {sessionData.title}
              </h1>
              <p className="text-[#B882B1] text-[18px] mb-3">{sessionData.className}</p>
              <p className="text-[#6a7282] text-[16px] mb-4">{sessionData.description || 'No description provided'}</p>

              {/* Session Details */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="flex items-center gap-2 text-[14px] text-[#6a7282]">
                  <Calendar className="size-5 text-[#3FA11B]" />
                  <span>{sessionData.date}</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-[#6a7282]">
                  <Clock className="size-5 text-[#3FA11B]" />
                  <span>{sessionData.time} - {sessionData.endTime}</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-[#6a7282]">
                  {sessionData.isOnline ? (
                    <Video className="size-5 text-[#3FA11B]" />
                  ) : (
                    <MapPin className="size-5 text-[#3FA11B]" />
                  )}
                  <span>{sessionData.location}</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-[#6a7282]">
                  <Users className="size-5 text-[#3FA11B]" />
                  <span>{sessionData.studentsCount} Students</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-6">
                <span
                  className={`inline-flex items-center px-4 py-2 rounded-full text-[14px] font-medium ${
                    sessionData.status === 'upcoming'
                      ? 'bg-blue-100 text-blue-700'
                      : sessionData.status === 'in_progress'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {sessionData.status === 'upcoming' && 'Upcoming'}
                  {sessionData.status === 'in_progress' && 'In Progress'}
                  {sessionData.status === 'completed' && 'Completed'}
                </span>
              </div>
            </div>

            {/* Session Content */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-[#B882B1] text-[28px]"
                  style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
                >
                  Session Content
                </h2>
                <button
                  onClick={() => router.push(`/teacher/sessions/${sessionData.id}/components/new`)}
                  className="size-12 rounded-xl bg-[#B882B1] flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
                >
                  <Plus className="size-6 text-white" />
                </button>
              </div>

              {components.length > 0 ? (
                <div className="space-y-3">
                  {components.map((component, index) => (
                    <div
                      key={component.id}
                      className="bg-white rounded-[8px] border border-gray-200 p-4 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[#6a7282] text-[14px] w-6">{index + 1}.</span>
                        <div
                          className="size-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(184, 130, 177, 0.2)' }}
                        >
                          {getComponentIcon(component.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[#101828] text-[14px] font-medium">{component.title}</h4>
                          <p className="text-[#6a7282] text-[12px] capitalize">{component.type}</p>
                        </div>
                        {component.duration && (
                          <span className="text-[#6a7282] text-[12px]">{component.duration}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="size-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-[#6a7282] text-[14px] mb-4">No content added yet</p>
                  <button
                    onClick={() => router.push(`/teacher/sessions/${sessionData.id}/components/new`)}
                    className="px-6 py-3 bg-[#B882B1] text-white rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Add First Component
                  </button>
                </div>
              )}
            </div>

            {/* Start Session Button */}
            {sessionData.status === 'upcoming' && (
              <div className="flex justify-center">
                <button className="px-8 py-4 bg-[#3FA11B] text-white rounded-2xl text-[16px] font-medium hover:opacity-90 transition-opacity shadow-lg flex items-center gap-3">
                  <Play className="size-5" />
                  Start Session
                </button>
              </div>
            )}
          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <TeacherDashboardChat
              classes={[{ id: parseInt(sessionData.classId) || 0, title: sessionData.className }]}
              sessions={[{ id: parseInt(sessionData.id) || 0, title: sessionData.title }]}
              assignments={[]}
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
                Are you sure you want to delete this session?
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

export default SessionDetailClient;
