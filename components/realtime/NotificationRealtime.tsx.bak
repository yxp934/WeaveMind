/**
 * WeaveMind LMS 实时通知组件
 *
 * 这个组件提供实时通知功能，包括新通知推送、状态同步和批量操作。
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Filter,
  X,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  MessageCircle,
  FileText,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 导入实时hooks
import { useNotificationRealtime } from './hooks';
import { useRealtime } from './RealtimeProvider';
import { useSession } from '../auth/session-provider';

// 类型定义
interface NotificationRealtimeProps {
  userId?: string;
  className?: string;
  maxNotifications?: number;
  showBadge?: boolean;
  showActions?: boolean;
  showFilter?: boolean;
  autoOpen?: boolean;
  position?: 'dropdown' | 'sidebar' | 'overlay';
  onNotificationClick?: (notification: any) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
}

/**
 * 通知类型图标映射
 */
const notificationIcons = {
  assignment: FileText,
  message: MessageCircle,
  grade: CheckCircle,
  announcement: Bell,
  system: Settings,
  ai_suggestion: Info,
  default: Bell
};

/**
 * 通知类型颜色映射
 */
const notificationColors = {
  assignment: 'text-blue-600 bg-blue-50',
  message: 'text-green-600 bg-green-50',
  grade: 'text-purple-600 bg-purple-50',
  announcement: 'text-orange-600 bg-orange-50',
  system: 'text-gray-600 bg-gray-50',
  ai_suggestion: 'text-indigo-600 bg-indigo-50',
  default: 'text-blue-600 bg-blue-50'
};

/**
 * 实时通知组件
 *
 * 提供完整的实时通知功能，包括推送显示、状态管理和批量操作。
 */
