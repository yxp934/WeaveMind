import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification, createNotificationQueueEntries, verifyTeacherPermission } from '@/lib/notifications/queries'
import { Schemas } from '@/lib/notifications/schemas'
import { NotificationUtils } from '@/lib/notifications/utils'

/**
 * POST /api/notifications/send
 * 发送通知给用户或班级（仅限教师权限）
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
    const validatedData = Schemas.NotificationSend.safeParse(body)

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

    const {
      recipients,
      title,
      content,
      type,
      priority = 'normal',
      class_id,
      course_id,
      assignment_id,
      delivery_methods = ['in_app'],
      metadata = {},
      scheduled_for,
      expires_at
    } = validatedData.data

    // 权限检查：验证用户是否为教师
    let hasPermission = false

    for (const recipient of recipients) {
      if (recipient.type === 'class') {
        // 检查是否为该班级的教师
        hasPermission = await verifyTeacherPermission(user.id, recipient.id, 'class')
      } else if (recipient.type === 'organization') {
        // 检查是否为该组织的管理员或教师
        hasPermission = await verifyTeacherPermission(user.id, recipient.id, 'organization')
      } else {
        // 个人通知，检查是否有权限发送给该用户
        // 这里可以添加更细粒度的权限检查
        hasPermission = true
      }

      if (!hasPermission) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: '您没有权限向这些接收者发送通知',
            details: `无法验证对接收者 ${recipient.type}:${recipient.id} 的权限`
          },
          { status: 403 }
        )
      }
    }

    // 获取接收者的详细信息
    const recipientDetails = await getRecipientDetails(supabase, recipients, class_id)

    if (recipientDetails.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: '没有找到有效的接收者' },
        { status: 400 }
      )
    }

    // 创建通知数据
    const notifications = recipientDetails.map(recipient => ({
      user_id: recipient.user_id,
      organization_id: recipient.organization_id,
      title,
      content,
      type,
      priority,
      scope: recipient.scope,
      class_id: recipient.class_id || null,
      course_id: course_id || null,
      assignment_id: assignment_id || null,
      delivery_methods,
      metadata: {
        ...metadata,
        sender_id: user.id,
        sender_info: {
          email: user.email
        },
        recipient_info: {
          type: recipient.type,
          id: recipient.id
        }
      },
      scheduled_for: scheduled_for || null,
      expires_at: expires_at || null,
      created_by: user.id
    }))

    // 批量创建通知
    const createdNotifications = await createBulkNotifications(supabase, notifications)

    // 为每个通知创建队列条目
    const queueResults = []
    for (const notification of createdNotifications) {
      try {
        const queueEntries = await createNotificationQueueEntries(
          notification.id,
          delivery_methods,
          scheduled_for
        )
        queueResults.push({
          notification_id: notification.id,
          queue_entries_created: queueEntries.length,
          queue_entries: queueEntries
        })
      } catch (error: any) {
        queueResults.push({
          notification_id: notification.id,
          queue_entries_created: 0,
          error: error.message
        })
      }
    }

    // 统计信息
    const stats = {
      total_recipients: recipientDetails.length,
      notifications_created: createdNotifications.length,
      queue_entries_created: queueResults.reduce((sum, r) => sum + r.queue_entries_created, 0),
      delivery_methods: delivery_methods,
      scheduled: !!scheduled_for,
      expires: !!expires_at
    }

    // 格式化响应数据
    const formattedNotifications = createdNotifications.map(notification => ({
      ...notification,
      formatted_time: NotificationUtils.formatNotificationTime(notification.created_at),
      summary: NotificationUtils.formatNotificationSummary(notification),
      type_label: NotificationUtils.getNotificationTypeLabel(notification.type),
      type_icon: NotificationUtils.getNotificationTypeIcon(notification.type),
      priority_label: NotificationUtils.getNotificationPriorityLabel(notification.priority),
      priority_color: NotificationUtils.getNotificationPriorityColor(notification.priority)
    }))

    const response = {
      success: true,
      data: {
        notifications: formattedNotifications,
        queue_results: queueResults,
        recipients: recipientDetails,
        statistics: stats,
        scheduling_info: {
          scheduled_for,
          expires_at,
          delivery_methods
        }
      },
      message: `成功发送 ${createdNotifications.length} 条通知给 ${recipientDetails.length} 个接收者`
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error: any) {
    console.error('Error sending notifications:', error)

    // 区分不同类型的错误
    if (error.message?.includes('Failed to create notification')) {
      return NextResponse.json(
        {
          error: 'Database Error',
          message: '创建通知失败，请稍后重试',
          details: error.message
        },
        { status: 500 }
      )
    }

    if (error.message?.includes('Failed to verify teacher permission')) {
      return NextResponse.json(
        {
          error: 'Permission Error',
          message: '权限验证失败',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '发送通知失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/send
 * 获取发送通知的说明和可用类型
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      description: '发送通知给用户或班级（仅限教师权限）',
      notification_types: [
        { value: 'course_update', label: '课程更新', icon: '📚' },
        { value: 'assignment_due', label: '作业到期', icon: '📝' },
        { value: 'new_discussion', label: '新讨论', icon: '💬' },
        { value: 'discussion_reply', label: '讨论回复', icon: '💭' },
        { value: 'grade_posted', label: '成绩发布', icon: '🎯' },
        { value: 'class_announcement', label: '班级公告', icon: '📢' },
        { value: 'system_alert', label: '系统警报', icon: '⚠️' },
        { value: 'ai_assistance', label: 'AI助手', icon: '🤖' },
        { value: 'material_shared', label: '资料分享', icon: '📎' },
        { value: 'deadline_reminder', label: '截止提醒', icon: '⏰' },
        { value: 'feedback_received', label: '收到反馈', icon: '💬' },
        { value: 'peer_message', label: '同伴消息', icon: '👥' }
      ],
      priorities: [
        { value: 'low', label: '低' },
        { value: 'normal', label: '普通' },
        { value: 'high', label: '高' },
        { value: 'urgent', label: '紧急' }
      ],
      delivery_methods: [
        { value: 'in_app', label: '应用内' },
        { value: 'email', label: '邮件' },
        { value: 'push', label: '推送' }
      ],
      recipient_types: [
        { value: 'user', label: '单个用户', description: '发送给特定用户' },
        { value: 'class', label: '整个班级', description: '发送给班级所有成员' },
        { value: 'organization', label: '整个组织', description: '发送给组织所有成员' }
      ],
      examples: {
        send_to_class: {
          method: 'POST',
          body: {
            recipients: [
              {
                type: 'class',
                id: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            title: '作业提醒',
            content: '请注意，数学作业明天截止提交。',
            type: 'assignment_due',
            priority: 'high',
            class_id: '123e4567-e89b-12d3-a456-426614174000',
            delivery_methods: ['in_app', 'push']
          }
        },
        send_to_individual: {
          method: 'POST',
          body: {
            recipients: [
              {
                type: 'user',
                id: '987fcdeb-51a2-43d1-9c4f-123456789abc'
              }
            ],
            title: '成绩发布',
            content: '您的数学考试分数已发布。',
            type: 'grade_posted',
            priority: 'normal'
          }
        },
        scheduled_notification: {
          method: 'POST',
          body: {
            recipients: [
              {
                type: 'class',
                id: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            title: '课程提醒',
            content: '明天我们将学习新的章节。',
            type: 'course_update',
            scheduled_for: '2024-01-15T09:00:00Z',
            expires_at: '2024-01-16T09:00:00Z'
          }
        }
      }
    },
    message: '发送通知API文档'
  })
}

/**
 * 辅助函数：获取接收者详细信息
 */
