import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteNotification, getNotificationById } from '@/lib/notifications/queries'
import { Schemas } from '@/lib/notifications/schemas'
import { NotificationUtils } from '@/lib/notifications/utils'

/**
 * DELETE /api/notifications/[id]
 * 删除通知（软删除，标记为已归档）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params

    // 验证通知ID格式
    const validatedId = Schemas.Uuid.safeParse(notificationId)
    if (!validatedId.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: '无效的通知ID格式' },
        { status: 400 }
      )
    }

    // 验证用户身份
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '用户未认证' },
        { status: 401 }
      )
    }

    // 检查通知是否存在且属于当前用户
    const existingNotification = await getNotificationById(notificationId, user.id)
    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Not Found', message: '通知不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 检查是否已经归档
    if (existingNotification.is_archived) {
      return NextResponse.json(
        { error: 'Bad Request', message: '通知已经被归档' },
        { status: 400 }
      )
    }

    // 执行软删除（归档）
    await deleteNotification(notificationId, user.id)

    const response = {
      success: true,
      data: {
        notification_id: notificationId,
        operation: {
          action: 'archive',
          timestamp: new Date().toISOString()
        },
        archived_notification: {
          id: existingNotification.id,
          title: existingNotification.title,
          type: existingNotification.type,
          created_at: existingNotification.created_at,
          archived_at: new Date().toISOString()
        }
      },
      message: '通知已成功归档'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error deleting notification:', error)

    // 区分不同类型的错误
    if (error.message?.includes('Failed to delete notification')) {
      return NextResponse.json(
        {
          error: 'Database Error',
          message: '删除通知失败，请稍后重试',
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
 * GET /api/notifications/[id]
 * 获取单个通知详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params

    // 验证通知ID格式
    const validatedId = Schemas.Uuid.safeParse(notificationId)
    if (!validatedId.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: '无效的通知ID格式' },
        { status: 400 }
      )
    }

    // 验证用户身份
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '用户未认证' },
        { status: 401 }
      )
    }

    // 获取通知详情
    const notification = await getNotificationById(notificationId, user.id)
    if (!notification) {
      return NextResponse.json(
        { error: 'Not Found', message: '通知不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 格式化响应数据
    const formattedNotification = {
      ...notification,
      formatted_time: NotificationUtils.formatNotificationTime(notification.created_at),
      summary: NotificationUtils.formatNotificationSummary(notification),
      type_label: NotificationUtils.getNotificationTypeLabel(notification.type),
      type_icon: NotificationUtils.getNotificationTypeIcon(notification.type),
      priority_label: NotificationUtils.getNotificationPriorityLabel(notification.priority),
      priority_color: NotificationUtils.getNotificationPriorityColor(notification.priority),
      url: NotificationUtils.generateNotificationUrl(notification),
      is_read: NotificationUtils.isNotificationRead(notification),
      is_archived: NotificationUtils.isNotificationArchived(notification),
      is_expired: NotificationUtils.isNotificationExpired(notification),
      is_delivered: NotificationUtils.isNotificationDelivered(notification),
      is_scheduled: NotificationUtils.isNotificationScheduled(notification)
    }

    // 获取通知队列信息
    const { data: queueEntries } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('notification_id', notificationId)
      .order('created_at', { ascending: false })

    // 获取阅读状态详情
    const { data: readStatus } = await supabase
      .from('notification_read_status')
      .select('*')
      .eq('notification_id', notificationId)
      .eq('user_id', user.id)
      .single()

    const response = {
      success: true,
      data: {
        notification: formattedNotification,
        queue_info: {
          entries: queueEntries || [],
          total_entries: queueEntries?.length || 0
        },
        read_status: readStatus ? {
          read_at: readStatus.read_at,
          formatted_read_time: NotificationUtils.formatNotificationTime(readStatus.read_at),
          read_by_method: readStatus.read_by_method,
          metadata: readStatus.metadata
        } : null
      },
      message: '通知详情获取成功'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error getting notification details:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '获取通知详情失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/[id]
 * 更新通知（部分字段，仅限创建者或管理员）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params

    // 验证通知ID格式
    const validatedId = Schemas.Uuid.safeParse(notificationId)
    if (!validatedId.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: '无效的通知ID格式' },
        { status: 400 }
      )
    }

    // 验证用户身份
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '用户未认证' },
        { status: 401 }
      )
    }

    // 获取现有通知
    const existingNotification = await getNotificationById(notificationId, user.id)
    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Not Found', message: '通知不存在或无权限访问' },
        { status: 404 }
      )
    }

    // TODO: 添加权限检查 - 只有通知创建者或管理员可以修改
    // 这里需要实现具体的权限检查逻辑

    // 解析请求体
    const body = await request.json()

    // 验证请求数据（只允许修改特定字段）
    const allowedFields = ['title', 'content', 'metadata']
    const updates: any = {}
    const errors: string[] = []

    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'title' && (!body[field] || typeof body[field] !== 'string' || body[field].trim().length === 0)) {
          errors.push('标题不能为空')
        } else if (field === 'content' && (!body[field] || typeof body[field] !== 'string' || body[field].trim().length === 0)) {
          errors.push('内容不能为空')
        } else if (field === 'metadata' && (typeof body[field] !== 'object' || body[field] === null)) {
          errors.push('元数据必须是对象')
        } else {
          updates[field] = body[field]
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: '请求数据无效',
          details: errors
        },
        { status: 400 }
      )
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: '没有有效的更新字段' },
        { status: 400 }
      )
    }

    // 添加更新时间
    updates.updated_at = new Date().toISOString()

    // 执行更新
    const { data: updatedNotification, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', notificationId)
      .eq('user_id', user.id) // 确保只能更新自己的通知
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update notification: ${error.message}`)
    }

    // 格式化响应数据
    const formattedNotification = {
      ...updatedNotification,
      formatted_time: NotificationUtils.formatNotificationTime(updatedNotification.created_at),
      summary: NotificationUtils.formatNotificationSummary(updatedNotification),
      type_label: NotificationUtils.getNotificationTypeLabel(updatedNotification.type),
      type_icon: NotificationUtils.getNotificationTypeIcon(updatedNotification.type),
      priority_label: NotificationUtils.getNotificationPriorityLabel(updatedNotification.priority),
      priority_color: NotificationUtils.getNotificationPriorityColor(updatedNotification.priority),
      url: NotificationUtils.generateNotificationUrl(updatedNotification)
    }

    const response = {
      success: true,
      data: {
        notification: formattedNotification,
        updates_applied: Object.keys(updates).filter(key => key !== 'updated_at'),
        updated_at: updates.updated_at
      },
      message: '通知更新成功'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error updating notification:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '更新通知失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}
