import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      classId,
      title,
      description,
      instructions,
      dueDate,
      maxScore,
      gradingCriteria,
      wordLimit,
      formatRequirements,
      plagiarismCheck = true
    } = body

    if (!classId || !title || !instructions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user is teacher of this class
    const { data: classData } = await supabase
      .from('classes')
      .select('organization_id')
      .eq('id', classId)
      .single()

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', classData.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgMember || !['owner', 'teacher'].includes(orgMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        class_id: classId,
        title,
        description: description || '',
        instructions,
        due_date: dueDate || null,
        max_score: maxScore || 100,
        grading_criteria: gradingCriteria || null,
        created_by: user.id,
        assignment_subtype: 'writing',
      })
      .select()
      .single()

    if (assignmentError || !assignment) {
      console.error('Error creating assignment:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      )
    }

    // Create writing assignment details
    const { data: writingAssignment, error: writingError } = await supabase
      .from('writing_assignments')
      .insert({
        assignment_id: assignment.id,
        word_limit: wordLimit || null,
        format_requirements: formatRequirements || null,
        plagiarism_check: plagiarismCheck,
      })
      .select()
      .single()

    if (writingError) {
      console.error('Error creating writing assignment:', writingError)
      return NextResponse.json(
        { error: 'Failed to create writing assignment details' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assignment,
      writingAssignment,
    })

  } catch (error: any) {
    console.error('Writing assignment creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
