import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Verify user is teacher of this class
    const { data: classData } = await supabase
      .from('classes')
      .select('organization_id')
      .eq('id', classId)
      .single()

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', classData.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgMember || !['owner', 'teacher'].includes(orgMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get sessions for this class
    const { data: sessions, error } = await supabase
      .from('course_sessions')
      .select(`
        id,
        session_number,
        title,
        description,
        scheduled_date,
        start_time,
        duration_minutes,
        content_generated,
        posted,
        chapter_id,
        chapter:chapters(
          id,
          title
        )
      `)
      .eq('class_id', classId)
      .order('scheduled_date', { ascending: true })

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions })

  } catch (error: any) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
