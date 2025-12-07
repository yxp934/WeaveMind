/**
 * 通知系统 Zod 验证模式
 * WeaveMind LMS Notification System Validation Schemas
 */

import { z } from 'zod'
import {
  NotificationTypeEnum,
  NotificationPriorityEnum,
  DeliveryMethodEnum,
  NotificationScopeEnum
} from './types'

// === 枚举验证模式 ===
export const NotificationTypeSchema = NotificationTypeEnum
export const NotificationPrioritySchema = NotificationPriorityEnum
export const DeliveryMethodSchema = DeliveryMethodEnum
export const NotificationScopeSchema = NotificationScopeEnum

// === 分页验证模式 ===
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

// === 日期范围验证模式 ===
export const DateRangeSchema = z.object({
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional()
}).refine(
  (data) => !data.date_from || !data.date_to || new Date(data.date_from) <= new Date(data.date_to),
  {
    message: 'date_from must be before or equal to date_to',
    path: ['date_from']
  }
)

// === 通知查询验证模式 ===
export const NotificationListQuerySchema = PaginationSchema.extend({
  status: z.enum(['unread', 'read', 'archived', 'all']).default('unread'),
  type: NotificationTypeSchema.optional(),
  priority: NotificationPrioritySchema.optional(),
  sort: z.enum(['created_at_desc', 'created_at_asc', 'priority_desc']).default('created_at_desc'),
  class_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  ...DateRangeSchema.shape
})

// === 通知创建验证模式 ===
export const NotificationCreateSchema = z.object({
  user_id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema.default('normal'),
  scope: NotificationScopeSchema,
  class_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  discussion_thread_id: z.string().uuid().optional(),
  discussion_post_id: z.string().uuid().optional(),
  delivery_methods: z.array(DeliveryMethodSchema).default(['in_app']),
  metadata: z.record(z.string(), z.any()).default({}),
  scheduled_for: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional()
}).refine(
  (data) => {
    // 验证范围一致性
    if (data.scope === 'organization' && data.class_id) {
      return false
    }
    if (data.scope === 'class' && !data.class_id) {
      return false
    }
    if (data.scope === 'individual' && data.class_id) {
      return false
    }
    return true
  },
  {
    message: 'Invalid scope and context combination',
    path: ['scope']
  }
).refine(
  (data) => {
    // 验证定时和过期时间
    if (data.scheduled_for && data.expires_at) {
      return new Date(data.scheduled_for) < new Date(data.expires_at)
    }
    return true
  },
  {
    message: 'scheduled_for must be before expires_at',
    path: ['scheduled_for']
  }
)

// === 通知发送验证模式 ===
export const RecipientSchema = z.union([
  z.object({
    type: z.literal('user'),
    id: z.string().uuid()
  }),
  z.object({
    type: z.literal('class'),
    id: z.string().uuid()
  }),
  z.object({
    type: z.literal('organization'),
    id: z.string().uuid()
  })
])

export const NotificationSendSchema = z.object({
  recipients: z.array(RecipientSchema).min(1).max(100),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema.default('normal'),
  class_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  delivery_methods: z.array(DeliveryMethodSchema).default(['in_app']),
  metadata: z.record(z.string(), z.any()).default({}),
  scheduled_for: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional()
}).refine(
  (data) => {
    // 验证 recipients 与 class_id 的一致性
    const hasClassRecipients = data.recipients.some(r => r.type === 'class')
    if (hasClassRecipients && !data.class_id) {
      return false
    }
    return true
  },
  {
    message: 'class_id is required when sending to class recipients',
    path: ['class_id']
  }
).refine(
  (data) => {
    // 验证定时和过期时间
    if (data.scheduled_for && data.expires_at) {
      return new Date(data.scheduled_for) < new Date(data.expires_at)
    }
    return true
  },
  {
    message: 'scheduled_for must be before expires_at',
    path: ['scheduled_for']
  }
)

// === 通知更新验证模式 ===
export const NotificationUpdateSchema = z.object({
  is_read: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  read_at: z.string().datetime().optional()
}).refine(
  (data) => {
    // 如果设置了 read_at，必须设置 is_read 为 true
    if (data.read_at && !data.is_read) {
      return false
    }
    return true
  },
  {
    message: 'read_at can only be set when is_read is true',
    path: ['read_at']
  }
)

// === 批量更新验证模式 ===
export const BatchUpdateSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  status: z.enum(['read', 'archived']).optional(),
  type: NotificationTypeSchema.optional(),
  class_id: z.string().uuid().optional(),
  scope: z.enum(['all', 'unread', 'by_type', 'by_class']).default('all')
}).refine(
  (data) => {
    // 验证批量操作参数
    if (data.scope === 'by_type' && !data.type) {
      return false
    }
    if (data.scope === 'by_class' && !data.class_id) {
      return false
    }
    return true
  },
  {
    message: 'scope-specific parameters are required',
    path: ['scope']
  }
)

