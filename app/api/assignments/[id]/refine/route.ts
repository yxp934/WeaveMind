import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { buildAssignmentGenerationPrompt } from '@/lib/ai/prompts'

const openai = createOpenAI({
  apiKey: process.env.VERCEL_GATEWAY_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
})

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
    const { feedback } = body

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      )
    }

    // Get assignment details
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
            description,
            organization_id
          ),
          chapter:chapters(
            id,
            title
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

    // Get current questions
    const { data: questions } = await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', id)
      .order('question_number')

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found for this assignment' },
        { status: 404 }
      )
    }

    // Get schedule context
    const { data: scheduleContext } = await supabase
      .from('schedule_generation_context')
      .select('*')
      .eq('class_id', assignment.session.class.id)
      .maybeSingle()

    // Get session content
    const { data: components } = await supabase
      .from('components')
      .select('type, content')
      .eq('chapter_id', assignment.session.chapter.id)
      .order('order_index')

    const sessionContent = components
      ?.map(comp => {
        if (comp.type === 'text') {
          return comp.content.text || ''
        } else if (comp.type === 'question') {
          return `Question: ${comp.content.question || ''}`
        } else if (comp.type === 'interactive') {
          return `Interactive: ${comp.content.content || ''}`
        }
        return ''
      })
      .filter(Boolean)
      .join('\n\n') || 'No content available'

    // Prepare context
    const context = {
      className: assignment.session.class.name,
      classDescription: assignment.session.class.description || '',
      sessionNumber: assignment.session.session_number,
      sessionTitle: assignment.session.title,
      sessionDescription: assignment.session.description || '',
      sessionContent,
      scheduledDate: assignment.session.scheduled_date,
      targetDuration: assignment.target_duration,
      scheduleContext,
    }

    // Generate refined assignment
    const prompt = buildAssignmentGenerationPrompt(
      context,
      assignment.iteration_count + 1,
      feedback
    )

    try {
      const { text } = await generateText({
        model: openai('gpt-4-turbo'),
        prompt,
        temperature: 0.7,
      })

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid response format')
      }

      const refinedData = JSON.parse(jsonMatch[0])

      // Delete old questions
      await supabase
        .from('assignment_questions')
        .delete()
        .eq('assignment_id', id)

      // Insert new questions
      const questionsToInsert = refinedData.questions.map((q: any) => ({
        assignment_id: id,
        session_id: assignment.session_id,
        question_number: q.question_number,
        question_type: q.question_type,
        question_text: q.question_text,
        question_data: q.question_data,
        answer_data: q.answer_data,
        estimated_time: q.estimated_time,
        rationale: q.rationale,
      }))

      const { error: questionsError } = await supabase
        .from('assignment_questions')
        .insert(questionsToInsert)

      if (questionsError) {
        return NextResponse.json(
          { error: 'Failed to save refined questions' },
          { status: 500 }
        )
      }

      // Save iteration record
      await supabase
        .from('assignment_iterations')
        .insert({
          assignment_id: id,
          iteration_number: assignment.iteration_count + 1,
          agent_type: 'teacher',
          iteration_type: 'refine',
          input_prompt: prompt,
          output_data: refinedData,
          feedback: feedback,
          status: 'completed',
        })

      // Update assignment
      await supabase
        .from('assignments')
        .update({
          iteration_count: assignment.iteration_count + 1,
          generation_status: 'completed',
        })
        .eq('id', id)

      // Update generation run
      await supabase
        .from('assignment_generation_runs')
        .update({
          current_iteration: assignment.iteration_count + 1,
          total_iterations: assignment.iteration_count + 1,
          teacher_feedback: feedback,
        })
        .eq('assignment_id', id)
        .order('created_at', { ascending: false })
        .limit(1)

      return NextResponse.json({
        success: true,
        questions: refinedData.questions,
        totalEstimatedTime: refinedData.total_estimated_time,
        coverageNotes: refinedData.coverage_notes,
        iterationNumber: assignment.iteration_count + 1,
      })

    } catch (aiError: any) {
      console.error('AI Refinement Error:', aiError)
      return NextResponse.json(
        { error: 'Failed to refine assignment', details: aiError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Assignment refinement error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
