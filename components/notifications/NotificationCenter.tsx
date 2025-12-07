'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Settings,
  Filter,
  Search,
  MoreHorizontal,
  Info,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  MessageSquare,
  FileText,
  Calendar,
  Award,
  BookOpen,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// 通知类型
interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: string;
  action_url?: string;
  read_at?: string;
  created_at: string;
}

// 通知设置类型
interface NotificationSettings {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  discussion_notifications: boolean;
  assignment_notifications: boolean;
  grade_notifications: boolean;
}

interface NotificationCenterProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationCenter({
  userId,
  isOpen,
  onClose,
  position = 'top-right'
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 加载通知和设置
  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications();
      loadSettings();
    }
  }, [isOpen, userId]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.notifications.list(userId);
      setNotifications(data || []);

      // 计算未读数量
      const unread = data?.filter((n: Notification) => !n.read_at).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await apiClient.notifications.getSettings(userId);
      setSettings(data);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.notifications.markAsRead(notificationId);
      setNotifications(prev => prev.map(n =>
        n.id === notificationId
          ? { ...n, read_at: new Date().toISOString() }
          : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.notifications.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({
        ...n,
        read_at: n.read_at || new Date().toISOString()
      })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.notifications.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.read_at ? prev - 1 : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      await apiClient.notifications.updateSettings(userId, newSettings);
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  // 获取通知类型图标
  const getNotificationIcon = (type: string) => {
    const icons = {
      info: Info,
      success: CheckCircle,
      warning: AlertTriangle,
      error: XCircle
    };
    const IconComponent = icons[type as keyof typeof icons] || Info;
    return <IconComponent className="w-5 h-5" />;
  };

  // 获取通知类型颜色
  const getNotificationColor = (type: string) => {
    const colors = {
      info: 'text-blue-500 bg-blue-50',
      success: 'text-green-500 bg-green-50',
      warning: 'text-yellow-500 bg-yellow-50',
      error: 'text-red-500 bg-red-50'
    };
    return colors[type as keyof typeof colors] || 'text-gray-500 bg-gray-50';
  };

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    const icons = {
      discussion: MessageSquare,
      assignment: FileText,
      grade: Award,
      course: BookOpen,
      system: Settings,
      reminder: Calendar,
      ai: Zap,
      general: Bell
    };
    const IconComponent = icons[category as keyof typeof icons] || Bell;
    return <IconComponent className="w-4 h-4" />;
  };

  // 过滤通知
  const filteredNotifications = notifications.filter(notification => {
    const matchesCategory = selectedCategory === 'all' || notification.category === selectedCategory;
    const matchesType = selectedType === 'all' || notification.type === selectedType;
    const matchesSearch = searchTerm === '' ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesType && matchesSearch;
  });

  // 定位样式
  const getPositionStyles = () => {
    const styles = {
      'top-right': 'top-16 right-4',
      'top-left': 'top-16 left-4',
      'bottom-right': 'bottom-16 right-4',
      'bottom-left': 'bottom-16 left-4'
    };
    return styles[position];
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "fixed z-50 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border",
        getPositionStyles()
      )}
    >
      {/* 头部 */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">通知中心</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="h-8 w-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 设置面板 */}
      <AnimatePresence>
        {isSettingsOpen && settings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-gray-50"
          >
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-medium">通知设置</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">邮件通知</span>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => updateSettings({ email_notifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">推送通知</span>
                  <Switch
                    checked={settings.push_notifications}
                    onCheckedChange={(checked) => updateSettings({ push_notifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">讨论通知</span>
                  <Switch
                    checked={settings.discussion_notifications}
                    onCheckedChange={(checked) => updateSettings({ discussion_notifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">作业通知</span>
                  <Switch
                    checked={settings.assignment_notifications}
                    onCheckedChange={(checked) => updateSettings({ assignment_notifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">成绩通知</span>
                  <Switch
                    checked={settings.grade_notifications}
                    onCheckedChange={(checked) => updateSettings({ grade_notifications: checked })}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 搜索和过滤 */}
      <div className="p-4 border-b">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索通知..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex space-x-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="discussion">讨论</SelectItem>
                <SelectItem value="assignment">作业</SelectItem>
                <SelectItem value="grade">成绩</SelectItem>
                <SelectItem value="course">课程</SelectItem>
                <SelectItem value="ai">AI助手</SelectItem>
                <SelectItem value="system">系统</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="info">信息</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      {unreadCount > 0 && (
        <div className="p-3 border-b bg-blue-50">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="w-full"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            全部标记为已读
          </Button>
        </div>
      )}

      {/* 通知列表 */}
      <ScrollArea className="flex-1 h-96">
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              加载中...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无通知</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredNotifications.map(notification => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                      notification.read_at
                        ? "border-gray-200 bg-white"
                        : "border-blue-200 bg-blue-50"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        getNotificationColor(notification.type)
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={cn(
                            "text-sm font-medium line-clamp-1",
                            notification.read_at ? "text-gray-900" : "text-gray-900 font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className={cn(
                          "text-sm mt-1 line-clamp-2",
                          notification.read_at ? "text-gray-600" : "text-gray-700"
                        )}>
                          {notification.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              <div className="flex items-center space-x-1">
                                {getCategoryIcon(notification.category)}
                                <span>{notification.category}</span>
                              </div>
                            </Badge>
                            {!notification.read_at && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(notification.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

export default NotificationCenter;