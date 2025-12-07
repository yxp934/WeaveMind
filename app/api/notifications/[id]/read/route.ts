import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateNotification, getNotificationById, createNotificationReadStatus } from '@/lib/notifications/queries'
import { Schemas } from '@/lib/notifications/schemas'
import { NotificationUtils } from '@/lib/notifications/utils'

/**
 * PUT /api/notifications/[id]/read
 * 标记通知为已读
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

    // 检查通知是否存在且属于当前用户
    const existingNotification = await getNotificationById(notificationId, user.id)
    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Not Found', message: '通知不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 如果已经标记为已读，直接返回成功
    if (existingNotification.is_read) {
      return NextResponse.json({
        success: true,
        data: {
          notification: existingNotification,
          already_read: true
        },
        message: '通知已经是已读状态'
      })
    }

    // 解析请求体（可选）
    let body = {}
    try {
      body = await request.json()
    } catch {
      // 如果没有请求体，使用默认值
      body = {}
    }

    // 验证请求数据
    const validatedData = Schemas.NotificationUpdate.safeParse(body)
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

    const updates = validatedData.data

    // 构建更新数据
    const updateData = {
      is_read: true,
      read_at: updates.read_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 更新通知状态
    const updatedNotification = await updateNotification(notificationId, user.id, updateData)

    // 创建详细的阅读状态记录
    try {
      await createNotificationReadStatus(notificationId, user.id, {
        marked_read_at: updateData.read_at,
        method: 'api_call',
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      })
    } catch (error) {
      // 阅读状态记录失败不影响主要操作
      console.warn('Failed to create read status record:', error)
    }

    // 格式化响应数据
    const formattedNotification = {
      ...updatedNotification,
      formatted_time: NotificationUtils.formatNotificationTime(updatedNotification.created_at),
      read_time: NotificationUtils.formatNotificationTime(updatedNotification.read_at!),
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
        operation: {
          action: 'mark_as_read',
          timestamp: updateData.read_at
        }
      },
      message: '通知已标记为已读'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error marking notification as read:', error)

    // 区分不同类型的错误
    if (error.message?.includes('Failed to update notification')) {
      return NextResponse.json(
        {
          error: 'Database Error',
          message: '更新通知失败，请稍后重试',
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
 * GET /api/notifications/[id]/read
 * 获取通知的阅读状态
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

    // 获取通知信息
    const notification = await getNotificationById(notificationId, user.id)
    if (!notification) {
      return NextResponse.json(
        { error: 'Not Found', message: '通知不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 获取详细的阅读状态
    const { data: readStatus } = await supabase
      .from('notification_read_status')
      .select('*')
      .eq('notification_id', notificationId)
      .eq('user_id', user.id)
      .single()

    const response = {
      success: true,
      data: {
        notification: {
          id: notification.id,
          title: notification.title,
          type: notification.type,
          priority: notification.priority,
          created_at: notification.created_at
        },
        read_status: {
          is_read: notification.is_read,
          read_at: notification.read_at,
          formatted_read_time: notification.read_at ?
            NotificationUtils.formatNotificationTime(notification.read_at) : null,
          detailed_status: readStatus
        }
      },
      message: '阅读状态获取成功'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error getting notification read status:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '获取阅读状态失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}
