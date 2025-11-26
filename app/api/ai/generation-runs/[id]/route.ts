import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request) {
  try {
		// Extract run id from URL: /api/ai/generation-runs/[id]
		const url = new URL(_req.url)
		const segments = url.pathname.split('/')
		const id = segments[segments.length - 1]

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: run, error: runError } = await supabase
      .from('ai_generation_runs')
      .select('*')
      .eq('id', id)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Generation run not found' }, { status: 404 })
    }

    const { data: chapterResults, error: chapterError } = await supabase
      .from('ai_generation_chapter_results')
      .select(`
        *,
        chapter:chapters(id, title, order_index, description)
      `)
      .eq('run_id', id)
      .order('created_at', { ascending: true })

    if (chapterError) {
      console.error('Failed to load chapter results:', chapterError)
      return NextResponse.json(
        { error: 'Failed to load chapter results', details: chapterError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, run, chapterResults: chapterResults || [] })
  } catch (error: any) {
    console.error('Error loading AI generation run detail:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load AI generation run detail' },
      { status: 500 }
    )
  }
}

