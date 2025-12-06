/**
 * 通知系统数据库查询函数
 * WeaveMind LMS Notification System Database Queries
 */

import { createClient } from '@/lib/supabase/server'
import {
  Notification,
  NotificationPreference,
  NotificationQueue,
  NotificationReadStatus,
  NotificationSummary,
  NotificationListQuery,
  NotificationListResponse,
  PaginatedResponse
} from './types'
import { Schemas } from './schemas'

// === 通知查询函数 ===

/**
 * 获取用户通知列表（支持分页和过滤）
 */
export async function getUserNotifications(
  userId: string,
  query: NotificationListQuery
): Promise<NotificationListResponse> {
  const supabase = await createClient()
  
  // 构建查询
  let dbQuery = supabase
    .from('notifications')
    .select(`
      *,
      class_name:classes!notifications_class_id_fkey(name),
      course_title:courses!notifications_course_id_fkey(title),
      assignment_title:assignments!notifications_assignment_id_fkey(title),
      discussion_thread_title:discussion_threads!notifications_discussion_thread_id_fkey(title)
    `)
    .eq('user_id', userId)

  // 应用状态过滤
  switch (query.status) {
    case 'unread':
      dbQuery = dbQuery.eq('is_read', false).eq('is_archived', false)
      break
    case 'read':
      dbQuery = dbQuery.eq('is_read', true).eq('is_archived', false)
      break
    case 'archived':
      dbQuery = dbQuery.eq('is_archived', true)
      break
    case 'all':
    default:
      // 不添加过滤条件
      break
  }

  // 应用类型过滤
  if (query.type) {
    dbQuery = dbQuery.eq('type', query.type)
  }

  // 应用优先级过滤
  if (query.priority) {
    dbQuery = dbQuery.eq('priority', query.priority)
  }

  // 应用日期范围过滤
  if (query.date_from) {
    dbQuery = dbQuery.gte('created_at', query.date_from)
  }
  if (query.date_to) {
    dbQuery = dbQuery.lte('created_at', query.date_to)
  }

  // 应用班级/课程过滤
  if (query.class_id) {
    dbQuery = dbQuery.eq('class_id', query.class_id)
  }
  if (query.course_id) {
    dbQuery = dbQuery.eq('course_id', query.course_id)
  }

  // 应用排序
  switch (query.sort) {
    case 'created_at_asc':
      dbQuery = dbQuery.order('created_at', { ascending: true })
      break
    case 'priority_desc':
      dbQuery = dbQuery.order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      break
    case 'created_at_desc':
    default:
      dbQuery = dbQuery.order('created_at', { ascending: false })
      break
  }

  // 应用分页
  const offset = (query.page - 1) * query.limit
  dbQuery = dbQuery.range(offset, offset + query.limit - 1)

  const { data: notifications, error, count } = await dbQuery

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`)
  }

  // 计算分页信息
  const total = count || 0
  const totalPages = Math.ceil(total / query.limit)
  const hasNext = query.page < totalPages
  const hasPrev = query.page > 1

  return {
    notifications: notifications || [],
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    }
  }
}

/**
 * 获取单个通知详情
 */
export async function getNotificationById(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      class_name:classes!notifications_class_id_fkey(name),
      course_title:courses!notifications_course_id_fkey(title),
      assignment_title:assignments!notifications_assignment_id_fkey(title),
      discussion_thread_title:discussion_threads!notifications_discussion_thread_id_fkey(title)
    `)
    .eq('id', notificationId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // 通知不存在
    }
    throw new Error(`Failed to fetch notification: ${error.message}`)
  }

  return data
}

/**
 * 创建通知
 */
export async function createNotification(
  notificationData: any,
  createdBy?: string
): Promise<Notification> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notificationData,
      created_by: createdBy || null
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`)
  }

  return data
}

/**
 * 批量创建通知
 */
export async function createBulkNotifications(
  notifications: any[]
): Promise<Notification[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select()

  if (error) {
    throw new Error(`Failed to create bulk notifications: ${error.message}`)
  }

  return data || []
}

/**
 * 更新通知状态
 */
export async function updateNotification(
  notificationId: string,
  userId: string,
  updates: {
    is_read?: boolean
    is_archived?: boolean
    read_at?: string
  }
): Promise<Notification> {
  const supabase = await createClient()

  const updateData: any = { ...updates, updated_at: new Date().toISOString() }

  const { data, error } = await supabase
    .from('notifications')
    .update(updateData)
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update notification: ${error.message}`)
  }

  return data
}

