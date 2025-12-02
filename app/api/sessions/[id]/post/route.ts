import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await req.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the session to verify ownership
    const { data: session } = await supabase
      .from('course_sessions')
      .select('class_id')
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

    // Update the posted status
    const { data: updatedSession, error } = await supabase
      .from('course_sessions')
      .update({
        posted: body.posted,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ session: updatedSession })
  } catch (error: any) {
    console.error('Post session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to post session' },
      { status: 500 }
    )
  }
}
