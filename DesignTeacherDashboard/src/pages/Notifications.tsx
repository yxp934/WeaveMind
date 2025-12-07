import { useState } from 'react';
import { ArrowLeft, Bell, BookOpen, FileText, MessageSquare, Users, Zap } from 'lucide-react';
import Navigation from '../components/Navigation';
import FloatingActionMenu from '../components/FloatingActionMenu';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface NotificationsProps {
  onBack: () => void;
  onNavigateToClass?: (classId: number) => void;
  onNavigateToSession?: (sessionId: number) => void;
  onNavigateToAssignment?: (assignmentId: number) => void;
  onNavigateToSettings?: () => void;
  onNavigateToDiscussions?: () => void;
}

type NotificationType = 'system' | 'interaction';
type FilterType = 'all' | 'system' | 'interactions' | 'unread';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  avatar?: string;
  userName?: string;
  icon?: 'class' | 'session' | 'assignment' | 'discussion' | 'submission';
  actionable?: boolean;
  relatedId?: number;
  relatedType?: 'class' | 'session' | 'assignment' | 'discussion';
}

export default function Notifications({ 
  onBack, 
  onNavigateToClass,
  onNavigateToSession,
  onNavigateToAssignment,
  onNavigateToSettings,
  onNavigateToDiscussions
}: NotificationsProps) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const teacherData = {
    avatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    name: 'Prof. Sarah Chen',
    organization: 'Stanford University'
  };

  const notifications: Notification[] = [
    {
      id: 1,
      type: 'system',
      title: 'Neural Networks Deep Dive',
      description: 'Session created successfully',
      timestamp: '2 hours ago',
      isRead: false,
      icon: 'session',
      actionable: true,
      relatedId: 0,
      relatedType: 'session'
    },
    {
      id: 2,
      type: 'system',
      title: 'Final Project Presentation',
      description: 'Assignment created successfully',
      timestamp: '5 hours ago',
      isRead: false,
      icon: 'assignment',
      actionable: true,
      relatedId: 1,
      relatedType: 'assignment'
    },
    {
      id: 3,
      type: 'interaction',
      title: 'Student posted a discussion',
      description: 'Alex Johnson posted in Machine Learning Fundamentals',
      timestamp: '1 day ago',
      isRead: true,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      userName: 'Alex Johnson',
      icon: 'discussion',
      actionable: false
    },
    {
      id: 4,
      type: 'interaction',
      title: 'New assignment submission',
      description: 'Emma Davis submitted Neural Network Project',
      timestamp: '1 day ago',
      isRead: true,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      userName: 'Emma Davis',
      icon: 'submission',
      actionable: false
    },
    {
      id: 5,
      type: 'interaction',
      title: 'Upcoming session reminder',
      description: 'You have a session "Neural Networks Deep Dive" in 2 days',
      timestamp: '2 days ago',
      isRead: false,
      icon: 'session',
      actionable: false
    },
    {
      id: 6,
      type: 'system',
      title: 'Machine Learning Fundamentals',
      description: 'Class created successfully',
      timestamp: '3 days ago',
      isRead: true,
      icon: 'class',
      actionable: true,
      relatedId: 0,
      relatedType: 'class'
    },
    {
      id: 7,
      type: 'interaction',
      title: 'Multiple submissions received',
      description: '5 students submitted their assignments for Neural Network Project',
      timestamp: '3 days ago',
      isRead: true,
      icon: 'submission',
      actionable: false
    },
    {
      id: 8,
      type: 'interaction',
      title: 'Discussion activity',
      description: 'Michael Chen replied to a discussion in Deep Learning Basics',
      timestamp: '4 days ago',
      isRead: true,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      userName: 'Michael Chen',
      icon: 'discussion',
      actionable: false
    }
  ];

  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'system') return notification.type === 'system';
    if (activeFilter === 'interactions') return notification.type === 'interaction';
    if (activeFilter === 'unread') return !notification.isRead;
    return true;
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.actionable || !notification.relatedType || notification.relatedId === undefined) return;

    if (notification.relatedType === 'class' && onNavigateToClass) {
      onNavigateToClass(notification.relatedId);
    } else if (notification.relatedType === 'session' && onNavigateToSession) {
      onNavigateToSession(notification.relatedId);
    } else if (notification.relatedType === 'assignment' && onNavigateToAssignment) {
      onNavigateToAssignment(notification.relatedId);
    } else if (notification.relatedType === 'discussion' && onNavigateToDiscussions) {
      onNavigateToDiscussions();
    }
  };

  const getIconComponent = (icon?: string) => {
    switch (icon) {
      case 'class':
        return <BookOpen className="size-4" />;
      case 'session':
        return <Bell className="size-4" />;
      case 'assignment':
        return <FileText className="size-4" />;
      case 'discussion':
        return <MessageSquare className="size-4" />;
      case 'submission':
        return <Users className="size-4" />;
      default:
        return <Zap className="size-4" />;
    }
  };

  const getIconColor = (icon?: string) => {
    switch (icon) {
      case 'class':
      case 'assignment':
        return 'bg-[#B882B1]';
      case 'session':
        return 'bg-[#3FA11B]';
      case 'discussion':
        return 'bg-[#6a7282]';
      case 'submission':
        return 'bg-[#3FA11B]';
      default:
        return 'bg-[#6a7282]';
    }
  };

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
    <div className="min-h-screen bg-[#f3e8f4]">
      <Navigation 
        userName={teacherData.name} 
        userAvatar={teacherData.avatar} 
        organization={teacherData.organization} 
        onNavigateToHome={onBack}
        onNavigateToNotifications={onBack}
        onNavigateToSettings={onNavigateToSettings}
        onNavigateToDiscussions={onNavigateToDiscussions}
      />

      <div className="px-8 py-6 max-w-[1400px] mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors mb-6"
        >
          <ArrowLeft className="size-5" />
          <span className="text-[14px]">Back to Dashboard</span>
        </button>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[42px] leading-[1.1] mb-2">
            Notifications
          </h1>
          <p className="text-[#6a7282] text-[16px]">
            Stay updated with your classes, sessions, and student activities
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
          <div className="flex items-center border-b border-[#e4e8ee]">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex-1 px-8 py-4 text-[16px] font-medium transition-all relative ${
                activeFilter === 'all'
                  ? 'text-[#B882B1]'
                  : 'text-[#6a7282] hover:text-[#B882B1]'
              }`}
            >
              All
              {activeFilter === 'all' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#B882B1]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveFilter('system')}
              className={`flex-1 px-8 py-4 text-[16px] font-medium transition-all relative ${
                activeFilter === 'system'
                  ? 'text-[#B882B1]'
                  : 'text-[#6a7282] hover:text-[#B882B1]'
              }`}
            >
              System
              {activeFilter === 'system' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#B882B1]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveFilter('interactions')}
              className={`flex-1 px-8 py-4 text-[16px] font-medium transition-all relative ${
                activeFilter === 'interactions'
                  ? 'text-[#B882B1]'
                  : 'text-[#6a7282] hover:text-[#B882B1]'
              }`}
            >
              Interactions
              {activeFilter === 'interactions' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#B882B1]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`flex-1 px-8 py-4 text-[16px] font-medium transition-all relative ${
                activeFilter === 'unread'
                  ? 'text-[#B882B1]'
                  : 'text-[#6a7282] hover:text-[#B882B1]'
              }`}
            >
              Unread ({notifications.filter(n => !n.isRead).length})
              {activeFilter === 'unread' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#B882B1]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-16 text-center"
              >
                <Bell className="size-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[#6a7282] text-[16px]">No notifications found</p>
              </motion.div>
            ) : (
              filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`relative p-6 border-b border-[#e4e8ee] last:border-b-0 transition-all ${
                    notification.actionable 
                      ? 'hover:bg-[#f9f9f9] cursor-pointer' 
                      : 'cursor-default'
                  } ${!notification.isRead ? 'bg-[#f9f3fc]' : ''}`}
                >
                  {/* Unread Indicator */}
                  {!notification.isRead && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                      <div className="size-2 bg-[#B882B1] rounded-full" />
                    </div>
                  )}

                  <div className="flex gap-4 pl-4">
                    {/* Avatar or Icon */}
                    {notification.type === 'system' ? (
                      <div className={`size-10 rounded-full ${getIconColor(notification.icon)} flex items-center justify-center text-white shrink-0`}>
                        {getIconComponent(notification.icon)}
                      </div>
                    ) : (
                      <img
                        src={notification.avatar || teacherData.avatar}
                        alt={notification.userName || 'User'}
                        className="size-10 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
                      />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h3 className="text-[15px] text-[#101828]">
                          {notification.type === 'interaction' && notification.userName && (
                            <span className="font-semibold">{notification.userName} </span>
                          )}
                          <span className={notification.type === 'system' ? 'font-semibold' : ''}>
                            {notification.title}
                          </span>
                        </h3>
                        {notification.actionable && (
                          <div className="flex items-center gap-1 text-[#B882B1] text-[12px] shrink-0">
                            <span>View</span>
                            <ArrowLeft className="size-3 rotate-180" />
                          </div>
                        )}
                      </div>
                      <p className="text-[14px] text-[#6a7282] mb-2">
                        {notification.description}
                      </p>
                      <p className="text-[12px] text-[#a5acb8]">
                        {notification.timestamp}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <FloatingActionMenu sessions={upcomingSessions} />
    </div>
  );
}