// === 通知偏好设置验证模式 ===
export const DeliveryPreferencesSchema = z.object({
  in_app: z.boolean().default(true),
  email: z.boolean().default(false),
  push: z.boolean().default(false)
})

export const NotificationPreferenceUpdateSchema = z.object({
  notification_type: NotificationTypeSchema,
  scope: NotificationScopeSchema.default('individual'),
  delivery_preferences: DeliveryPreferencesSchema,
  category_preferences: z.record(z.string(), z.any()).default({}),
  quiet_hours_enabled: z.boolean().default(false),
  quiet_hours_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quiet_hours_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quiet_hours_timezone: z.string().default('UTC'),
  dnd_enabled: z.boolean().default(false),
  dnd_start_date: z.string().date().optional(),
  dnd_end_date: z.string().date().optional()
}).refine(
  (data) => {
    // 验证静默时间范围
    if (data.quiet_hours_enabled && data.quiet_hours_start && data.quiet_hours_end) {
      return data.quiet_hours_start !== data.quiet_hours_end
    }
    return true
  },
  {
    message: 'quiet_hours_start and quiet_hours_end cannot be the same',
    path: ['quiet_hours_start']
  }
).refine(
  (data) => {
    // 验证免打扰时间范围
    if (data.dnd_enabled && data.dnd_start_date && data.dnd_end_date) {
      return new Date(data.dnd_start_date) < new Date(data.dnd_end_date)
    }
    return true
  },
  {
    message: 'dnd_start_date must be before dnd_end_date',
    path: ['dnd_start_date']
  }
)

// === 通知偏好查询验证模式 ===
export const NotificationPreferenceQuerySchema = z.object({
  scope: NotificationScopeSchema.optional(),
  notification_type: NotificationTypeSchema.optional(),
  organization_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional()
})

// === UUID 验证模式 ===
export const UuidSchema = z.string().uuid()

// === API 参数验证模式 ===
export const ApiParamsSchema = z.object({
  id: UuidSchema
})

// === 错误响应验证模式 ===
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
  code: z.string().optional()
})

// === 成功响应验证模式 ===
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) => 
  z.object({
    success: z.literal(true),
    data: dataSchema.optional(),
    message: z.string().optional()
  })

// === 分页响应验证模式 ===
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().min(1),
      limit: z.number().int().min(1),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    })
  })

// === 通知统计验证模式 ===
export const NotificationSummarySchema = z.object({
  total_unread: z.number().int().min(0),
  total_archived: z.number().int().min(0),
  by_priority: z.record(NotificationPrioritySchema, z.number().int().min(0)),
  by_type: z.record(NotificationTypeSchema, z.number().int().min(0)),
  recent_activity: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    type: NotificationTypeSchema,
    priority: NotificationPrioritySchema,
    created_at: z.string().datetime()
  }))
})

// === 工具验证函数 ===
export const validatePagination = (page: number, limit: number) => {
  const validated = PaginationSchema.safeParse({ page, limit })
  if (!validated.success) {
    throw new Error('Invalid pagination parameters')
  }
  return validated.data
}

export const validateDateRange = (dateFrom?: string, dateTo?: string) => {
  if (!dateFrom && !dateTo) return null
  const validated = DateRangeSchema.safeParse({ date_from: dateFrom, date_to: dateTo })
  if (!validated.success) {
    throw new Error('Invalid date range parameters')
  }
  return validated.data
}

export const validateNotificationId = (id: string) => {
  const validated = UuidSchema.safeParse(id)
  if (!validated.success) {
    throw new Error('Invalid notification ID format')
  }
  return validated.data
}

// === 导出所有验证模式 ===
export const Schemas = {
  // 枚举
  NotificationType: NotificationTypeSchema,
  NotificationPriority: NotificationPrioritySchema,
  DeliveryMethod: DeliveryMethodSchema,
  NotificationScope: NotificationScopeSchema,
  
  // 查询
  NotificationListQuery: NotificationListQuerySchema,
  NotificationPreferenceQuery: NotificationPreferenceQuerySchema,
  
  // 请求
  NotificationCreate: NotificationCreateSchema,
  NotificationSend: NotificationSendSchema,
  NotificationUpdate: NotificationUpdateSchema,
  BatchUpdate: BatchUpdateSchema,
  NotificationPreferenceUpdate: NotificationPreferenceUpdateSchema,
  
  // 参数
  ApiParams: ApiParamsSchema,
  Uuid: UuidSchema,
  Pagination: PaginationSchema,
  DateRange: DateRangeSchema,
  Recipient: RecipientSchema,
  DeliveryPreferences: DeliveryPreferencesSchema,
  
  // 响应
  ErrorResponse: ErrorResponseSchema,
  NotificationSummary: NotificationSummarySchema
}
