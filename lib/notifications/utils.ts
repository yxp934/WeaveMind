/**
 * 通知系统工具函数
 * WeaveMind LMS Notification System Utility Functions
 */

import {
  NotificationType,
  NotificationPriority,
  DeliveryMethod,
  NotificationScope,
  NotificationSummary
} from './types'
import { Schemas } from './schemas'

// === 通知类型工具函数 ===

/**
 * 获取通知类型的中文描述
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    course_update: '课程更新',
    assignment_due: '作业到期',
    new_discussion: '新讨论',
    discussion_reply: '讨论回复',
    grade_posted: '成绩发布',
    class_announcement: '班级公告',
    system_alert: '系统警报',
    ai_assistance: 'AI助手',
    material_shared: '资料分享',
    deadline_reminder: '截止提醒',
    feedback_received: '收到反馈',
    peer_message: '同伴消息'
  }
  return labels[type] || type
}

/**
 * 获取通知类型的图标
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    course_update: '📚',
    assignment_due: '📝',
    new_discussion: '💬',
    discussion_reply: '💭',
    grade_posted: '🎯',
    class_announcement: '📢',
    system_alert: '⚠️',
    ai_assistance: '🤖',
    material_shared: '📎',
    deadline_reminder: '⏰',
    feedback_received: '💬',
    peer_message: '👥'
  }
  return icons[type] || '📌'
}

/**
 * 获取通知优先级的中文描述
 */
export function getNotificationPriorityLabel(priority: NotificationPriority): string {
  const labels: Record<NotificationPriority, string> = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急'
  }
  return labels[priority] || priority
}

/**
 * 获取通知优先级的颜色
 */
export function getNotificationPriorityColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    low: 'gray',
    normal: 'blue',
    high: 'orange',
    urgent: 'red'
  }
  return colors[priority] || 'gray'
}

/**
 * 获取通知优先级的数值（用于排序）
 */
export function getNotificationPriorityValue(priority: NotificationPriority): number {
  const values: Record<NotificationPriority, number> = {
    low: 1,
    normal: 2,
    high: 3,
    urgent: 4
  }
  return values[priority] || 1
}

// === 通知状态工具函数 ===

/**
 * 检查通知是否已读
 */
export function isNotificationRead(notification: any): boolean {
  return notification.is_read === true
}

/**
 * 检查通知是否已归档
 */
export function isNotificationArchived(notification: any): boolean {
  return notification.is_archived === true
}

/**
 * 检查通知是否过期
 */
export function isNotificationExpired(notification: any): boolean {
  if (!notification.expires_at) return false
  return new Date(notification.expires_at) < new Date()
}

/**
 * 检查通知是否已发送
 */
export function isNotificationDelivered(notification: any): boolean {
  return !!notification.delivered_at
}

/**
 * 检查通知是否定时发送
 */
export function isNotificationScheduled(notification: any): boolean {
  if (!notification.scheduled_for) return false
  return new Date(notification.scheduled_for) > new Date()
}

// === 通知过滤和排序工具函数 ===

/**
 * 按优先级排序通知
 */
export function sortNotificationsByPriority(
  notifications: any[],
  ascending: boolean = false
): any[] {
  return [...notifications].sort((a, b) => {
    const priorityA = getNotificationPriorityValue(a.priority)
    const priorityB = getNotificationPriorityValue(b.priority)
    return ascending ? priorityA - priorityB : priorityB - priorityA
  })
}

/**
 * 按创建时间排序通知
 */
export function sortNotificationsByCreatedAt(
  notifications: any[],
  ascending: boolean = false
): any[] {
  return [...notifications].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return ascending ? dateA - dateB : dateB - dateA
  })
}

/**
 * 过滤未读通知
 */
export function filterUnreadNotifications(notifications: any[]): any[] {
  return notifications.filter(n => !n.is_read && !n.is_archived)
}

/**
 * 过滤已读通知
 */
export function filterReadNotifications(notifications: any[]): any[] {
  return notifications.filter(n => n.is_read && !n.is_archived)
}

/**
 * 过滤已归档通知
 */
export function filterArchivedNotifications(notifications: any[]): any[] {
  return notifications.filter(n => n.is_archived)
}

/**
 * 按类型过滤通知
 */
export function filterNotificationsByType(
  notifications: any[],
  type: NotificationType
): any[] {
  return notifications.filter(n => n.type === type)
}

/**
 * 按优先级过滤通知
 */
