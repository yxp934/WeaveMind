import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserNotificationPreferences, updateNotificationPreference, deleteNotificationPreference } from '@/lib/notifications/queries'
import { Schemas } from '@/lib/notifications/schemas'
import { NotificationUtils } from '@/lib/notifications/utils'

/**
 * GET /api/notifications/preferences
 * 获取用户通知偏好设置
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
    const validatedQuery = Schemas.NotificationPreferenceQuery.safeParse(searchParams)

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

    const filters = validatedQuery.data

    // 获取通知偏好设置
    const preferences = await getUserNotificationPreferences(user.id, filters)

    // 格式化响应数据
    const formattedPreferences = preferences.map(preference => ({
      ...preference,
      delivery_preferences_formatted: {
        in_app: preference.delivery_preferences.in_app ? '✓' : '✗',
        email: preference.delivery_preferences.email ? '✓' : '✗',
        push: preference.delivery_preferences.push ? '✓' : '✗'
      },
      type_label: NotificationUtils.getNotificationTypeLabel(preference.notification_type),
      priority_label: NotificationUtils.getNotificationPriorityLabel(preference.priority),
      scope_label: getScopeLabel(preference.scope),
      quiet_hours_status: getQuietHoursStatus(preference),
      dnd_status: getDndStatus(preference)
    }))

    // 按类型分组偏好设置
    const groupedPreferences = NotificationUtils.groupNotificationsByType(formattedPreferences)

    // 统计信息
    const stats = {
      total_preferences: preferences.length,
      by_scope: {} as Record<string, number>,
      by_type: NotificationUtils.countNotificationsByType(preferences),
      delivery_method_usage: {
        in_app: preferences.filter(p => p.delivery_preferences.in_app).length,
        email: preferences.filter(p => p.delivery_preferences.email).length,
        push: preferences.filter(p => p.delivery_preferences.push).length
      },
      quiet_hours_enabled: preferences.filter(p => p.quiet_hours_enabled).length,
      dnd_enabled: preferences.filter(p => p.dnd_enabled).length
    }

    // 按范围统计
    preferences.forEach(preference => {
      const scope = preference.scope
      stats.by_scope[scope] = (stats.by_scope[scope] || 0) + 1
    })

    const response = {
      success: true,
      data: {
        preferences: formattedPreferences,
        grouped_preferences: groupedPreferences,
        filters_applied: filters,
        statistics: stats
      },
      message: '通知偏好设置获取成功'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error fetching notification preferences:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '获取通知偏好设置失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/preferences
 * 更新通知偏好设置
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
    const validatedData = Schemas.NotificationPreferenceUpdate.safeParse(body)

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

    const preferenceData = validatedData.data

    // 更新偏好设置
    const updatedPreference = await updateNotificationPreference(user.id, preferenceData)

    // 格式化响应数据
    const formattedPreference = {
      ...updatedPreference,
      delivery_preferences_formatted: {
        in_app: updatedPreference.delivery_preferences.in_app ? '✓' : '✗',
        email: updatedPreference.delivery_preferences.email ? '✓' : '✗',
        push: updatedPreference.delivery_preferences.push ? '✓' : '✗'
      },
      type_label: NotificationUtils.getNotificationTypeLabel(updatedPreference.notification_type),
      priority_label: NotificationUtils.getNotificationPriorityLabel(updatedPreference.priority),
      scope_label: getScopeLabel(updatedPreference.scope),
      quiet_hours_status: getQuietHoursStatus(updatedPreference),
      dnd_status: getDndStatus(updatedPreference)
    }

    const response = {
      success: true,
      data: {
        preference: formattedPreference,
        updated_fields: Object.keys(preferenceData)
      },
      message: '通知偏好设置更新成功'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error updating notification preferences:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '更新通知偏好设置失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/preferences
 * 批量更新通知偏好设置
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

    // 验证批量更新数据
    const { preferences, default_preferences } = body

    if (!Array.isArray(preferences) || preferences.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: '偏好设置数组不能为空' },
        { status: 400 }
      )
    }

    if (preferences.length > 50) {
      return NextResponse.json(
        { error: 'Bad Request', message: '批量更新不能超过50个偏好设置' },
        { status: 400 }
      )
    }

    // 验证每个偏好设置
    const validatedPreferences = []
    const errors: string[] = []

    for (let i = 0; i < preferences.length; i++) {
      const pref = preferences[i]
      const validated = Schemas.NotificationPreferenceUpdate.safeParse(pref)

      if (!validated.success) {
        errors.push(`偏好设置 ${i + 1}: ${validated.error.errors.map(e => e.message).join(', ')}`)
      } else {
        validatedPreferences.push(validated.data)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: '批量更新数据验证失败',
          details: errors
        },
        { status: 400 }
      )
    }

    // 执行批量更新
    const results = []
    for (const prefData of validatedPreferences) {
      try {
        const updated = await updateNotificationPreference(user.id, prefData)
        results.push({
          success: true,
          notification_type: updated.notification_type,
          preference: updated
        })
      } catch (error: any) {
        results.push({
          success: false,
          notification_type: prefData.notification_type,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    const response = {
      success: true,
      data: {
        batch_results: results,
        summary: {
          total: preferences.length,
          successful: successCount,
          failed: failureCount
        }
      },
      message: `批量更新完成: ${successCount}个成功, ${failureCount}个失败`
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error batch updating notification preferences:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '批量更新通知偏好设置失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/preferences
 * 删除通知偏好设置
 */
