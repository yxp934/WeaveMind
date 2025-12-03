import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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

    const body = await request.json()
    const { dueDate } = body

    // Get assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        *,
        session:course_sessions(
          class:classes(
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

    // Check permissions
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', assignment.session.class.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgMember || !['owner', 'teacher'].includes(orgMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update assignment to published
    const { error: updateError } = await supabase
      .from('assignments')
      .update({
        generation_status: 'published',
        due_date: dueDate || null,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to publish assignment' },
        { status: 500 }
      )
    }

    // Update generation run
    await supabase
      .from('assignment_generation_runs')
      .update({
        status: 'completed',
      })
      .eq('assignment_id', id)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'Assignment published successfully',
    })

  } catch (error: any) {
    console.error('Assignment publishing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
