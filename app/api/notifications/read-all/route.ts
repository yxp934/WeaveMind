import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { batchUpdateNotifications } from '@/lib/notifications/queries'
import { Schemas } from '@/lib/notifications/schemas'
import { NotificationUtils } from '@/lib/notifications/utils'

/**
 * PUT /api/notifications/read-all
 * 批量标记通知为已读
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证用户身份
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '用户未认证' },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()

    // 验证请求数据
    const validatedData = Schemas.BatchUpdate.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: '请求数据无效',
          details: (validatedData.error as any).errors || validatedData.error.issues
        },
        { status: 400 }
      )
    }

    const { notification_ids, status, type, class_id, scope } = validatedData.data

    // 验证批量操作参数
    const validation = NotificationUtils.validateBatchOperation({
      notification_ids,
      status,
      type,
      class_id,
      scope
    })

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: '批量操作参数无效',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    // 构建更新数据
    const updates = {
      is_read: status === 'read',
      is_archived: status === 'archived'
    }

    // 构建过滤条件
    const filters: any = {}

    if (scope === 'all') {
      // 全量更新（所有未读通知）
      filters.status = 'all'
    } else if (scope === 'unread') {
      // 更新所有未读通知
      filters.status = 'unread'
    } else if (scope === 'by_type' && type) {
      // 按类型更新
      filters.status = 'unread'
      filters.type = type
    } else if (scope === 'by_class' && class_id) {
      // 按班级更新
      filters.status = 'unread'
      filters.class_id = class_id
    }

    // 执行批量更新
    await batchUpdateNotifications(user.id, updates, filters)

    // 获取更新后的统计信息
    const { data: stats } = await supabase
      .from('notifications')
      .select('is_read, is_archived, type, priority')
      .eq('user_id', user.id)

    const total = stats?.length || 0
    const unread = stats?.filter(n => !n.is_read && !n.is_archived).length || 0
    const read = stats?.filter(n => n.is_read && !n.is_archived).length || 0
    const archived = stats?.filter(n => n.is_archived).length || 0

    const response = {
      success: true,
      data: {
        updated_count: total - unread,
        operation: {
          scope,
          status,
          filters: {
            type,
            class_id,
            notification_ids_count: notification_ids?.length
          }
        },
        statistics: {
          total,
          unread,
          read,
          archived,
          by_type: NotificationUtils.countNotificationsByType(stats || []),
          by_priority: NotificationUtils.countNotificationsByPriority(stats || [])
        }
      },
      message: `成功标记 ${total - unread} 条通知为${status === 'read' ? '已读' : '已归档'}`
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error batch updating notifications:', error)

    // 区分不同类型的错误
    if (error.message?.includes('Failed to batch update notifications')) {
      return NextResponse.json(
        {
          error: 'Database Error',
          message: '批量更新通知失败，请稍后重试',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '服务器内部错误',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/read-all
 * 获取批量操作说明
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      description: '批量标记通知为已读或已归档',
      methods: {
        PUT: {
          description: '批量更新通知状态',
          parameters: {
            notification_ids: {
              type: 'array',
              description: '特定通知ID列表',
              required: false
            },
            status: {
              type: 'string',
              enum: ['read', 'archived'],
              description: '目标状态',
              required: true
            },
            scope: {
              type: 'string',
              enum: ['all', 'unread', 'by_type', 'by_class'],
              description: '操作范围',
              required: false,
              default: 'all'
            },
            type: {
              type: 'string',
              enum: ['course_update', 'assignment_due', 'new_discussion', 'discussion_reply', 'grade_posted', 'class_announcement', 'system_alert', 'ai_assistance', 'material_shared', 'deadline_reminder', 'feedback_received', 'peer_message'],
              description: '通知类型（当scope=by_type时必需）',
              required: false
            },
            class_id: {
              type: 'string',
              format: 'uuid',
              description: '班级ID（当scope=by_class时必需）',
              required: false
            }
          }
        }
      },
      examples: {
        mark_all_as_read: {
          method: 'PUT',
          body: {
            status: 'read',
            scope: 'all'
          }
        },
        mark_unread_as_read: {
          method: 'PUT',
          body: {
            status: 'read',
            scope: 'unread'
          }
        },
        mark_by_type_as_read: {
          method: 'PUT',
          body: {
            status: 'read',
            scope: 'by_type',
            type: 'assignment_due'
          }
        },
        mark_by_class_as_read: {
          method: 'PUT',
          body: {
            status: 'read',
            scope: 'by_class',
            class_id: '123e4567-e89b-12d3-a456-426614174000'
          }
        },
        mark_specific_as_archived: {
          method: 'PUT',
          body: {
            status: 'archived',
            notification_ids: [
              '123e4567-e89b-12d3-a456-426614174000',
              '987fcdeb-51a2-43d1-9c4f-123456789abc'
            ]
          }
        }
      }
    },
    message: '批量操作API文档'
  })
}
