import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: Request) {
  try {
		// Extract run id from URL: /api/ai/generation-runs/[id]/discard
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

    const { error: updateError } = await supabase
      .from('ai_generation_runs')
      .update({ status: 'discarded', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to discard generation run:', updateError)
      return NextResponse.json(
        { error: 'Failed to discard generation run', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error discarding AI generation run:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to discard AI generation run' },
      { status: 500 }
    )
  }
}

