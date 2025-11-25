import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { requirements, chapters } = await req.json()

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract course title from requirements or use first chapter title
    const courseTitle = requirements.goals?.split('\n')[0]?.substring(0, 100) ||
                       chapters[0]?.title ||
                       'New AI-Generated Course'

    // Create course (class_id is NULL for AI-generated draft courses)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: courseTitle,
        description: requirements.goals || 'AI-generated course',
        class_id: null,
        created_by: user.id,
        published: false,
      })
      .select()
      .single()

    if (courseError) {
      console.error('Course creation error:', courseError)
      return NextResponse.json(
        { error: 'Failed to create course', details: courseError.message },
        { status: 500 }
      )
    }

    // Save outline
    const { error: outlineError } = await supabase
      .from('course_outlines')
      .insert({
        course_id: course.id,
        requirements,
        chapters,
        created_by: user.id,
      })

    if (outlineError) {
      console.error('Outline save error:', outlineError)
      // Try to delete the course if outline save fails
      await supabase.from('courses').delete().eq('id', course.id)
      return NextResponse.json(
        { error: 'Failed to save outline', details: outlineError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
      },
    })
  } catch (error: any) {
    console.error('Create course from outline error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create course' },
      { status: 500 }
    )
  }
}