export async function DELETE(request: NextRequest) {
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
    const { preference_id } = body

    if (!preference_id) {
      return NextResponse.json(
        { error: 'Bad Request', message: '偏好设置ID是必需的' },
        { status: 400 }
      )
    }

    // 验证偏好设置ID格式
    const validatedId = Schemas.Uuid.safeParse(preference_id)
    if (!validatedId.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: '无效的偏好设置ID格式' },
        { status: 400 }
      )
    }

    // 执行删除
    await deleteNotificationPreference(user.id, preference_id)

    const response = {
      success: true,
      data: {
        preference_id,
        deleted_at: new Date().toISOString()
      },
      message: '通知偏好设置删除成功'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error deleting notification preference:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '删除通知偏好设置失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * 辅助函数：获取范围标签
 */
function getScopeLabel(scope: string): string {
  const labels: Record<string, string> = {
    individual: '个人',
    organization: '组织',
    class: '班级'
  }
  return labels[scope] || scope
}

/**
 * 辅助函数：获取静默时间状态
 */
function getQuietHoursStatus(preference: any): any {
  if (!preference.quiet_hours_enabled) {
    return {
      enabled: false,
      status: '已禁用'
    }
  }

  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM 格式
  const start = preference.quiet_hours_start
  const end = preference.quiet_hours_end

  let isInQuietHours = false
  if (start && end) {
    if (start <= end) {
      // 同一天内
      isInQuietHours = currentTime >= start && currentTime <= end
    } else {
      // 跨天
      isInQuietHours = currentTime >= start || currentTime <= end
    }
  }

  return {
    enabled: true,
    status: isInQuietHours ? '静默中' : '活跃',
    start_time: start,
    end_time: end,
    timezone: preference.quiet_hours_timezone,
    is_currently_active: isInQuietHours
  }
}

/**
 * 辅助函数：获取免打扰状态
 */
function getDndStatus(preference: any): any {
  if (!preference.dnd_enabled) {
    return {
      enabled: false,
      status: '已禁用'
    }
  }

  const now = new Date()
  const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD 格式
  const startDate = preference.dnd_start_date
  const endDate = preference.dnd_end_date

  let isInDndPeriod = false
  if (startDate && endDate) {
    isInDndPeriod = currentDate >= startDate && currentDate <= endDate
  }

  return {
    enabled: true,
    status: isInDndPeriod ? '免打扰中' : '活跃',
    start_date: startDate,
    end_date: endDate,
    is_currently_active: isInDndPeriod
  }
}
