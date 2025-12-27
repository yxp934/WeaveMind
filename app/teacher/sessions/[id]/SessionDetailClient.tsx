'use client';

import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { ArrowLeft, Calendar, Clock, Video, MapPin, Users, Play, FileText } from 'lucide-react';
import { Navigation } from '@/components/teacher/design';
import { FloatingActionMenu } from '@/components/teacher/FloatingActionMenu';
import SidebarChatbot from '@/components/SidebarChatbot';

interface ComponentData {
  id: string;
  type: 'text' | 'image' | 'video' | 'question' | 'interactive';
  content: any;
  orderIndex: number;
}

interface SessionDetailClientProps {
  sessionData: {
    id: string;
    title: string;
    description: string;
    className: string;
    classId: string;
    date: string;
    dateIso?: string | null;
    time: string;
    endTime: string;
    durationMinutes?: number | null;
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

  const durationLabel = sessionData.durationMinutes
    ? `${sessionData.durationMinutes}m`
    : '未设置';
  const upcomingSessions = [{
    title: sessionData.title,
    className: sessionData.className,
    date: sessionData.date,
    dateIso: sessionData.dateIso || null,
    time: sessionData.time,
    duration: durationLabel,
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

  const renderComponentTitle = (component: ComponentData, index: number) => {
    if (component.type === 'question') {
      const questionRaw = component.content?.question;
      const question =
        typeof questionRaw === 'string'
          ? questionRaw
          : questionRaw
            ? String(questionRaw)
            : '';
      if (typeof question === 'string' && question.trim()) {
        return question.trim();
      }
      return `Question ${index + 1}`;
    }

    if (component.type === 'text') {
      const rawText =
        typeof component.content === 'string'
          ? component.content
          : component.content?.text;
      const text = typeof rawText === 'string' ? rawText : '';
      if (typeof text === 'string' && text.trim()) {
        const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
        const heading = lines.find((line) => line.startsWith('#'));
        const title = heading ? heading.replace(/^#+\s*/, '').trim() : lines[0];
        return title || `Text ${index + 1}`;
      }
      return `Text ${index + 1}`;
    }

    return `Component ${index + 1}`;
  };

  const renderComponentContent = (component: ComponentData) => {
    if (component.type === 'text') {
      const rawText =
        typeof component.content === 'string'
          ? component.content
          : component.content?.text;
      const text = typeof rawText === 'string' ? rawText : '';
      if (!text) {
        return <p className="text-[#6a7282] text-[13px]">No text content provided.</p>;
      }
      return (
        <div className="prose prose-sm max-w-none text-[#101828]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
          >
            {text}
          </ReactMarkdown>
        </div>
      );
    }

    if (component.type === 'question') {
      const question = component.content?.question;
      const options = Array.isArray(component.content?.options)
        ? component.content.options
        : [];
      const rawAnswer = component.content?.correct_answer;
      const correctIndex =
        typeof rawAnswer === 'number'
          ? rawAnswer
          : typeof rawAnswer === 'string' && /^\d+$/.test(rawAnswer)
            ? Number(rawAnswer)
            : null;
      const explanation = component.content?.explanation;

      return (
        <div className="space-y-3 text-[13px] text-[#101828]">
          {question && (
            <p className="font-medium text-[#101828]">{question}</p>
          )}
          {options.length > 0 && (
            <ol className="space-y-1 list-decimal list-inside text-[#6a7282]">
              {options.map((option: string, optionIndex: number) => (
                <li
                  key={`${String(option)}-${optionIndex}`}
                  className={
                    correctIndex === optionIndex
                      ? 'text-[#3FA11B] font-medium'
                      : 'text-[#6a7282]'
                  }
                >
                  {String(option)}
                </li>
              ))}
            </ol>
          )}
          {correctIndex !== null && options[correctIndex] && (
            <p className="text-[#3FA11B]">
              Correct answer: {options[correctIndex]}
            </p>
          )}
          {explanation && (
            <p className="text-[#6a7282]">Explanation: {String(explanation)}</p>
          )}
        </div>
      );
    }

    return (
      <pre className="rounded-lg bg-[#f8f6f9] p-3 text-[12px] text-[#6a7282] overflow-x-auto">
        {JSON.stringify(component.content || {}, null, 2)}
      </pre>
    );
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
              </div>

              {components.length > 0 ? (
                <div className="space-y-4">
                  {components.map((component, index) => (
                    <div
                      key={component.id}
                      className="bg-white rounded-[12px] border border-gray-200 p-4 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all"
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
                          <h4 className="text-[#101828] text-[14px] font-medium">
                            {renderComponentTitle(component, index)}
                          </h4>
                          <p className="text-[#6a7282] text-[12px] capitalize">{component.type}</p>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        {renderComponentContent(component)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="size-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-[#6a7282] text-[14px]">No content added yet. Use the AI chatbot to generate this session.</p>
                </div>
              )}
            </div>

          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <SidebarChatbot
              userRole="teacher"
              classId={sessionData.classId}
              initialSelectedContexts={[
                {
                  id: sessionData.classId,
                  title: sessionData.className,
                  type: "class",
                },
                { id: sessionData.id, title: sessionData.title, type: "session" },
              ]}
              contexts={{
                classes: [{ id: sessionData.classId, title: sessionData.className }],
                sessions: [{ id: sessionData.id, title: sessionData.title, className: sessionData.className }],
                assignments: [],
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <FloatingActionMenu sessions={upcomingSessions} />
    </div>
  );
}

export default SessionDetailClient;
