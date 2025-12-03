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
    const { content, researchNotes } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Verify user is student in this class
    const { data: assignment } = await supabase
      .from('assignments')
      .select('class_id, assignment_subtype')
      .eq('id', id)
      .single()

    if (!assignment || assignment.assignment_subtype !== 'research') {
      return NextResponse.json({ error: 'Assignment not found or invalid type' }, { status: 404 })
    }

    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', assignment.class_id)
      .eq('user_id', user.id)
      .single()

    if (!classMember || classMember.role !== 'student') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Count words
    const wordCount = content.trim().split(/\s+/).length

    // Check if submission already exists
    const { data: existingSubmission } = await supabase
      .from('research_submissions')
      .select('id')
      .eq('assignment_id', id)
      .eq('student_id', user.id)
      .maybeSingle()

    let submission
    if (existingSubmission) {
      // Update existing submission
      const { data, error } = await supabase
        .from('research_submissions')
        .update({
          content,
          research_notes: researchNotes || null,
          word_count: wordCount,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating submission:', error)
        return NextResponse.json(
          { error: 'Failed to update submission' },
          { status: 500 }
        )
      }
      submission = data
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from('research_submissions')
        .insert({
          assignment_id: id,
          student_id: user.id,
          content,
          research_notes: researchNotes || null,
          word_count: wordCount,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating submission:', error)
        return NextResponse.json(
          { error: 'Failed to create submission' },
          { status: 500 }
        )
      }
      submission = data
    }

    return NextResponse.json({
      success: true,
      submission,
    })

  } catch (error: any) {
    console.error('Research submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

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

    // Get assignment details
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        *,
        class:classes(
          id,
          organization_id
        )
      `)
      .eq('id', id)
      .single()

    if (!assignment || assignment.assignment_subtype !== 'research') {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Check if user is teacher of this class
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', assignment.class.organization_id)
      .eq('user_id', user.id)
      .single()

    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', assignment.class_id)
      .eq('user_id', user.id)
      .single()

    if (orgMember && ['owner', 'teacher'].includes(orgMember.role)) {
      // Teacher: get all submissions
      const { data: submissions, error } = await supabase
        .from('research_submissions')
        .select(`
          *,
          student:profiles(id, full_name, email)
        `)
        .eq('assignment_id', id)
        .order('submitted_at', { ascending: false })

      if (error) {
        console.error('Error fetching submissions:', error)
        return NextResponse.json(
          { error: 'Failed to fetch submissions' },
          { status: 500 }
        )
      }

      return NextResponse.json({ submissions })
    } else if (classMember && classMember.role === 'student') {
      // Student: get their own submission
      const { data: submission, error } = await supabase
        .from('research_submissions')
        .select('*')
        .eq('assignment_id', id)
        .eq('student_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching submission:', error)
        return NextResponse.json(
          { error: 'Failed to fetch submission' },
          { status: 500 }
        )
      }

      return NextResponse.json({ submission })
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

  } catch (error: any) {
    console.error('Get research submissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