/**
 * 批量更新通知状态
 */
export async function batchUpdateNotifications(
  userId: string,
  updates: {
    is_read?: boolean
    is_archived?: boolean
  },
  filters: {
    status?: 'all' | 'unread'
    type?: string
    class_id?: string
  }
): Promise<number> {
  const supabase = await createClient()

  let dbQuery = supabase
    .from('notifications')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updates.is_read && { read_at: new Date().toISOString() })
    })
    .eq('user_id', userId)

  // 应用过滤条件
  if (filters.status === 'unread') {
    dbQuery = dbQuery.eq('is_read', false).eq('is_archived', false)
  }
  if (filters.type) {
    dbQuery = dbQuery.eq('type', filters.type)
  }
  if (filters.class_id) {
    dbQuery = dbQuery.eq('class_id', filters.class_id)
  }

  const { error } = await dbQuery

  if (error) {
    throw new Error(`Failed to batch update notifications: ${error.message}`)
  }

  return 0 // Supabase不返回更新的行数
}

/**
 * 删除通知（软删除）
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .eq('is_archived', false)

  if (error) {
    throw new Error(`Failed to delete notification: ${error.message}`)
  }
}

// === 通知偏好设置查询函数 ===

/**
 * 获取用户通知偏好设置
 */
export async function getUserNotificationPreferences(
  userId: string,
  filters?: {
    scope?: string
    notification_type?: string
    organization_id?: string
    class_id?: string
  }
): Promise<NotificationPreference[]> {
  const supabase = await createClient()

  let dbQuery = supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  // 应用过滤条件
  if (filters?.scope) {
    dbQuery = dbQuery.eq('scope', filters.scope)
  }
  if (filters?.notification_type) {
    dbQuery = dbQuery.eq('notification_type', filters.notification_type)
  }
  if (filters?.organization_id) {
    dbQuery = dbQuery.eq('organization_id', filters.organization_id)
  }
  if (filters?.class_id) {
    dbQuery = dbQuery.eq('class_id', filters.class_id)
  }

  dbQuery = dbQuery.order('created_at', { ascending: false })

  const { data, error } = await dbQuery

  if (error) {
    throw new Error(`Failed to fetch notification preferences: ${error.message}`)
  }

  return data || []
}

/**
 * 更新通知偏好设置
 */
export async function updateNotificationPreference(
  userId: string,
  preferenceData: any
): Promise<NotificationPreference> {
  const supabase = await createClient()

  // 使用 upsert 操作
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...preferenceData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,notification_type,organization_id,class_id,scope'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update notification preference: ${error.message}`)
  }

  return data
}

/**
 * 删除通知偏好设置
 */
export async function deleteNotificationPreference(
  userId: string,
  preferenceId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notification_preferences')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', preferenceId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete notification preference: ${error.message}`)
  }
}

// === 通知队列查询函数 ===

/**
 * 获取通知队列
 */
export async function getNotificationQueue(
  notificationId: string
): Promise<NotificationQueue[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('notification_id', notificationId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch notification queue: ${error.message}`)
  }

  return data || []
}

/**
 * 创建通知队列条目
 */
export async function createNotificationQueueEntries(
  notificationId: string,
  deliveryMethods: string[],
  scheduledFor?: string
): Promise<NotificationQueue[]> {
  const supabase = await createClient()

  const queueEntries = deliveryMethods.map(method => ({
    notification_id: notificationId,
    delivery_method: method,
    scheduled_for: scheduledFor || new Date().toISOString(),
    status: 'pending'
  }))

  const { data, error } = await supabase
    .from('notification_queue')
    .insert(queueEntries)
    .select()

  if (error) {
    throw new Error(`Failed to create notification queue entries: ${error.message}`)
  }

  return data || []
}

// === 通知阅读状态查询函数 ===

/**
 * 获取通知阅读状态
 */
