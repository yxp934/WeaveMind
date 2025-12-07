import { useRef } from 'react';
import Navigation from '../components/Navigation';
import ClassCard from '../components/ClassCard';
import SessionCard from '../components/SessionCard';
import TeacherAssignmentCard from '../components/TeacherAssignmentCard';
import AIChatbot from '../components/AIChatbot';
import SectionCard from '../components/SectionCard';
import FloatingActionMenu from '../components/FloatingActionMenu';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  onNavigateToClass: (classId: number) => void;
  onNavigateToSession: (sessionId: number) => void;
  onNavigateToAssignment: (assignmentId: number) => void;
  onNavigateToSettings: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToDiscussions?: () => void;
}

export default function Dashboard({ onNavigateToClass, onNavigateToSession, onNavigateToAssignment, onNavigateToSettings, onNavigateToNotifications, onNavigateToDiscussions }: DashboardProps) {
  const { t } = useLanguage();
  const classScrollRef = useRef<HTMLDivElement>(null);
  const sessionScrollRef = useRef<HTMLDivElement>(null);
  const assignmentScrollRef = useRef<HTMLDivElement>(null);

  const teacherData = {
    avatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    name: 'Prof. Sarah Chen',
    organization: 'Stanford University'
  };

  const classes = [
    {
      id: 0,
      title: 'Machine Learning Fundamentals',
      instructor: 'Dr. Sarah Chen',
      progress: 75,
      totalSessions: 24,
      completedSessions: 18,
      students: 45,
      color: '#B882B1'
    },
    {
      id: 1,
      title: 'Web Development & Design',
      instructor: 'Prof. Michael Roberts',
      progress: 60,
      totalSessions: 20,
      completedSessions: 12,
      students: 38,
      color: '#B882B1'
    },
    {
      id: 2,
      title: 'Data Structures & Algorithms',
      instructor: 'Dr. Sarah Chen',
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

  return (
    <>
      <Navigation 
        userName={teacherData.name} 
        userAvatar={teacherData.avatar} 
        organization={teacherData.organization} 
        onNavigateToSettings={onNavigateToSettings}
        onNavigateToHome={() => {}} // Already on dashboard
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToDiscussions={onNavigateToDiscussions}
      />
      
      <div className="px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Welcome Header */}
            <div className="mb-2">
              <h1 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[40px] leading-[1.1] mb-2">
                Welcome Back! 👋
              </h1>
              <p className="text-[#6a7282] text-[16px]">
                Let&apos;s manage your classes today
              </p>
            </div>

            {/* Classes Section - Horizontal Scroll */}
            <SectionCard title={t('dashboard.classes')}>
              <div 
                ref={classScrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {classes.map((classItem) => (
                  <div 
                    key={classItem.id} 
                    className="flex-none w-[calc(50%-8px)] cursor-pointer"
                    onClick={() => onNavigateToClass(classItem.id)}
                  >
                    <ClassCard {...classItem} />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Bottom Row: Upcoming Sessions and Assignments */}
            <div className="grid grid-cols-2 gap-6">
              {/* Upcoming Sessions - Vertical Scroll */}
              <SectionCard title={t('dashboard.upcomingSessions')} titleColor="#3FA11B">
                <div 
                  ref={sessionScrollRef}
                  className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide scroll-smooth pr-2"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {upcomingSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="cursor-pointer"
                      onClick={() => onNavigateToSession(session.id)}
                    >
                      <SessionCard {...session} />
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Assignments - Vertical Scroll */}
              <SectionCard title={t('dashboard.assignments')}>
                <div 
                  ref={assignmentScrollRef}
                  className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide scroll-smooth pr-2"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {assignments.map((assignment) => (
                    <div 
                      key={assignment.id}
                      className="cursor-pointer"
                      onClick={() => onNavigateToAssignment(assignment.id)}
                    >
                      <TeacherAssignmentCard {...assignment} />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <AIChatbot />
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <FloatingActionMenu sessions={upcomingSessions} />
    </>
  );
}