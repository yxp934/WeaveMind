/**
 * 通知系统 TypeScript 类型定义
 * WeaveMind LMS Notification System Type Definitions
 */

import { z } from 'zod'

// === 枚举类型定义 ===

export const NotificationTypeEnum = z.enum([
  'course_update',
  'assignment_due',
  'new_discussion',
  'discussion_reply',
  'grade_posted',
  'class_announcement',
  'system_alert',
  'ai_assistance',
  'material_shared',
  'deadline_reminder',
  'feedback_received',
  'peer_message'
])

export const NotificationPriorityEnum = z.enum([
  'low',
  'normal',
  'high',
  'urgent'
])

export const DeliveryMethodEnum = z.enum([
  'in_app',
  'email',
  'push'
])

export const NotificationScopeEnum = z.enum([
  'organization',
  'class',
  'individual'
])

export type NotificationType = z.infer<typeof NotificationTypeEnum>
export type NotificationPriority = z.infer<typeof NotificationPriorityEnum>
export type DeliveryMethod = z.infer<typeof DeliveryMethodEnum>
export type NotificationScope = z.infer<typeof NotificationScopeEnum>

// === 基础数据类型 ===

export interface Notification {
  id: string
  user_id: string
  organization_id: string
  title: string
  content: string
  type: NotificationType
  priority: NotificationPriority
  scope: NotificationScope
  class_id?: string | null
  course_id?: string | null
  assignment_id?: string | null
  discussion_thread_id?: string | null
  discussion_post_id?: string | null
  related_type?: string | null
  related_id?: string | null
  delivery_methods: DeliveryMethod[]
  delivery_status: Record<string, any>
  delivered_at?: string | null
  failed_delivery: any[]
  is_read: boolean
  read_at?: string | null
  is_archived: boolean
  archived_at?: string | null
  expires_at?: string | null
  scheduled_for?: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  created_by?: string | null
}

export interface NotificationPreference {
  id: string
  user_id: string
  organization_id?: string | null
  class_id?: string | null
  scope: NotificationScope
  notification_type: NotificationType
  priority: NotificationPriority
  delivery_preferences: {
    in_app: boolean
    email: boolean
    push: boolean
  }
  category_preferences: Record<string, any>
  quiet_hours_enabled: boolean
  quiet_hours_start?: string | null
  quiet_hours_end?: string | null
  quiet_hours_timezone: string
  dnd_enabled: boolean
  dnd_start_date?: string | null
  dnd_end_date?: string | null
  is_active: boolean
  last_used_at?: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface NotificationQueue {
  id: string
  notification_id: string
  delivery_method: DeliveryMethod
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  scheduled_for: string
  attempts: number
  max_attempts: number
  next_attempt_at?: string | null
  error_message?: string | null
  last_error_at?: string | null
  sent_at?: string | null
  response_data?: any
  created_at: string
  updated_at: string
}

export interface NotificationReadStatus {
  id: string
  notification_id: string
  user_id: string
  read_by_method: Record<string, any>
  read_at: string
  user_agent?: string | null
  ip_address?: string | null
  metadata: Record<string, any>
  created_at: string
}

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  priority: NotificationPriority
  title_template: string
  content_template: string
  email_subject_template?: string | null
  email_body_template?: string | null
  push_title_template?: string | null
  push_body_template?: string | null
  default_delivery_methods: DeliveryMethod[]
  default_metadata: Record<string, any>
  version: number
  is_active: boolean
  variables: string[]
  created_at: string
  updated_at: string
  created_by?: string | null
}

// === API 请求/响应类型 ===

export interface NotificationListQuery {
  page?: number
  limit?: number
  status?: 'unread' | 'read' | 'archived' | 'all'
  type?: NotificationType
  priority?: NotificationPriority
  date_from?: string
  date_to?: string
  sort?: 'created_at_desc' | 'created_at_asc' | 'priority_desc'
  class_id?: string
  course_id?: string
}

export interface NotificationListResponse {
  notifications: (Notification & {
    class_name?: string
    course_title?: string
    assignment_title?: string
    discussion_thread_title?: string
  })[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface NotificationCreateRequest {
  user_id?: string
  organization_id: string
  title: string
  content: string
  type: NotificationType
  priority?: NotificationPriority
  scope: NotificationScope
  class_id?: string
  course_id?: string
  assignment_id?: string
  discussion_thread_id?: string
  discussion_post_id?: string
  delivery_methods?: DeliveryMethod[]
  metadata?: Record<string, any>
  scheduled_for?: string
  expires_at?: string
}

export interface NotificationSendRequest {
  recipients: {
    type: 'user' | 'class' | 'organization'
    id: string
  }[]
  title: string
  content: string
  type: NotificationType
  priority?: NotificationPriority
  class_id?: string
  course_id?: string
  assignment_id?: string
  delivery_methods?: DeliveryMethod[]
  metadata?: Record<string, any>
  scheduled_for?: string
  expires_at?: string
}

export interface NotificationUpdateRequest {
  is_read?: boolean
  is_archived?: boolean
  read_at?: string
}

export interface NotificationPreferenceUpdateRequest {
  notification_type: NotificationType
  scope?: NotificationScope
  delivery_preferences: {
    in_app?: boolean
    email?: boolean
    push?: boolean
  }
  category_preferences?: Record<string, any>
  quiet_hours_enabled?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  quiet_hours_timezone?: string
  dnd_enabled?: boolean
  dnd_start_date?: string
  dnd_end_date?: string
}

export interface NotificationSummary {
  total_unread: number
  total_archived: number
  by_priority: Record<NotificationPriority, number>
  by_type: Record<NotificationType, number>
  recent_activity: Array<{
    id: string
    title: string
    type: NotificationType
    priority: NotificationPriority
    created_at: string
  }>
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: any
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// === 错误类型 ===

export class NotificationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'NotificationError'
  }
}

export class PermissionError extends NotificationError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'PERMISSION_DENIED', 403)
    this.name = 'PermissionError'
  }
}

export class ValidationError extends NotificationError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends NotificationError {
  constructor(message: string = 'Notification not found') {
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}
