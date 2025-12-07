/**
 * Phase 6: 教师仪表板AI工具定义
 *
 * 定义教师仪表板专用的AI工具，包括信息提取和创建功能
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 工具：获取班级进度摘要
 */
export const getClassProgressTool = tool({
  description: '获取特定班级的进度摘要，包括学生数量和完成率',
  inputSchema: z.object({
    classId: z.string().describe('班级的UUID'),
  }),
  execute: async ({ classId }) => {
    const supabase = createAdminClient()

    // 获取班级基本信息
    const { data: classData } = await supabase
      .from('classes')
      .select('id, name, description')
      .eq('id', classId)
      .single()

    if (!classData) {
      throw new Error('班级不存在')
    }

    // 获取学生数量
    const { data: members } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('role', 'student')

    const studentCount = members?.length || 0

    // 获取学习进度（从学习事件计算）
    const { data: learningEvents } = await supabase
      .from('learning_events')
      .select('event_type, created_at')
      .eq('class_id', classId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // 计算已完成课程数（通过学习事件）
    const completedSessions = learningEvents?.filter(event => event.event_type === 'session_completed').length || 0
    const totalSessions = learningEvents?.filter(event => event.event_type === 'session_started').length || 1

    // 计算平均进度
    const averageProgress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

    return {
      success: true,
      message: '班级进度获取成功',
      data: {
        className: classData.name,
        studentCount,
        averageProgress,
        completedSessions,
        totalSessions,
      },
    }
  },
})

/**
 * 工具：检查特定学生状态
 */
export const getStudentStatusTool = tool({
  description: '检查特定学生的状态或班级内所有学生的状态',
  inputSchema: z.object({
    studentName: z.string().optional().describe('学生姓名（用于搜索）'),
    classId: z.string().optional().describe('班级ID（用于获取班级内所有学生）'),
  }),
  execute: async ({ studentName, classId }) => {
    const supabase = createAdminClient()

    let query = supabase
      .from('class_members')
      .select(`
        user_id,
        role,
        joined_at,
        users!inner (
          email,
          raw_user_meta_data
        )
      `)
      .eq('role', 'student')

    if (classId) {
      query = query.eq('class_id', classId)
    }

    if (studentName) {
      query = query.ilike('users.raw_user_meta_data->>full_name', `%${studentName}%`)
    }

    const { data: members } = await query

    const students = await Promise.all(
      (members || []).map(async (member) => {
        // 获取学生提交情况
        const { data: submissions } = await supabase
          .from('submissions')
          .select('id, created_at')
          .eq('user_id', member.user_id)

        // 获取最后活动时间（从学习事件）
        const { data: lastEvent } = await supabase
          .from('learning_events')
          .select('created_at')
          .eq('user_id', member.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // 计算进度（简单估算）
        const { data: totalAssignments } = await supabase
          .from('assignments')
          .select('id')
          .eq('class_id', classId || '')

        const progress = totalAssignments?.length
          ? Math.round(((submissions?.length || 0) / totalAssignments.length) * 100)
          : 0

        return {
          name: (member.users as any).raw_user_meta_data?.full_name || '未知',
          email: (member.users as any).email,
          progress,
          lastActivity: lastEvent?.created_at || member.joined_at,
          submissions: submissions?.length || 0,
        }
      })
    )

    return {
      success: true,
      message: '学生状态获取成功',
      data: {
        students,
      },
    }
  },
})

/**
 * 工具：列出即将到期的作业
 */
export const getUpcomingDeadlinesTool = tool({
  description: '列出即将到期的作业，默认显示未来7天内',
  inputSchema: z.object({
    days: z.number().optional().describe('天数，默认7天').default(7),
  }),
  execute: async ({ days }) => {
    const supabase = createAdminClient()

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const { data: assignments } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        description,
        due_date,
        class_id,
        classes!inner (
          name
        )
      `)
      .gte('due_date', new Date().toISOString())
      .lte('due_date', futureDate.toISOString())
      .order('due_date', { ascending: true })

    const assignmentsWithCount = await Promise.all(
      (assignments || []).map(async (assignment) => {
        // 获取提交数量
        const { data: submissions } = await supabase
          .from('submissions')
          .select('id')
          .eq('assignment_id', assignment.id)

        // 获取班级学生总数
        const { data: classMembers } = await supabase
          .from('class_members')
          .select('user_id')
          .eq('class_id', assignment.class_id)
          .eq('role', 'student')

        return {
          title: assignment.title,
          className: (assignment.classes as any).name,
          dueDate: assignment.due_date,
          submissionCount: submissions?.length || 0,
          totalStudents: classMembers?.length || 0,
        }
      })
    )

    return {
      success: true,
      message: '即将到期的作业获取成功',
      data: {
        assignments: assignmentsWithCount,
      },
    }
  },
})

/**
 * 工具：获取安排的课程
 */
export const getSessionScheduleTool = tool({
  description: '获取安排的课程，可指定班级和天数范围',
  inputSchema: z.object({
    classId: z.string().optional().describe('班级ID（可选）'),
    days: z.number().optional().describe('天数范围，默认7天').default(7),
  }),
  execute: async ({ classId, days }) => {
    const supabase = createAdminClient()

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    let query = supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        scheduled_date,
        start_time,
        duration_minutes,
        class_id,
        classes!inner (
          name
        )
      `)
      .gte('scheduled_date', new Date().toISOString())
      .lte('scheduled_date', futureDate.toISOString())
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data: sessions } = await query

    const formattedSessions = (sessions || []).map(session => ({
      title: session.title,
      className: (session.classes as any).name,
      date: session.scheduled_date,
      time: session.start_time,
      duration: session.duration_minutes,
    }))

    return {
      success: true,
      message: '课程安排获取成功',
      data: {
        sessions: formattedSessions,
      },
    }
  },
})