async function getRecipientDetails(
  supabase: any,
  recipients: any[],
  classId?: string
): Promise<any[]> {
  const recipientDetails: any[] = []

  for (const recipient of recipients) {
    if (recipient.type === 'user') {
      // 获取单个用户信息
      const { data: userData } = await supabase
        .from('auth.users')
        .select('id, email, raw_user_meta_data')
        .eq('id', recipient.id)
        .single()

      if (userData) {
        // 获取用户的组织信息
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', userData.id)
          .eq('role', 'student')
          .single()

        if (orgMember) {
          recipientDetails.push({
            user_id: userData.id,
            organization_id: orgMember.organization_id,
            scope: 'individual',
            type: 'user',
            id: recipient.id,
            email: userData.email
          })
        }
      }
    } else if (recipient.type === 'class') {
      // 获取班级所有学生
      const { data: classMembers } = await supabase
        .from('class_members')
        .select(`
          user_id,
          role,
          organization_members!inner(
            organization_id,
            role
          )
        `)
        .eq('class_id', recipient.id)
        .eq('role', 'student')

      if (classMembers) {
        for (const member of classMembers) {
          const organizationId = member.organization_members.organization_id
          recipientDetails.push({
            user_id: member.user_id,
            organization_id: organizationId,
            scope: 'class',
            type: 'class',
            id: recipient.id,
            class_id: recipient.id
          })
        }
      }
    } else if (recipient.type === 'organization') {
      // 获取组织所有学生
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id, organization_id')
        .eq('organization_id', recipient.id)
        .eq('role', 'student')

      if (orgMembers) {
        for (const member of orgMembers) {
          recipientDetails.push({
            user_id: member.user_id,
            organization_id: member.organization_id,
            scope: 'organization',
            type: 'organization',
            id: recipient.id
          })
        }
      }
    }
  }

  return recipientDetails
}

/**
 * 辅助函数：批量创建通知
 */
async function createBulkNotifications(supabase: any, notifications: any[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select()

  if (error) {
    throw new Error(`Failed to create bulk notifications: ${error.message}`)
  }

  return data || []
}
