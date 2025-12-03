import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { submissionId, eventType, sourceInfo } = body

    if (!submissionId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['copy', 'paste'].includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Verify user owns this submission
    const { data: submission } = await supabase
      .from('writing_submissions')
      .select('student_id')
      .eq('id', submissionId)
      .single()

    if (!submission || submission.student_id !== user.id) {
      return NextResponse.json(
        { error: 'Submission not found or unauthorized' },
        { status: 403 }
      )
    }

    // Create content event
    const { data: event, error } = await supabase
      .from('content_events')
      .insert({
        submission_id: submissionId,
        event_type: eventType,
        source_info: sourceInfo || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating content event:', error)
      return NextResponse.json(
        { error: 'Failed to track event' },
        { status: 500 }
      )
    }

    // Update copy_paste_count for the submission
    const { count } = await supabase
      .from('content_events')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)

    await supabase
      .from('writing_submissions')
      .update({
        copy_paste_count: count || 0,
      })
      .eq('id', submissionId)

    return NextResponse.json({
      success: true,
      event,
      copyPasteCount: count || 0,
    })

  } catch (error: any) {
    console.error('Copy-paste tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
