import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '@/lib/ai/langgraph/config/openai-gateway'
import { buildAssignmentTestingPrompt } from '@/lib/ai/prompts'

// 使用统一的 Gateway 配置
const openai = createGatewayOpenAI()

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

    // Get assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*')
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

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found' },
        { status: 404 }
      )
    }

    // Update generation run status
    await supabase
      .from('assignment_generation_runs')
      .update({
        status: 'testing',
      })
      .eq('assignment_id', id)
      .order('created_at', { ascending: false })
      .limit(1)

    // Format questions for student agent
    const formattedQuestions = questions.map(q => ({
      question_number: q.question_number,
      question_type: q.question_type,
      question_text: q.question_text,
      question_data: q.question_data,
      answer_data: q.answer_data,
      estimated_time: q.estimated_time,
      rationale: q.rationale,
    }))

    // Test assignment with student agent
    const prompt = buildAssignmentTestingPrompt(formattedQuestions, 1)

    try {
      const openai = ensureGatewayClient()
      const { text } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt,
        temperature: 0.7,
      })

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid response format')
      }

      const testingResults = JSON.parse(jsonMatch[0])

      // Evaluate answers against criteria
      const evaluationResults = []
      let allCorrect = true

      for (const answer of testingResults.answers) {
        const question = questions.find(q => q.question_number === answer.question_number)
        if (!question) continue

        let isCorrect = false
        let analysis = {}
        let refinementNotes = ''

        // Evaluate based on question type
        if (question.question_type === 'mcq') {
          const correctIndices = question.answer_data.correct_answer || []
          const studentAnswer = answer.student_response

          // Check if student's answer matches correct answer
          isCorrect = correctIndices.includes(studentAnswer) ||
                      correctIndices.toString() === studentAnswer.toString()

          analysis = {
            student_answer: studentAnswer,
            correct_answer: correctIndices,
            match: isCorrect
          }
        } else if (question.question_type === 'fill_blank') {
          const correctAnswers = question.answer_data.correct_answers || []
          const studentResponse = answer.student_response

          // Simple check for fill-in-the-blank
          isCorrect = correctAnswers.every((correct: string, idx: number) => {
            const studentWord = studentResponse.toLowerCase().split(' ')[idx]
            return studentWord === correct.toLowerCase()
          })

          analysis = {
            student_response: studentResponse,
            correct_answers: correctAnswers,
            match: isCorrect
          }
        } else if (question.question_type === 'linking') {
          const correctLinks = question.answer_data.correct_links || []
          const studentResponse = answer.student_response

          // Basic validation for linking questions
          isCorrect = studentResponse.includes(correctLinks[0]?.left) &&
                      studentResponse.includes(correctLinks[0]?.right)

          analysis = {
            student_response: studentResponse,
            correct_links: correctLinks,
            match: isCorrect
          }
        } else if (question.question_type === 'code') {
          const correctSolution = question.answer_data.correct_solution || ''
          const studentCode = answer.student_response

          // Basic code validation - just check if code is present
          isCorrect = studentCode.length > 50 && studentCode.includes('def') || studentCode.includes('function')

          analysis = {
            student_code_length: studentCode.length,
            has_function: studentCode.includes('def') || studentCode.includes('function'),
            match: isCorrect
          }

          if (!isCorrect) {
            refinementNotes = 'Code solution may need improvements or additional test cases'
          }
        }

        if (!isCorrect) {
          allCorrect = false
        }

        // Save testing result
        await supabase
          .from('assignment_question_testing')
          .insert({
            assignment_question_id: question.id,
            test_attempt: 1,
            student_response: answer.student_response,
            response_analysis: analysis,
            matches_criteria: isCorrect,
            refinement_notes: refinementNotes,
          })

        evaluationResults.push({
          question_number: question.question_number,
          isCorrect,
          analysis,
          refinementNotes,
        })
      }

      // Save iteration record
      await supabase
        .from('assignment_iterations')
        .insert({
          assignment_id: id,
          iteration_number: assignment.iteration_count + 1,
          agent_type: 'student',
          iteration_type: 'test',
          input_prompt: prompt,
          output_data: testingResults,
          status: 'completed',
        })

      // Update assignment
      await supabase
        .from('assignments')
        .update({
          iteration_count: assignment.iteration_count + 1,
        })
        .eq('id', id)

      // Update generation run
      await supabase
        .from('assignment_generation_runs')
        .update({
          status: allCorrect ? 'completed' : 'reviewing',
        })
        .eq('assignment_id', id)
        .order('created_at', { ascending: false })
        .limit(1)

      return NextResponse.json({
        success: true,
        testingResults: evaluationResults,
        allCorrect,
        studentAnswers: testingResults.answers,
        iterationNumber: assignment.iteration_count + 1,
      })

    } catch (aiError: any) {
      console.error('AI Testing Error:', aiError)
      return NextResponse.json(
        { error: 'Failed to test assignment', details: aiError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Assignment testing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