export async function getNotificationReadStatus(
  notificationId: string,
  userId: string
): Promise<NotificationReadStatus | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_read_status')
    .select('*')
    .eq('notification_id', notificationId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch notification read status: ${error.message}`)
  }

  return data
}

/**
 * 创建通知阅读状态
 */
export async function createNotificationReadStatus(
  notificationId: string,
  userId: string,
  metadata?: any
): Promise<NotificationReadStatus> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_read_status')
    .insert({
      notification_id: notificationId,
      user_id: userId,
      read_by_method: { in_app: true },
      metadata: metadata || {}
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create notification read status: ${error.message}`)
  }

  return data
}

// === 通知统计查询函数 ===

/**
 * 获取用户通知统计摘要
 */
export async function getUserNotificationSummary(
  userId: string
): Promise<NotificationSummary> {
  const supabase = await createClient()

  // 使用数据库函数
  const { data, error } = await supabase
    .rpc('get_user_notification_summary', {
      p_user_id: userId
    })

  if (error) {
    throw new Error(`Failed to fetch notification summary: ${error.message}`)
  }

  return data
}

/**
 * 获取通知统计信息
 */
export async function getNotificationStatistics(
  userId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<any> {
  const supabase = await createClient()

  let dbQuery = supabase
    .from('notifications')
    .select('type, priority, is_read, is_archived, created_at')
    .eq('user_id', userId)

  // 应用日期范围
  if (dateFrom) {
    dbQuery = dbQuery.gte('created_at', dateFrom)
  }
  if (dateTo) {
    dbQuery = dbQuery.lte('created_at', dateTo)
  }

  const { data, error } = await dbQuery

  if (error) {
    throw new Error(`Failed to fetch notification statistics: ${error.message}`)
  }

  // 计算统计信息
  const stats = {
    total: data?.length || 0,
    unread: data?.filter(n => !n.is_read && !n.is_archived).length || 0,
    read: data?.filter(n => n.is_read && !n.is_archived).length || 0,
    archived: data?.filter(n => n.is_archived).length || 0,
    by_type: {} as Record<string, number>,
    by_priority: {} as Record<string, number>
  }

  // 按类型统计
  data?.forEach(notification => {
    stats.by_type[notification.type] = (stats.by_type[notification.type] || 0) + 1
    stats.by_priority[notification.priority] = (stats.by_priority[notification.priority] || 0) + 1
  })

  return stats
}

// === 权限验证函数 ===

/**
 * 验证用户是否为教师
 */
export async function verifyTeacherPermission(
  userId: string,
  contextId?: string,
  contextType?: 'class' | 'organization'
): Promise<boolean> {
  const supabase = await createClient()

  let dbQuery = supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['owner', 'teacher'])

  if (contextType === 'class' && contextId) {
    dbQuery = supabase
      .from('class_members')
      .select('role')
      .eq('user_id', userId)
      .eq('class_id', contextId)
      .eq('role', 'teacher')
  }

  const { data, error } = await dbQuery

  if (error) {
    throw new Error(`Failed to verify teacher permission: ${error.message}`)
  }

  return (data && data.length > 0) || false
}

/**
 * 验证用户是否可以访问通知
 */
export async function verifyNotificationAccess(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('id', notificationId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return false
    }
    throw new Error(`Failed to verify notification access: ${error.message}`)
  }

  return !!data
}

// === 工具函数 ===

/**
 * 分页计算
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev
  }
}

/**
 * 构建通知查询URL参数
 */
export function buildNotificationQuery(params: {
  page?: number
  limit?: number
  status?: string
  type?: string
  priority?: string
  sort?: string
  class_id?: string
  course_id?: string
  date_from?: string
  date_to?: string
}): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, value.toString())
    }
  })
  
  return searchParams.toString()
}

/**
 * 清理过期通知
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('cleanup_expired_notifications')

  if (error) {
    throw new Error(`Failed to cleanup expired notifications: ${error.message}`)
  }

  return data || 0
}

/**
 * 处理通知批次
 */
export async function processNotificationBatch(
  batchSize: number = 100,
  deliveryMethod?: string
): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('process_notification_batch', {
      p_batch_size: batchSize,
      p_delivery_method: deliveryMethod || null
    })

  if (error) {
    throw new Error(`Failed to process notification batch: ${error.message}`)
  }

  return data || 0
}
