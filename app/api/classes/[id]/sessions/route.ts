import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params
    const { searchParams } = new URL(req.url)
    const includePosted = searchParams.get('include_posted') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this class
    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()

    if (!classMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('course_sessions')
      .select('*', { count: 'exact' })
      .eq('class_id', classId)
      .order('session_number', { ascending: true })

    // If student, only show posted sessions unless explicitly requested
    if (classMember.role === 'student' && !includePosted) {
      query = query.eq('posted', true)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: sessions, error, count } = await query

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({
      sessions: sessions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
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

    // Verify user is a teacher in this class
    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .eq('role', 'teacher')
      .single()

    if (!classMember) {
      return NextResponse.json({ error: 'Access denied: Not a teacher in this class' }, { status: 403 })
    }

    // Validate required fields
    const { title, description, scheduled_date, start_time, duration_minutes } = body
    if (!title || !scheduled_date) {
      return NextResponse.json(
        { error: 'Title and scheduled_date are required' },
        { status: 400 }
      )
    }

    // Get next session number if not provided
    let sessionNumber = body.session_number
    if (!sessionNumber) {
      const { data: lastSession } = await supabase
        .from('course_sessions')
        .select('session_number')
        .eq('class_id', classId)
        .order('session_number', { ascending: false })
        .limit(1)
        .single()

      sessionNumber = (lastSession?.session_number || 0) + 1
    }

    // Create a new session
    const { data: session, error } = await supabase
      .from('course_sessions')
      .insert({
        class_id: classId,
        course_id: body.course_id || null,
        session_number: sessionNumber,
        title,
        description: description || null,
        scheduled_date,
        start_time: start_time || null,
        end_time: body.end_time || null,
        duration_minutes: duration_minutes || null,
        location: body.location || null,
        created_by: user.id,
        content_generated: false,
        posted: false
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

