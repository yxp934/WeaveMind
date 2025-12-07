import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserNotificationSummary, getNotificationStatistics } from '@/lib/notifications/queries'
import { Schemas } from '@/lib/notifications/schemas'
import { NotificationUtils } from '@/lib/notifications/utils'

/**
 * GET /api/notifications/summary
 * 获取通知统计摘要
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
    const validatedQuery = Schemas.DateRange.safeParse(searchParams)

    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: '查询参数无效',
          details: (validatedQuery.error as any).errors || validatedQuery.error.issues
        },
        { status: 400 }
      )
    }

    const { date_from, date_to } = validatedQuery.data

    // 获取基本统计摘要（使用数据库函数）
    const summary = await getUserNotificationSummary(user.id)

    // 获取详细统计信息
    const detailedStats = await getNotificationStatistics(user.id, date_from, date_to)

    // 获取最近的未读通知
    const { data: recentUnreadNotifications } = await supabase
      .from('notifications')
      .select('id, title, type, priority, created_at')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('is_archived', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10)

    // 获取按班级分组的未读通知
    const { data: unreadByClass } = await supabase
      .from('notifications')
      .select(`
        id,
        class_id,
        classes!notifications_class_id_fkey(name),
        type,
        priority
      `)
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('is_archived', false)
      .not('class_id', 'is', null)

    // 获取按课程分组的未读通知
    const { data: unreadByCourse } = await supabase
      .from('notifications')
      .select(`
        id,
        course_id,
        courses!notifications_course_id_fkey(title),
        type,
        priority
      `)
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('is_archived', false)
      .not('course_id', 'is', null)

    // 处理分组数据
    const classGroups = (unreadByClass || []).reduce((groups: any, notification) => {
      const className = (notification.classes as any)?.name || '未知班级'
      if (!groups[className]) {
        groups[className] = {
          class_name: className,
          class_id: notification.class_id,
          count: 0,
          notifications: []
        }
      }
      groups[className].count++
      groups[className].notifications.push({
        id: notification.id,
        type: notification.type,
        priority: notification.priority
      })
      return groups
    }, {})

    const courseGroups = (unreadByCourse || []).reduce((groups: any, notification) => {
      const courseTitle = (notification.courses as any)?.title || '未知课程'
      if (!groups[courseTitle]) {
        groups[courseTitle] = {
          course_title: courseTitle,
          course_id: notification.course_id,
          count: 0,
          notifications: []
        }
      }
      groups[courseTitle].count++
      groups[courseTitle].notifications.push({
        id: notification.id,
        type: notification.type,
        priority: notification.priority
      })
      return groups
    }, {})

    // 计算紧急通知数量
    const urgentCount = summary.by_priority.urgent || 0

    // 计算今天的新通知
    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)

    // 获取本周统计
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const { data: weeklyData } = await supabase
      .from('notifications')
      .select('is_read, created_at')
      .eq('user_id', user.id)
      .gte('created_at', `${weekStartStr}T00:00:00.000Z`)

    const weeklyStats = {
      total: weeklyData?.length || 0,
      read: weeklyData?.filter(n => n.is_read).length || 0,
      unread: weeklyData?.filter(n => !n.is_read).length || 0
    }

    // 构建响应数据
    const response = {
      success: true,
      data: {
        overview: {
          total_unread: summary.total_unread,
          total_archived: summary.total_archived,
          today_new: todayCount || 0,
          urgent_count: urgentCount,
          weekly_activity: weeklyStats
        },
        distribution: {
          by_priority: summary.by_priority,
          by_type: summary.by_type
        },
        recent_activity: summary.recent_activity?.map((item: any) => ({
          ...item,
          formatted_time: NotificationUtils.formatNotificationTime(item.created_at),
          type_label: NotificationUtils.getNotificationTypeLabel(item.type),
          type_icon: NotificationUtils.getNotificationTypeIcon(item.type),
          priority_label: NotificationUtils.getNotificationPriorityLabel(item.priority),
          priority_color: NotificationUtils.getNotificationPriorityColor(item.priority)
        })) || [],
        groupings: {
          by_class: Object.values(classGroups),
          by_course: Object.values(courseGroups)
        },
        trends: {
          daily_average: calculateDailyAverage(detailedStats),
          most_common_type: getMostCommonType(summary.by_type),
          most_common_priority: getMostCommonPriority(summary.by_priority)
        },
        filters_applied: {
          date_range: {
            from: date_from,
            to: date_to
          }
        },
        generated_at: new Date().toISOString()
      },
      message: '通知统计摘要获取成功'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error fetching notification summary:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '获取通知统计摘要失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/summary
 * 获取自定义统计报告
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

    const {
      date_range,
      group_by = 'type',
      include_archived = false,
      filters = {}
    } = body

    // 构建查询
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)

    // 应用日期范围
    if (date_range?.from) {
      query = query.gte('created_at', date_range.from)
    }
    if (date_range?.to) {
      query = query.lte('created_at', date_range.to)
    }

    // 是否包含已归档通知
    if (!include_archived) {
      query = query.eq('is_archived', false)
    }

    // 应用其他过滤器
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters.class_id) {
      query = query.eq('class_id', filters.class_id)
    }
    if (filters.course_id) {
      query = query.eq('course_id', filters.course_id)
    }

    const { data: notifications, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }

    // 分组统计
    const groupedStats = groupNotifications(notifications || [], group_by)

    // 计算趋势
    const trends = calculateTrends(notifications || [], date_range)

    const response = {
      success: true,
      data: {
        notifications_count: notifications?.length || 0,
        grouped_statistics: groupedStats,
        trends: trends,
        filters_applied: {
          date_range,
          group_by,
          include_archived,
          filters
        }
      },
      message: '自定义统计报告生成成功'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error generating custom notification summary:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '生成自定义统计报告失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * 辅助函数：计算日均值
 */
