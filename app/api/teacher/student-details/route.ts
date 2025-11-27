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

  // Get studentId from query params
  const searchParams = request.nextUrl.searchParams
  const studentId = searchParams.get('studentId')

  if (!studentId) {
    return NextResponse.json(
      { error: 'studentId is required' },
      { status: 400 }
    )
  }

  // Get student email
  const { data: userData } = await supabase.auth.admin.getUserById(studentId)
  const studentEmail = userData?.user?.email || 'Unknown'

  // Get component progress
  const { data: componentProgress } = await supabase
    .from('component_progress')
    .select('*')
    .eq('student_id', studentId)
    .order('last_activity_at', { ascending: false, nullsFirst: false })

  // Get recent activity
  const { data: recentActivity } = await supabase
    .from('learning_events')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    studentEmail,
    componentProgress: componentProgress || [],
    recentActivity: recentActivity || [],
  })
}