export function filterNotificationsByPriority(
  notifications: any[],
  priority: NotificationPriority
): any[] {
  return notifications.filter(n => n.priority === priority)
}

// === 通知分组工具函数 ===

/**
 * 按类型分组通知
 */
export function groupNotificationsByType(notifications: any[]): Record<NotificationType, any[]> {
  return notifications.reduce((groups, notification) => {
    const type = notification.type as NotificationType
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(notification)
    return groups
  }, {} as Record<NotificationType, any[]>)
}

/**
 * 按优先级分组通知
 */
export function groupNotificationsByPriority(notifications: any[]): Record<NotificationPriority, any[]> {
  return notifications.reduce((groups, notification) => {
    const priority = notification.priority as NotificationPriority
    if (!groups[priority]) {
      groups[priority] = []
    }
    groups[priority].push(notification)
    return groups
  }, {} as Record<NotificationPriority, any[]>)
}

/**
 * 按日期分组通知
 */
export function groupNotificationsByDate(notifications: any[]): Record<string, any[]> {
  return notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at).toISOString().split('T')[0]
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(notification)
    return groups
  }, {} as Record<string, any[]>)
}

// === 通知统计工具函数 ===

/**
 * 计算未读通知数量
 */
export function countUnreadNotifications(notifications: any[]): number {
  return filterUnreadNotifications(notifications).length
}

/**
 * 计算已读通知数量
 */
export function countReadNotifications(notifications: any[]): number {
  return filterReadNotifications(notifications).length
}

/**
 * 计算已归档通知数量
 */
export function countArchivedNotifications(notifications: any[]): number {
  return filterArchivedNotifications(notifications).length
}

/**
 * 计算各类通知数量
 */
export function countNotificationsByType(notifications: any[]): Record<NotificationType, number> {
  const counts = {} as Record<NotificationType, number>
  notifications.forEach(notification => {
    const type = notification.type as NotificationType
    counts[type] = (counts[type] || 0) + 1
  })
  return counts
}

/**
 * 计算各优先级通知数量
 */
export function countNotificationsByPriority(notifications: any[]): Record<NotificationPriority, number> {
  const counts = {} as Record<NotificationPriority, number>
  notifications.forEach(notification => {
    const priority = notification.priority as NotificationPriority
    counts[priority] = (counts[priority] || 0) + 1
  })
  return counts
}

/**
 * 获取最近的未读通知
 */
export function getRecentUnreadNotifications(
  notifications: any[],
  limit: number = 5
): any[] {
  return filterUnreadNotifications(notifications)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}

/**
 * 获取最重要的未读通知（按优先级排序）
 */
export function getPriorityUnreadNotifications(
  notifications: any[],
  limit: number = 5
): any[] {
  return filterUnreadNotifications(notifications)
    .sort((a, b) => {
      const priorityDiff = getNotificationPriorityValue(b.priority) - getNotificationPriorityValue(a.priority)
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .slice(0, limit)
}

// === 通知格式化工具函数 ===

/**
 * 格式化通知时间
 */
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return '刚刚'
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}

/**
 * 格式化通知摘要
 */
export function formatNotificationSummary(notification: any): string {
  const maxLength = 100
  if (notification.content.length <= maxLength) {
    return notification.content
  }
  return notification.content.substring(0, maxLength) + '...'
}

/**
 * 生成通知URL
 */
export function generateNotificationUrl(notification: any): string | null {
  // 根据通知类型和上下文生成对应的URL
  if (notification.course_id) {
    return `/student/courses/${notification.course_id}`
  }
  if (notification.assignment_id) {
    return `/student/assignments/${notification.assignment_id}`
  }
  if (notification.class_id) {
    return `/student/classes/${notification.class_id}`
  }
  if (notification.discussion_thread_id) {
    return `/student/discussions/${notification.discussion_thread_id}`
  }
  return null
}

// === 通知验证工具函数 ===

/**
 * 验证通知数据
 */
export function validateNotificationData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // 验证必需字段
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('标题是必需的')
  }
  
  if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
    errors.push('内容是必需的')
  }
  
  if (!data.type || !Schemas.NotificationType.safeParse(data.type).success) {
    errors.push('无效的通知类型')
  }
  
  if (data.priority && !Schemas.NotificationPriority.safeParse(data.priority).success) {
    errors.push('无效的优先级')
  }
  
  if (data.scope && !Schemas.NotificationScope.safeParse(data.scope).success) {
    errors.push('无效的范围')
  }
  
  // 验证范围一致性
  if (data.scope === 'class' && !data.class_id) {
    errors.push('班级范围的通知需要class_id')
  }
  
  if (data.scope === 'organization' && data.class_id) {
    errors.push('组织范围的通知不能有class_id')
  }
  
  // 验证时间
  if (data.scheduled_for && data.expires_at) {
    if (new Date(data.scheduled_for) >= new Date(data.expires_at)) {
      errors.push('定时时间必须早于过期时间')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证批量操作参数
 */
export function validateBatchOperation(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.notification_ids && !data.type && !data.class_id) {
    errors.push('必须提供notification_ids、type或class_id之一')
  }
  
  if (!data.status || !['read', 'archived'].includes(data.status)) {
    errors.push('状态必须是read或archived')
  }
  
  if (data.type && !Schemas.NotificationType.safeParse(data.type).success) {
    errors.push('无效的通知类型')
  }
  
  if (data.scope === 'by_type' && !data.type) {
    errors.push('按类型批量操作需要提供type')
  }
  
  if (data.scope === 'by_class' && !data.class_id) {
    errors.push('按班级批量操作需要提供class_id')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// === 通知模板工具函数 ===

/**
 * 渲染通知模板
 */
export function renderNotificationTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let rendered = template
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value))
  })
  
  return rendered
}

