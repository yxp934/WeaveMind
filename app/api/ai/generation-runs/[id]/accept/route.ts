import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function mapComponentForInsert(chapterId: string, component: any, baseOrder: number, index: number) {
  const allowedTypes = ['text', 'image', 'video', 'question', 'interactive']
  const rawType = (component?.type || 'text').toString()
  const type = allowedTypes.includes(rawType) ? rawType : 'text'

  let content: any = {}

  if (type === 'text') {
    content = { text: component.text || component.body || component.content?.text || '' }
  } else if (type === 'image') {
    content = {
      url: component.url || component.src || component.content?.url || '',
      caption: component.caption || component.content?.caption || '',
    }
  } else if (type === 'video') {
    content = {
      url: component.url || component.content?.url || '',
      title: component.title || component.content?.title || '',
    }
  } else if (type === 'question') {
    content = {
      question: component.question || component.content?.question || '',
      options: Array.isArray(component.options)
        ? component.options
        : Array.isArray(component.content?.options)
        ? component.content.options
        : [],
      correctAnswer: component.correctAnswer || component.content?.correctAnswer,
    }
  } else if (type === 'interactive') {
    content = {
      title: component.title || component.content?.title || '',
      description: component.description || component.content?.description || '',
    }
  }

  return {
    chapter_id: chapterId,
    type,
    content,
    order_index: baseOrder + index + 1,
  }
}


export async function POST(_req: Request) {
  try {
		// Extract run id from URL: /api/ai/generation-runs/[id]/accept
		const url = new URL(_req.url)
		const segments = url.pathname.split('/')
		const id = segments[segments.length - 2]

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

    if (run.status !== 'completed') {
      return NextResponse.json(
        { error: 'Run is not completed yet and cannot be accepted' },
        { status: 400 }
      )
    }

    const { data: chapterResults, error: chapterError } = await supabase
      .from('ai_generation_chapter_results')
      .select('id, chapter_id, proposed_components, status')
      .eq('run_id', id)

    if (chapterError) {
      console.error('Failed to load chapter results for accept:', chapterError)
      return NextResponse.json(
        { error: 'Failed to load chapter results', details: chapterError.message },
        { status: 500 }
      )
    }

    if (!chapterResults || chapterResults.length === 0) {
      return NextResponse.json(
        { error: 'No chapter results found to accept' },
        { status: 400 }
      )
    }

    for (const result of chapterResults) {
      if (result.status !== 'completed') continue

      const proposed = Array.isArray(result.proposed_components)
        ? result.proposed_components
        : []

      if (proposed.length === 0) continue

      const { data: existing } = await supabase
        .from('components')
        .select('order_index')
        .eq('chapter_id', result.chapter_id)
        .order('order_index', { ascending: false })
        .limit(1)

      const baseOrder = existing && existing.length > 0 ? existing[0].order_index : 0

      const insertPayload = proposed.map((comp: any, index: number) =>
        mapComponentForInsert(result.chapter_id, comp, baseOrder, index)
      )

      const { error: insertError } = await supabase
        .from('components')
        .insert(insertPayload)

      if (insertError) {
        console.error('Failed to insert components from AI generation:', insertError)
        return NextResponse.json(
          { error: 'Failed to save generated components', details: insertError.message },
          { status: 500 }
        )
      }
    }

    await supabase
      .from('ai_generation_runs')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error accepting AI generation run:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to accept AI generation run' },
      { status: 500 }
    )
  }
}

