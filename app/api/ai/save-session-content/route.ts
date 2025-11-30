import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const {
      courseId,
      classId,
      sessionId,
      sessionTitle,
      sessionDescription,
      components
    } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    if (!courseId && !classId) {
      return NextResponse.json({ error: 'Either Course ID or Class ID is required' }, { status: 400 })
    }

    if (!components || components.length === 0) {
      return NextResponse.json({ error: 'Components are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('id, created_by')
        .eq('id', courseId)
        .single()

      if (!course || course.created_by !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    } else if (classId) {
      const { data: classData } = await supabase
        .from('classes')
        .select('id, created_by')
        .eq('id', classId)
        .single()

      if (!classData || classData.created_by !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get the session
    const { data: session } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Create a chapter for this session
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert({
        course_id: courseId || null,
        class_id: classId || null,
        title: sessionTitle,
        description: sessionDescription,
        order_index: session.session_number
      })
      .select()
      .single()

    if (chapterError) {
      console.error('Chapter creation error:', chapterError)
      return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
    }

    // Insert components
    const componentsToInsert = components.map((comp: any, idx: number) => ({
      chapter_id: chapter.id,
      type: comp.type || 'text',
      content: comp.content || {},
      order_index: idx
    }))

    const { error: componentsError } = await supabase.from('components').insert(componentsToInsert)

    if (componentsError) {
      console.error('Components insertion error:', componentsError)
      // Delete the chapter if components failed to insert
      await supabase.from('chapters').delete().eq('id', chapter.id)
      return NextResponse.json({ error: 'Failed to insert learning components' }, { status: 500 })
    }

    // Update session to mark content as generated
    await supabase
      .from('course_sessions')
      .update({ 
        content_generated: true,
        chapter_id: chapter.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return NextResponse.json({ 
      success: true, 
      chapter_id: chapter.id,
      components_count: components.length
    })

  } catch (error: any) {
    console.error('Save session content error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save content' },
      { status: 500 }
    )
  }
}

