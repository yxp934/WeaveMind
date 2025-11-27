import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get classId from query params
  const searchParams = request.nextUrl.searchParams
  const classId = searchParams.get('classId')

  if (!classId) {
    return NextResponse.json(
      { error: 'classId is required' },
      { status: 400 }
    )
  }

  // Verify user is a teacher in this class
  const { data: membership } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get class progress summary
  const { data: progress, error } = await supabase
    .from('class_progress_summary')
    .select('*')
    .eq('class_id', classId)
    .order('last_activity_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error fetching class progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }

  // Get student emails using admin API (server-side only)
  const studentIds = [...new Set(progress?.map((p) => p.student_id) || [])]
  const studentEmails: Record<string, string> = {}

  for (const studentId of studentIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(studentId)
    if (userData?.user?.email) {
      studentEmails[studentId] = userData.user.email
    }
  }

  // Add emails to progress data
  const progressWithEmails = (progress || []).map((item) => ({
    ...item,
    student_email: studentEmails[item.student_id] || 'Unknown',
  }))

  return NextResponse.json(progressWithEmails)
}

