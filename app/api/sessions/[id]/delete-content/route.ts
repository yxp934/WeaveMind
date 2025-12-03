import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the session to verify ownership and get chapter_id
    const { data: session } = await supabase
      .from('course_sessions')
      .select('class_id, chapter_id')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify class ownership
    const { data: classData } = await supabase
      .from('classes')
      .select('created_by')
      .eq('id', session.class_id)
      .single()

    if (!classData || classData.created_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the chapter and its components if chapter exists
    // Use service role client to bypass RLS for deletion
    if (session.chapter_id) {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Components will be deleted automatically via CASCADE
      const { error: deleteChapterError } = await serviceSupabase
        .from('chapters')
        .delete()
        .eq('id', session.chapter_id)

      if (deleteChapterError) {
        console.error('Error deleting chapter:', deleteChapterError)
        return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 })
      }
    }

    // Update the session to reset content status
    const { data: updatedSession, error } = await supabase
      .from('course_sessions')
      .update({
        chapter_id: null,
        content_generated: false,
        posted: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      session: updatedSession,
      message: 'Session content deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete session content error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete session content' },
      { status: 500 }
    )
  }
}

