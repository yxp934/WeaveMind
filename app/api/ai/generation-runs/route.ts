import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enqueueAIGenerationJob } from '@/lib/queue/ai-generation-queue'

export async function POST(req: Request) {
  try {
    const { courseId, maxIterationsPerChapter } = await req.json()

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, created_by')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const iterations = Number.isFinite(maxIterationsPerChapter)
      ? Math.max(1, Math.min(4, Number(maxIterationsPerChapter)))
      : 2

    const { data: run, error: runError } = await supabase
      .from('ai_generation_runs')
      .insert({
        course_id: course.id,
        created_by: user.id,
        status: 'pending',
        max_iterations_per_chapter: iterations,
      })
      .select('*')
      .single()

    if (runError || !run) {
      console.error('Failed to create ai_generation_run:', runError)
      const code = (runError as any)?.code
      const message =
        code === 'PGRST205'
          ? 'AI generation tables are not set up in the database. Please run the latest Supabase migrations for Phase 4.'
          : 'Failed to create generation run'

      return NextResponse.json(
        { error: message, details: runError?.message, code },
        { status: 500 }
      )
    }

    await enqueueAIGenerationJob({ runId: run.id })

    return NextResponse.json({ success: true, run })
  } catch (error: any) {
    console.error('Error starting AI generation run:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start AI generation run' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const courseId = url.searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: runs, error: runsError } = await supabase
      .from('ai_generation_runs')
      .select('id, status, total_chapters, completed_chapters, error_message, created_at, updated_at')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (runsError) {
      console.error('Failed to load ai_generation_runs:', runsError)
      const code = (runsError as any)?.code
      const message =
        code === 'PGRST205'
          ? 'AI generation tables are not set up in the database. Please run the latest Supabase migrations for Phase 4.'
          : 'Failed to load generation runs'

      return NextResponse.json(
        { error: message, details: runsError.message, code },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, runs: runs || [] })
  } catch (error: any) {
    console.error('Error listing AI generation runs:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list AI generation runs' },
      { status: 500 }
    )
  }
}