function calculateDailyAverage(stats: any): number {
  if (!stats.total) return 0
  // 假设统计数据覆盖最近30天
  return Math.round(stats.total / 30 * 10) / 10
}

/**
 * 辅助函数：获取最常见的类型
 */
function getMostCommonType(byType: Record<string, number>): string | null {
  if (!byType || Object.keys(byType).length === 0) return null

  const entries = Object.entries(byType)
  entries.sort(([,a], [,b]) => b - a)
  return entries[0][0]
}

/**
 * 辅助函数：获取最常见的优先级
 */
function getMostCommonPriority(byPriority: Record<string, number>): string | null {
  if (!byPriority || Object.keys(byPriority).length === 0) return null

  const entries = Object.entries(byPriority)
  entries.sort(([,a], [,b]) => b - a)
  return entries[0][0]
}

/**
 * 辅助函数：分组通知
 */
function groupNotifications(notifications: any[], groupBy: string): any {
  const groups: any = {}

  notifications.forEach(notification => {
    let key: string

    switch (groupBy) {
      case 'type':
        key = notification.type
        break
      case 'priority':
        key = notification.priority
        break
      case 'date':
        key = notification.created_at.split('T')[0] // YYYY-MM-DD
        break
      case 'class':
        key = notification.class_id || 'no_class'
        break
      case 'course':
        key = notification.course_id || 'no_course'
        break
      default:
        key = notification.type
    }

    if (!groups[key]) {
      groups[key] = {
        group_key: key,
        count: 0,
        read_count: 0,
        unread_count: 0,
        notifications: []
      }
    }

    groups[key].count++
    groups[key].notifications.push(notification)

    if (notification.is_read) {
      groups[key].read_count++
    } else {
      groups[key].unread_count++
    }
  })

  return Object.values(groups)
}

/**
 * 辅助函数：计算趋势
 */
function calculateTrends(notifications: any[], dateRange: any): any {
  if (!notifications || notifications.length === 0) {
    return {
      daily_average: 0,
      weekly_growth: 0,
      most_active_day: null,
      peak_hours: []
    }
  }

  // 按日期分组
  const dailyCounts: Record<string, number> = {}
  const hourlyCounts: Record<number, number> = {}

  notifications.forEach(notification => {
    const date = notification.created_at.split('T')[0]
    const hour = new Date(notification.created_at).getHours()

    dailyCounts[date] = (dailyCounts[date] || 0) + 1
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1
  })

  // 计算日均值
  const days = Object.keys(dailyCounts).length
  const total = notifications.length
  const dailyAverage = days > 0 ? total / days : 0

  // 计算周增长率（简化版）
  const sortedDates = Object.keys(dailyCounts).sort()
  const recentWeek = sortedDates.slice(-7)
  const previousWeek = sortedDates.slice(-14, -7)

  const recentWeekCount = recentWeek.reduce((sum, date) => sum + dailyCounts[date], 0)
  const previousWeekCount = previousWeek.reduce((sum, date) => sum + dailyCounts[date], 0)

  const weeklyGrowth = previousWeekCount > 0
    ? ((recentWeekCount - previousWeekCount) / previousWeekCount) * 100
    : 0

  // 找到最活跃的一天
  const mostActiveDay = Object.entries(dailyCounts).reduce((max, [date, count]) =>
    count > max.count ? { date, count } : max,
    { date: null as string | null, count: 0 }
  )

  // 找到高峰时段
  const peakHours = Object.entries(hourlyCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return {
    daily_average: Math.round(dailyAverage * 10) / 10,
    weekly_growth: Math.round(weeklyGrowth * 10) / 10,
    most_active_day: mostActiveDay,
    peak_hours: peakHours
  }
}