/**
 * 提取模板变量
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const variables: string[] = []
  let match
  
  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1].trim())
  }
  
  return [...new Set(variables)] // 去重
}

// === 通知性能工具函数 ===

/**
 * 分页处理大量通知
 */
export function paginateNotifications(
  notifications: any[],
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit
  const paginated = notifications.slice(offset, offset + limit)
  
  return {
    data: paginated,
    pagination: {
      page,
      limit,
      total: notifications.length,
      totalPages: Math.ceil(notifications.length / limit),
      hasNext: offset + limit < notifications.length,
      hasPrev: page > 1
    }
  }
}

/**
 * 虚拟滚动优化
 */
export function getVisibleNotifications(
  notifications: any[],
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
  buffer: number = 5
) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const endIndex = Math.min(
    notifications.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
  )
  
  return {
    visible: notifications.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex,
    totalHeight: notifications.length * itemHeight
  }
}

// === 通知缓存工具函数 ===

/**
 * 生成通知缓存键
 */
export function generateNotificationCacheKey(
  userId: string,
  filters?: any
): string {
  const filterString = filters ? JSON.stringify(filters) : '{}'
  const encoded = Buffer.from(filterString).toString('base64')
  return `notifications:${userId}:${encoded}`
}

/**
 * 清除通知缓存
 */
export function clearNotificationCache(userId: string): void {
  // 这里可以实现实际的缓存清除逻辑
  // 例如Redis缓存清除
  console.log(`Clearing notification cache for user: ${userId}`)
}

// === 导出所有工具函数 ===

export const NotificationUtils = {
  // 类型工具
  getNotificationTypeLabel,
  getNotificationTypeIcon,
  getNotificationPriorityLabel,
  getNotificationPriorityColor,
  getNotificationPriorityValue,
  
  // 状态工具
  isNotificationRead,
  isNotificationArchived,
  isNotificationExpired,
  isNotificationDelivered,
  isNotificationScheduled,
  
  // 过滤和排序
  sortNotificationsByPriority,
  sortNotificationsByCreatedAt,
  filterUnreadNotifications,
  filterReadNotifications,
  filterArchivedNotifications,
  filterNotificationsByType,
  filterNotificationsByPriority,
  
  // 分组
  groupNotificationsByType,
  groupNotificationsByPriority,
  groupNotificationsByDate,
  
  // 统计
  countUnreadNotifications,
  countReadNotifications,
  countArchivedNotifications,
  countNotificationsByType,
  countNotificationsByPriority,
  getRecentUnreadNotifications,
  getPriorityUnreadNotifications,
  
  // 格式化
  formatNotificationTime,
  formatNotificationSummary,
  generateNotificationUrl,
  
  // 验证
  validateNotificationData,
  validateBatchOperation,
  
  // 模板
  renderNotificationTemplate,
  extractTemplateVariables,
  
  // 性能
  paginateNotifications,
  getVisibleNotifications,
  
  // 缓存
  generateNotificationCacheKey,
  clearNotificationCache
}
