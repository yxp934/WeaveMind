'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, FileText, MapPin } from 'lucide-react';
import { Navigation } from '@/components/teacher/design';
import { FloatingActionMenu } from '@/components/teacher/FloatingActionMenu';
import SidebarChatbot from '@/components/SidebarChatbot';

interface NewSessionClientProps {
  classData: {
    id: string;
    name: string;
    description: string | null;
    organization_id: string;
  };
  nextSessionNumber: number;
  teacherData: {
    avatar: string;
    name: string;
    organization: string;
  };
  userId: string;
}

export function NewSessionClient({
  classData,
  nextSessionNumber,
  teacherData,
  userId,
}: NewSessionClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/classes/${classData.id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_number: nextSessionNumber,
          title: title.trim(),
          description: description.trim(),
          scheduled_date: scheduledDate,
          start_time: startTime,
          duration_minutes: duration,
          location: location.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      // Redirect to the new session detail page
      router.push(`/teacher/sessions/${data.session.id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the session');
      setIsSubmitting(false);
    }
  };

  const isFormValid = title.trim() && scheduledDate && startTime;

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
              onClick={() => router.push(`/teacher/classes/${classData.id}`)}
              className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors"
            >
              <ArrowLeft className="size-5" />
              <span className="text-[14px]">Back to Class</span>
            </button>

            {/* Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h1
                className="text-[#B882B1] text-[36px] leading-[1.1] mb-2"
                style={{ fontFamily: "'Slackey', cursive, sans-serif" }}
              >
                Create New Session
              </h1>
              <p className="text-[#6a7282] text-[16px] mb-4">
                Class: <span className="font-medium text-[#101828]">{classData.name}</span>
              </p>
              <p className="text-[#6a7282] text-[14px]">
                Session #{nextSessionNumber}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-sm space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Session Title */}
              <div>
                <label className="block text-[#101828] text-[14px] font-medium mb-2">
                  Session Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Introduction to Machine Learning"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B882B1] focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[#101828] text-[14px] font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will be covered in this session?"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B882B1] focus:border-transparent resize-none"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#101828] text-[14px] font-medium mb-2">
                    <Calendar className="inline size-4 mr-1" />
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B882B1] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#101828] text-[14px] font-medium mb-2">
                    <Clock className="inline size-4 mr-1" />
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B882B1] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Duration and Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#101828] text-[14px] font-medium mb-2">
                    <Clock className="inline size-4 mr-1" />
                    Duration (minutes)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B882B1] focus:border-transparent"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#101828] text-[14px] font-medium mb-2">
                    <MapPin className="inline size-4 mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Classroom or Zoom link"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B882B1] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.push(`/teacher/classes/${classData.id}`)}
                  className="px-6 py-3 border border-gray-200 text-[#6a7282] rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className="px-8 py-3 bg-[#B882B1] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileText className="size-5" />
                  {isSubmitting ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <SidebarChatbot
              userRole="teacher"
              userId={userId}
              classId={classData.id}
              contexts={{
                classes: [{ id: classData.id, title: classData.name }],
                sessions: [],
                assignments: [],
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <FloatingActionMenu sessions={[]} />
    </div>
  );
}

export default NewSessionClient;
