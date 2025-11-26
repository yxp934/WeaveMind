import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId, requirements, chapters } = await request.json()

    if (!courseId || !requirements || !chapters || !Array.isArray(chapters)) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, requirements, chapters' },
        { status: 400 }
      )
    }

    // Verify the course exists and user has access
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, description, class_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if outline already exists for this course
    const { data: existingOutline } = await supabase
      .from('course_outlines')
      .select('id')
      .eq('course_id', courseId)
      .single()

    if (existingOutline) {
      // Update existing outline
      const { error: updateError } = await supabase
        .from('course_outlines')
        .update({
          requirements,
          chapters,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOutline.id)

      if (updateError) {
        console.error('Error updating outline:', updateError)
        return NextResponse.json({ error: 'Failed to update outline' }, { status: 500 })
      }
    } else {
      // Create new outline
      const { error: insertError } = await supabase
        .from('course_outlines')
        .insert({
          course_id: courseId,
          requirements,
          chapters,
          created_by: user.id,
        })

      if (insertError) {
        console.error('Error creating outline:', insertError)
        return NextResponse.json({ error: 'Failed to create outline' }, { status: 500 })
      }
    }

    // Create chapters in the database
    // First, delete existing chapters if any
    await supabase
      .from('chapters')
      .delete()
      .eq('course_id', courseId)

    // Insert new chapters
    const chaptersToInsert = chapters.map((chapter: any, index: number) => ({
      course_id: courseId,
      title: chapter.title,
      description: chapter.description || null,
      order_index: index,
    }))

    const { error: chaptersError } = await supabase
      .from('chapters')
      .insert(chaptersToInsert)

    if (chaptersError) {
      console.error('Error creating chapters:', chaptersError)
      return NextResponse.json({ error: 'Failed to create chapters' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Outline saved successfully',
    })
  } catch (error) {
    console.error('Error in save-outline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

