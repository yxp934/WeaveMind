import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get assignment with questions
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        *,
        session:course_sessions(
          id,
          session_number,
          title,
          description,
          scheduled_date,
          class:classes(
            id,
            name,
            organization_id
          )
        )
      `)
      .eq('id', id)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Get questions
    const { data: questions } = await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', id)
      .order('question_number')

    // Get iterations
    const { data: iterations } = await supabase
      .from('assignment_iterations')
      .select('*')
      .eq('assignment_id', id)
      .order('iteration_number', { ascending: true })

    // Get generation run
    const { data: generationRun } = await supabase
      .from('assignment_generation_runs')
      .select('*')
      .eq('assignment_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      assignment,
      questions: questions || [],
      iterations: iterations || [],
      generationRun,
    })

  } catch (error: any) {
    console.error('Get assignment error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
