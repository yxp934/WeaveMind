import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sessions for the class
    const { data: sessions, error } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('class_id', classId)
      .order('session_number', { ascending: true })

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error: any) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get sessions' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params
    const body = await req.json()
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify class ownership
    const { data: classData } = await supabase
      .from('classes')
      .select('id, created_by')
      .eq('id', classId)
      .single()

    if (!classData || classData.created_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create a new session
    const { data: session, error } = await supabase
      .from('course_sessions')
      .insert({
        class_id: classId,
        course_id: body.course_id || null,
        session_number: body.session_number,
        title: body.title,
        description: body.description,
        scheduled_date: body.scheduled_date,
        start_time: body.start_time,
        end_time: body.end_time,
        duration_minutes: body.duration_minutes,
        content_generated: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ session })
  } catch (error: any) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    )
  }
}

