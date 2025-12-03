import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
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

    // Get assignment to verify ownership
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

    // Delete assignment (cascade will delete related records)
    const { error: deleteError } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting assignment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully',
    })

  } catch (error: any) {
    console.error('Assignment deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
