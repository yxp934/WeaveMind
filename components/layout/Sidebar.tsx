'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BookOpen,
  Users,
  MessageCircle,
  Bell,
  Settings,
  User,
  Target,
  Brain,
  Zap,
  BarChart3,
  Calendar,
  FileText,
  Award,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bot,
  Sparkles,
  Globe,
  Palette,
  Shield,
  Clock,
  Plus,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import UnifiedAIChat from '@/components/ai/UnifiedAIChat';

interface SidebarProps {
  userRole: 'teacher' | 'student' | 'self-learner';
  userName?: string;
  userAvatar?: string;
  className?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href?: string;
  badge?: string;
  children?: NavigationItem[];
  isNew?: boolean;
}

export function Sidebar({
  userRole,
  userName = 'User',
  userAvatar,
  className
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatMinimized, setAIChatMinimized] = useState(false);

  // 获取导航菜单项
  const getNavigationItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: 'dashboard',
        label: '仪表盘',
        icon: Home,
        href: `/${userRole}`
      },
      {
        id: 'courses',
        label: '课程管理',
        icon: BookOpen,
        children: [
          { id: 'courses-list', label: '课程列表', icon: BookOpen, href: `/${userRole}/courses` },
          { id: 'courses-create', label: '创建课程', icon: FileText, href: `/${userRole}/courses/create` }
        ]
      }
    ];

    if (userRole === 'teacher') {
      return [
        ...baseItems,
        {
          id: 'discussions',
          label: '讨论管理',
          icon: MessageCircle,
          href: `/${userRole}/discussions`,
          isNew: true
        },
        {
          id: 'students',
          label: '学生管理',
          icon: Users,
          children: [
            { id: 'students-list', label: '学生列表', icon: Users, href: `/${userRole}/students` },
            { id: 'students-progress', label: '学习进度', icon: TrendingUp, href: `/${userRole}/students/progress` },
            { id: 'students-analytics', label: '学习分析', icon: BarChart3, href: `/${userRole}/students/analytics` }
          ]
        },
        {
          id: 'assignments',
          label: '作业管理',
          icon: Target,
          children: [
            { id: 'assignments-list', label: '作业列表', icon: FileText, href: `/${userRole}/assignments` },
            { id: 'assignments-create', label: '创建作业', icon: Target, href: `/${userRole}/assignments/create` },
            { id: 'assignments-grading', label: '批改作业', icon: Award, href: `/${userRole}/assignments/grading` }
          ]
        },
        {
          id: 'analytics',
          label: '数据分析',
          icon: BarChart3,
          children: [
            { id: 'analytics-overview', label: '概览', icon: BarChart3, href: `/${userRole}/analytics` },
            { id: 'analytics-courses', label: '课程分析', icon: BookOpen, href: `/${userRole}/analytics/courses` },
            { id: 'analytics-students', label: '学生分析', icon: Users, href: `/${userRole}/analytics/students` }
          ]
        },
        {
          id: 'ai-tools',
          label: 'AI工具',
          icon: Brain,
          isNew: true,
          children: [
            { id: 'ai-course-generator', label: '课程生成', icon: Sparkles, href: `/${userRole}/ai/course-generator` },
            { id: 'ai-content-editor', label: '内容编辑', icon: FileText, href: `/${userRole}/ai/content-editor` },
            { id: 'ai-assessment', label: '智能评估', icon: Target, href: `/${userRole}/ai/assessment` },
            { id: 'ai-analytics', label: 'AI分析', icon: BarChart3, href: `/${userRole}/ai/analytics` }
          ]
        },
        {
          id: 'calendar',
          label: '日程管理',
          icon: Calendar,
          href: `/${userRole}/calendar`
        },
        {
          id: 'settings',
          label: '设置',
          icon: Settings,
          href: `/${userRole}/settings`,
          isNew: true
        }
      ];
    } else if (userRole === 'student') {
      return [
        ...baseItems,
        {
          id: 'discussions',
          label: '学习讨论',
          icon: MessageCircle,
          href: `/${userRole}/discussions`,
          isNew: true
        },
        {
          id: 'assignments',
          label: '我的作业',
          icon: Target,
          children: [
            { id: 'assignments-due', label: '待完成', icon: Clock, href: `/${userRole}/assignments/due` },
            { id: 'assignments-submitted', label: '已提交', icon: FileText, href: `/${userRole}/assignments/submitted` },
            { id: 'assignments-graded', label: '已评分', icon: Award, href: `/${userRole}/assignments/graded` }
          ]
        },
        {
          id: 'progress',
          label: '学习进度',
          icon: TrendingUp,
          children: [
            { id: 'progress-overview', label: '概览', icon: TrendingUp, href: `/${userRole}/progress` },
            { id: 'progress-courses', label: '课程进度', icon: BookOpen, href: `/${userRole}/progress/courses` },
            { id: 'progress-achievements', label: '成就', icon: Award, href: `/${userRole}/progress/achievements` }
          ]
        },
        {
          id: 'ai-assistant',
          label: 'AI助手',
          icon: Bot,
          isNew: true,
          children: [
            { id: 'ai-tutor', label: '学习辅导', icon: Bot, href: `/${userRole}/ai/tutor` },
            { id: 'ai-homework', label: '作业帮助', icon: Target, href: `/${userRole}/ai/homework` },
            { id: 'ai-study-plan', label: '学习计划', icon: Calendar, href: `/${userRole}/ai/study-plan` }
          ]
        },
        {
          id: 'calendar',
          label: '学习日历',
          icon: Calendar,
          href: `/${userRole}/calendar`
        },
        {
          id: 'settings',
          label: '个人设置',
          icon: Settings,
          href: `/${userRole}/settings`,
          isNew: true
        }
      ];
    } else {
      return [
        ...baseItems,
        {
          id: 'pathways',
          label: '学习路径',
          icon: Target,
          children: [
            { id: 'pathways-browse', label: '浏览路径', icon: Target, href: `/${userRole}/pathways` },
            { id: 'pathways-create', label: '创建路径', icon: Plus, href: `/${userRole}/pathways/create` },
            { id: 'pathways-progress', label: '进度跟踪', icon: TrendingUp, href: `/${userRole}/pathways/progress` }
          ],
          isNew: true
        },
        {
          id: 'resources',
          label: '学习资源',
          icon: BookOpen,
          children: [
            { id: 'resources-courses', label: '课程资源', icon: BookOpen, href: `/${userRole}/resources/courses` },
            { id: 'resources-books', label: '电子书', icon: FileText, href: `/${userRole}/resources/books` },
            { id: 'resources-videos', label: '视频教程', icon: Play, href: `/${userRole}/resources/videos` }
          ]
        },
        {
          id: 'community',
          label: '学习社区',
          icon: Users,
          children: [
            { id: 'community-discussions', label: '讨论区', icon: MessageCircle, href: `/${userRole}/community/discussions` },
            { id: 'community-groups', label: '学习小组', icon: Users, href: `/${userRole}/community/groups` },
            { id: 'community-events', label: '学习活动', icon: Calendar, href: `/${userRole}/community/events` }
          ]
        },
        {
          id: 'ai-coach',
          label: 'AI教练',
          icon: Brain,
          isNew: true,
          children: [
            { id: 'ai-personalized', label: '个性化指导', icon: User, href: `/${userRole}/ai/personalized` },
            { id: 'ai-goal-tracking', label: '目标跟踪', icon: Target, href: `/${userRole}/ai/goal-tracking` },
            { id: 'ai-skill-assessment', label: '技能评估', icon: Award, href: `/${userRole}/ai/skill-assessment` }
          ]
        },
        {
          id: 'analytics',
          label: '学习分析',
          icon: BarChart3,
          href: `/${userRole}/analytics`
        },
        {
          id: 'settings',
          label: '个人设置',
          icon: Settings,
          href: `/${userRole}/settings`,
          isNew: true
        }
      ];
    }
  };

  const navigationItems = getNavigationItems();

  // 切换展开状态
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // 获取角色显示名称
  const getRoleDisplayName = () => {
    return userRole === 'teacher' ? '教师' : userRole === 'student' ? '学生' : '自学习者';
  };

  // 获取角色颜色
  const getRoleColor = () => {
    return userRole === 'teacher' ? 'bg-blue-100 text-blue-800' :
           userRole === 'student' ? 'bg-green-100 text-green-800' :
           'bg-purple-100 text-purple-800';
  };

  return (
    <>
      {/* 侧边栏 */}
      <motion.div
        className={cn(
          "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 flex flex-col transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          className
        )}
        initial={false}
        animate={{ width: isCollapsed ? 64 : 256 }}
      >
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-900">WeaveMind</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* 用户信息 */}
        {!isCollapsed && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <img
                  src={userAvatar || '/default-avatar.png'}
                  alt={userName}
                />
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{userName}</p>
                <Badge className={cn("text-xs", getRoleColor())}>
                  {getRoleDisplayName()}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* 导航菜单 */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-1">
            {navigationItems.map(item => (
              <div key={item.id}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className={cn(
                        "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                        "hover:bg-gray-100 text-gray-700"
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 font-medium">{item.label}</span>
                          <div className="flex items-center space-x-2">
                            {item.isNew && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                新
                              </Badge>
                            )}
                            {expandedItems.includes(item.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </>
                      )}
                    </button>
                    <AnimatePresence>
                      {!isCollapsed && expandedItems.includes(item.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-8 space-y-1 mt-1">
                            {item.children.map(child => (
                              <a
                                key={child.id}
                                href={child.href}
                                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                              >
                                <child.icon className="w-4 h-4" />
                                <span>{child.label}</span>
                                {child.badge && (
                                  <Badge variant="secondary" className="text-xs">
                                    {child.badge}
                                  </Badge>
                                )}
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <a
                    href={item.href}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 font-medium">{item.label}</span>
                        {item.isNew && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            新
                          </Badge>
                        )}
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </a>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* 底部操作 */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-2">
            {/* AI助手入口 */}
            <Button
              onClick={() => setShowAIChat(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              size="sm"
            >
              <Bot className="w-4 h-4 mr-2" />
              {!isCollapsed && 'AI助手'}
            </Button>

            {/* 通知中心 */}
            <Button
              onClick={() => setShowNotifications(true)}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Bell className="w-4 h-4 mr-2" />
              {!isCollapsed && '通知'}
              <Badge variant="secondary" className="ml-auto text-xs">
                3
              </Badge>
            </Button>

            {/* 登出 */}
            <Button
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-900"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {!isCollapsed && '登出'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 通知中心 */}
      <NotificationCenter
        userId="current-user-id"
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        position="top-right"
      />

      {/* AI聊天界面 */}
      {showAIChat && (
        <UnifiedAIChat
          userRole={userRole}
          classId="current-class-id"
          isMinimized={aiChatMinimized}
          onMinimize={() => setAIChatMinimized(!aiChatMinimized)}
        />
      )}

      {/* 遮罩层 */}
      <AnimatePresence>
        {(showNotifications || (showAIChat && !aiChatMinimized)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-20 z-30"
            onClick={() => {
              setShowNotifications(false);
              setShowAIChat(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;