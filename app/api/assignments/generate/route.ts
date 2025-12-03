import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { buildAssignmentGenerationPrompt } from '@/lib/ai/prompts'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'
const MODEL_NAME = 'meituan/longcat-flash-chat'

function ensureGatewayClient() {
  const gatewayKey = process.env.VERCEL_GATEWAY_KEY
  if (!gatewayKey) {
    throw new Error('AI Gateway not configured (VERCEL_GATEWAY_KEY missing)')
  }
  return createOpenAI({ apiKey: gatewayKey, baseURL: GATEWAY_BASE_URL })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, targetDuration = 20, questionTypes } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Get session details with class context
    const { data: session, error: sessionError } = await supabase
      .from('course_sessions')
      .select(`
        *,
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
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if user is teacher of this class
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', session.class.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgMember || !['owner', 'teacher'].includes(orgMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get session content (from components)
    const { data: components } = await supabase
      .from('components')
      .select('type, content')
      .eq('chapter_id', session.chapter.id)
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

    // Get schedule context if available
    const { data: scheduleContext } = await supabase
      .from('schedule_generation_context')
      .select('*')
      .eq('class_id', session.class.id)
      .maybeSingle()

    // Create assignment record
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        class_id: session.class.id,
        session_id: sessionId,
        title: `Assignment for Session ${session.session_number}: ${session.title}`,
        description: `AI-generated assignment covering session content`,
        created_by: user.id,
        target_duration: targetDuration,
        ai_generated: true,
        generation_status: 'in_progress',
      })
      .select()
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      )
    }

    // Create generation run record
    const { data: generationRun, error: runError } = await supabase
      .from('assignment_generation_runs')
      .insert({
        assignment_id: assignment.id,
        session_id: sessionId,
        status: 'generating',
        target_duration: targetDuration,
        current_iteration: 1,
        total_iterations: 0,
      })
      .select()
      .single()

    if (runError || !generationRun) {
      return NextResponse.json(
        { error: 'Failed to create generation run' },
        { status: 500 }
      )
    }

    // Prepare context for AI generation
    const context = {
      className: session.class.name,
      classDescription: session.class.description || '',
      sessionNumber: session.session_number,
      sessionTitle: session.title,
      sessionDescription: session.description || '',
      sessionContent,
      scheduledDate: session.scheduled_date,
      targetDuration,
      scheduleContext,
      questionTypes,
    }

    // Generate assignment using AI
    const prompt = buildAssignmentGenerationPrompt(context, 1)

    // Log prompt for debugging
    console.log('Assignment Generation Prompt Length:', prompt.length)
    console.log('Assignment Generation Prompt Preview:', prompt.substring(0, 500))

    try {
      const openai = ensureGatewayClient()
      const { text } = await generateText({
        model: openai.chat(MODEL_NAME),
        prompt,
        temperature: 0.7,
      })

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('No JSON match in AI response:', text)
        throw new Error('Invalid response format')
      }

      const generatedData = JSON.parse(jsonMatch[0])

      // Log AI response for debugging
      console.log('AI Response:', JSON.stringify(generatedData, null, 2))

      // Validate AI response
      if (!generatedData || !generatedData.questions || !Array.isArray(generatedData.questions)) {
        throw new Error('Invalid AI response: missing questions array')
      }

      if (generatedData.questions.length === 0) {
        throw new Error('AI returned empty questions array')
      }

      // Delete any existing questions for this assignment (in case of retry)
      await supabase
        .from('assignment_questions')
        .delete()
        .eq('assignment_id', assignment.id)

      // Save questions to database
      const questionsToInsert = generatedData.questions.map((q: any) => ({
        assignment_id: assignment.id,
        session_id: sessionId,
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
        console.error('Error saving questions:', questionsError)
        return NextResponse.json(
          { error: 'Failed to save questions', details: questionsError.message },
          { status: 500 }
        )
      }

      // Save iteration record
      await supabase
        .from('assignment_iterations')
        .insert({
          assignment_id: assignment.id,
          iteration_number: 1,
          agent_type: 'teacher',
          iteration_type: 'generate',
          input_prompt: prompt,
          output_data: generatedData,
          status: 'completed',
        })

      // Update generation run
      await supabase
        .from('assignment_generation_runs')
        .update({
          status: 'reviewing',
          current_iteration: 1,
          total_iterations: 1,
        })
        .eq('id', generationRun.id)

      // Update assignment
      await supabase
        .from('assignments')
        .update({
          generation_status: 'completed',
          iteration_count: 1,
        })
        .eq('id', assignment.id)

      return NextResponse.json({
        success: true,
        assignmentId: assignment.id,
        generationRunId: generationRun.id,
        questions: generatedData.questions,
        totalEstimatedTime: generatedData.total_estimated_time,
        coverageNotes: generatedData.coverage_notes,
      })

    } catch (aiError: any) {
      console.error('AI Generation Error:', aiError)

      // Update assignment status to failed
      await supabase
        .from('assignments')
        .update({
          generation_status: 'failed',
        })
        .eq('id', assignment.id)

      await supabase
        .from('assignment_generation_runs')
        .update({
          status: 'failed',
        })
        .eq('id', generationRun.id)

      return NextResponse.json(
        { error: 'Failed to generate assignment', details: aiError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Assignment generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