/**
 * 工具：创建新班级
 */
export const createClassTool = tool({
  description: '创建新班级，生成加入代码',
  inputSchema: z.object({
    name: z.string().describe('班级名称'),
    description: z.string().optional().describe('班级描述'),
  }),
  execute: async ({ name, description }) => {
    const supabase = createAdminClient()

    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('用户未认证')
    }

    // 获取用户的组织信息
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single()

    if (!orgMember) {
      throw new Error('只有组织所有者可以创建班级')
    }

    // 生成随机加入代码
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: classData, error } = await supabase
      .from('classes')
      .insert({
        name,
        description: description || '',
        organization_id: orgMember.organization_id,
        join_code: joinCode,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // 创建者自动成为班级管理员
    await supabase
      .from('class_members')
      .insert({
        class_id: classData.id,
        user_id: user.id,
        role: 'teacher',
      })

    return {
      success: true,
      message: '班级创建成功',
      data: {
        classId: classData.id,
        joinCode: joinCode,
      },
    }
  },
})

/**
 * 工具：为班级创建新课程
 */
export const createSessionTool = tool({
  description: '为指定班级创建新课程',
  inputSchema: z.object({
    classId: z.string().describe('班级ID'),
    title: z.string().describe('课程标题'),
    description: z.string().optional().describe('课程描述'),
    scheduledDate: z.string().describe('预定日期 (YYYY-MM-DD)'),
    startTime: z.string().optional().describe('开始时间 (HH:MM)'),
  }),
  execute: async ({ classId, title, description, scheduledDate, startTime }) => {
    const supabase = createAdminClient()

    // 验证用户权限（必须是班级教师或组织所有者）
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('用户未认证')
    }

    const { data: membership } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'teacher' && membership.role !== 'owner')) {
      throw new Error('无权为此班级创建课程')
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        class_id: classId,
        title,
        description: description || '',
        scheduled_date: scheduledDate,
        start_time: startTime || '09:00',
        duration_minutes: 60, // 默认60分钟
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      message: '课程创建成功',
      data: {
        sessionId: session.id,
      },
    }
  },
})

/**
 * 工具：创建作业
 */
export const createAssignmentTool = tool({
  description: '为指定班级创建作业（非AI生成问题）',
  inputSchema: z.object({
    classId: z.string().describe('班级ID'),
    title: z.string().describe('作业标题'),
    description: z.string().optional().describe('作业描述'),
    dueDate: z.string().optional().describe('截止日期 (YYYY-MM-DD HH:MM)'),
  }),
  execute: async ({ classId, title, description, dueDate }) => {
    const supabase = createAdminClient()

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('用户未认证')
    }

    const { data: membership } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'teacher' && membership.role !== 'owner')) {
      throw new Error('无权为此班级创建作业')
    }

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        class_id: classId,
        title,
        description: description || '',
        due_date: dueDate || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      message: '作业创建成功',
      data: {
        assignmentId: assignment.id,
      },
    }
  },
})

/**
 * 所有教师仪表板工具集合
 */
export const teacherDashboardTools = {
  getClassProgress: getClassProgressTool,
  getStudentStatus: getStudentStatusTool,
  getUpcomingDeadlines: getUpcomingDeadlinesTool,
  getSessionSchedule: getSessionScheduleTool,
  createClass: createClassTool,
  createSession: createSessionTool,
  createAssignment: createAssignmentTool,
}
