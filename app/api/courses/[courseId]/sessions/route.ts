import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sessions for the course
    const { data: sessions, error } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('course_id', courseId)
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
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const body = await req.json()
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify course ownership
    const { data: course } = await supabase
      .from('courses')
      .select('id, created_by')
      .eq('id', courseId)
      .single()

    if (!course || course.created_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create a new session
    const { data: session, error } = await supabase
      .from('course_sessions')
      .insert({
        course_id: courseId,
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