export function NotificationRealtime({
  userId,
  className = '',
  maxNotifications = 20,
  showBadge = true,
  showActions = true,
  showFilter = true,
  autoOpen = false,
  position = 'dropdown',
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead
}: NotificationRealtimeProps) {
  const { user } = useSession();
  const effectiveUserId = userId || user?.id;

  // 状态管理
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [filter, setFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // 使用实时hooks
  const {
    notifications,
    stats,
    unreadCount,
    loading,
    error,
    connected,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationRealtime(effectiveUserId);

  // 使用实时上下文
  const { recordMessage, recordError, handleError } = useRealtime();

  // 过滤通知
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return notification.type === filter;
  }).slice(0, maxNotifications);

  // 切换通知显示
  const toggleNotification = useCallback((notificationId: string) => {
    if (selectedNotifications.has(notificationId)) {
      selectedNotifications.delete(notificationId);
    } else {
      selectedNotifications.add(notificationId);
    }
    setSelectedNotifications(new Set(selectedNotifications));
  }, [selectedNotifications]);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  }, [selectedNotifications, filteredNotifications]);

  // 标记为已读
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      onMarkAsRead?.(notificationId);
      recordMessage();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('标记已读失败'));
      recordError();
    }
  }, [markAsRead, onMarkAsRead, recordMessage, handleError]);

  // 标记全部为已读
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      onMarkAllAsRead?.();
      recordMessage();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('标记全部已读失败'));
      recordError();
    }
  }, [markAllAsRead, onMarkAllAsRead, recordMessage, handleError]);

  // 删除通知
  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      recordMessage();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('删除通知失败'));
      recordError();
    }
  }, [deleteNotification, recordMessage, handleError]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    const ids = Array.from(selectedNotifications);
    if (ids.length === 0) return;

    try {
      // 这里应该调用批量删除API
      for (const id of ids) {
        await deleteNotification(id);
      }
      setSelectedNotifications(new Set());
      recordMessage();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('批量删除失败'));
      recordError();
    }
  }, [selectedNotifications, deleteNotification, recordMessage, handleError]);

  // 批量标记已读
  const handleBatchMarkAsRead = useCallback(async () => {
    const ids = Array.from(selectedNotifications);
    if (ids.length === 0) return;

    try {
      // 这里应该调用批量标记已读API
      for (const id of ids) {
        await markAsRead(id);
      }
      setSelectedNotifications(new Set());
      recordMessage();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('批量标记失败'));
      recordError();
    }
  }, [selectedNotifications, markAsRead, recordMessage, handleError]);

  // 获取通知图标
  const getNotificationIcon = useCallback((type: string) => {
    const Icon = notificationIcons[type as keyof typeof notificationIcons] || notificationIcons.default;
    return Icon;
  }, []);

  // 获取通知颜色
  const getNotificationColor = useCallback((type: string) => {
    return notificationColors[type as keyof typeof notificationColors] || notificationColors.default;
  }, []);

  // 点击通知
  const handleNotificationClick = useCallback((notification: any) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    onNotificationClick?.(notification);
  }, [onNotificationClick, handleMarkAsRead]);

  // 如果用户未登录，显示空状态
  if (!effectiveUserId) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">请先登录以查看通知</p>
        </CardContent>
      </Card>
    );
  }

  // 加载状态
  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">正在加载通知...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6 text-center text-red-600">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>加载通知失败: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  // Dropdown模式
  if (position === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              {connected ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {showBadge && unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">通知</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="text-xs"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      全部已读
                    </Button>
                  )}
                  {showFilter && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setFilter('all')}>
                          全部 ({stats?.total || 0})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter('unread')}>
                          未读 ({stats?.unread || 0})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter('assignment')}>
                          作业
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter('message')}>
                          消息
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>

            <ScrollArea className="h-96">
              {filteredNotifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>暂无通知</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const colorClass = getNotificationColor(notification.type);

                    return (
                      <div
                        key={notification.id}
                        className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                          !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-1 rounded-full ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium truncate">
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {notification.content}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  addSuffix: true,
                                  locale: zhCN
                                })}
                              </span>
                              {showActions && (
                                <div className="flex items-center space-x-1">
                                  {!notification.is_read && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAsRead(notification.id);
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notification.id);
                                    }}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // 侧边栏或覆盖模式
  return (
    <Card className={`${className} ${!connected ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>通知</span>
            {showBadge && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center space-x-2">
            {/* 连接状态 */}
            <div className="flex items-center space-x-1">
              <div className={`h-2 w-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-500">
                {connected ? '已连接' : '已断开'}
              </span>
            </div>

            {/* 操作按钮 */}
            {showActions && (
              <div className="flex items-center space-x-1">
                {selectedNotifications.size > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBatchMarkAsRead}
                      className="h-8 w-8 p-0"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBatchDelete}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-8 w-8 p-0"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 过滤器 */}
        {showFilter && (
          <div className="flex items-center space-x-2 mt-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              全部 ({stats?.total || 0})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              未读 ({stats?.unread || 0})
            </Button>
            <Button
              variant={filter === 'assignment' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('assignment')}
            >
              作业
            </Button>
            <Button
              variant={filter === 'message' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('message')}
            >
              消息
            </Button>
          </div>
        )}

        {/* 批量选择 */}
        {filteredNotifications.length > 0 && (
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              checked={selectedNotifications.size === filteredNotifications.length}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-gray-600">
              {selectedNotifications.size > 0
                ? `已选择 ${selectedNotifications.size} 项`
                : '选择全部'
              }
            </span>
            {selectedNotifications.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNotifications(new Set())}
              >
                取消选择
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>暂无通知</p>
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);
                const isSelected = selectedNotifications.has(notification.id);

                return (
                  <div
                    key={notification.id}
                    className={`group relative p-3 rounded-lg border hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* 选择框 */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleNotification(notification.id)}
                        className="mt-1"
                      />

                      {/* 通知图标 */}
                      <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* 通知内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.content}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: zhCN
                              })}
                            </span>
                            {notification.expires_at && (
                              <>
                                <span>•</span>
                                <span>
                                  过期: {formatDistanceToNow(new Date(notification.expires_at), {
                                    addSuffix: true,
                                    locale: zhCN
                                  })}
                                </span>
                              </>
                            )}
                          </div>

                          {/* 操作按钮 */}
                          {showActions && (
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
