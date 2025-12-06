import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserNotifications } from '@/lib/notifications/queries'
import { Schemas } from '@/lib/notifications/schemas'
import { NotificationUtils } from '@/lib/notifications/utils'
import { z } from 'zod'

/**
 * GET /api/notifications
 * 获取用户通知列表（支持分页和过滤）
 */
export async function GET(request: NextRequest) {
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

    // 解析查询参数
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())
    
    // 验证查询参数
    const validatedQuery = Schemas.NotificationListQuery.safeParse(searchParams)
    
    if (!validatedQuery.success) {
      return NextResponse.json(
        { 
          error: 'Validation Error', 
          message: '查询参数无效',
          details: validatedQuery.error.errors
        },
        { status: 400 }
      )
    }

    const query = validatedQuery.data

    // 获取通知列表
    const result = await getUserNotifications(user.id, query)

    // 格式化响应数据
    const formattedNotifications = result.notifications.map(notification => ({
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
      is_expired: NotificationUtils.isNotificationExpired(notification)
    }))

    // 按优先级排序（如果需要）
    if (query.sort === 'priority_desc') {
      formattedNotifications.sort((a, b) => {
        const priorityDiff = NotificationUtils.getNotificationPriorityValue(b.priority) - 
                           NotificationUtils.getNotificationPriorityValue(a.priority)
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    // 构建响应
    const response = {
      success: true,
      data: {
        notifications: formattedNotifications,
        pagination: result.pagination,
        filters_applied: {
          status: query.status,
          type: query.type,
          priority: query.priority,
          sort: query.sort,
          class_id: query.class_id,
          course_id: query.course_id,
          date_range: {
            from: query.date_from,
            to: query.date_to
          }
        },
        summary: {
          total: result.pagination.total,
          unread: formattedNotifications.filter(n => !n.is_read).length,
          read: formattedNotifications.filter(n => n.is_read && !n.is_archived).length,
          archived: formattedNotifications.filter(n => n.is_archived).length,
          by_type: NotificationUtils.countNotificationsByType(formattedNotifications),
          by_priority: NotificationUtils.countNotificationsByPriority(formattedNotifications)
        }
      },
      message: '通知列表获取成功'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    
    // 区分不同类型的错误
    if (error.message?.includes('Failed to fetch notifications')) {
      return NextResponse.json(
        { 
          error: 'Database Error', 
          message: '获取通知失败，请稍后重试',
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
 * POST /api/notifications
 * 创建新通知（仅限系统和管理员使用）
 */
export async function POST(request: NextRequest) {
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
    const validatedData = Schemas.NotificationCreate.safeParse(body)
    
    if (!validatedData.success) {
      return NextResponse.json(
        { 
          error: 'Validation Error', 
          message: '请求数据无效',
          details: validatedData.error.errors
        },
        { status: 400 }
      )
    }

    // TODO: 添加权限检查 - 只有教师和管理员可以创建通知
    // 这里需要实现具体的权限检查逻辑

    // 创建通知
    const notificationData = validatedData.data
    const notification = await createNotification(notificationData, user.id)

    // 格式化响应数据
    const formattedNotification = {
      ...notification,
      formatted_time: NotificationUtils.formatNotificationTime(notification.created_at),
      summary: NotificationUtils.formatNotificationSummary(notification),
      type_label: NotificationUtils.getNotificationTypeLabel(notification.type),
      type_icon: NotificationUtils.getNotificationTypeIcon(notification.type),
      priority_label: NotificationUtils.getNotificationPriorityLabel(notification.priority),
      priority_color: NotificationUtils.getNotificationPriorityColor(notification.priority),
      url: NotificationUtils.generateNotificationUrl(notification)
    }

    const response = {
      success: true,
      data: formattedNotification,
      message: '通知创建成功'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error: any) {
    console.error('Error creating notification:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: '创建通知失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * 辅助函数：创建通知
 */
async function createNotification(notificationData: any, createdBy: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notificationData,
      created_by: createdBy
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`)
  }

  return data
}
