import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import {
  buildTeacherAgentPrompt,
  buildStudentAgentPrompt,
  extractComponentsFromTeacherResponse,
  extractFeedbackFromStudentResponse,
  type A2AContext
} from '@/lib/ai/prompts'

// Helper function to create encoder for streaming
function createEncoder() {
  return new TextEncoder()
}

export async function POST(req: Request) {
  try {
    const {
      courseId,
      classId,
      sessionId,
      sessionTitle,
      sessionDescription,
      className,
      classDescription,
      conversationContext
    } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    if (!courseId && !classId) {
      return NextResponse.json({ error: 'Either Course ID or Class ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership (either course or class)
    let entityTitle = ''
    let entityDescription = ''

    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('id, created_by, title, description')
        .eq('id', courseId)
        .single()

      if (!course || course.created_by !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      entityTitle = course.title
      entityDescription = course.description || ''
    } else if (classId) {
      const { data: classData } = await supabase
        .from('classes')
        .select('id, created_by, name, description')
        .eq('id', classId)
        .single()

      if (!classData || classData.created_by !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      entityTitle = classData.name
      entityDescription = classData.description || ''
    }

    // Get the session
    const { data: session } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get previous sessions for context (for class-based sessions)
    let previousSessionsContext = ''
    if (classId) {
      const { data: previousSessions } = await supabase
        .from('course_sessions')
        .select(`
          session_number,
          title,
          description,
          chapter_id,
          chapters!inner(
            id,
            title,
            description
          )
        `)
        .eq('class_id', classId)
        .lt('session_number', session.session_number)
        .not('chapter_id', 'is', null)
        .order('session_number', { ascending: true })

      if (previousSessions && previousSessions.length > 0) {
        // Fetch components for each previous session's chapter
        const chapterIds = previousSessions
          .map((s: any) => s.chapter_id)
          .filter(Boolean)

        let componentsData: any[] = []
        if (chapterIds.length > 0) {
          const { data: components } = await supabase
            .from('components')
            .select('chapter_id, type, content, order_index')
            .in('chapter_id', chapterIds)
            .order('chapter_id', { ascending: true })
            .order('order_index', { ascending: true })

          componentsData = components || []
        }

        // Build detailed context with content summaries
        const sessionsSummary = previousSessions.map((s: any) => {
          const sessionComponents = componentsData.filter(
            (c: any) => c.chapter_id === s.chapter_id
          )

          let contentSummary = ''
          if (sessionComponents.length > 0) {
            // Extract key topics from text components
            const textComponents = sessionComponents
              .filter((c: any) => c.type === 'text')
              .slice(0, 3) // First 3 text components for summary

            if (textComponents.length > 0) {
              const topics = textComponents.map((c: any) => {
                const text = c.content?.text || ''
                // Extract first 150 characters as summary
                return text.substring(0, 150).trim() + (text.length > 150 ? '...' : '')
              }).join(' | ')

              contentSummary = `\n  Topics covered: ${topics}`
            }

            // Count questions
            const questionCount = sessionComponents.filter(
              (c: any) => c.type === 'question'
            ).length
            if (questionCount > 0) {
              contentSummary += `\n  Practice questions: ${questionCount}`
            }
          }

          return `Session ${s.session_number}: ${s.title}${s.description ? ` - ${s.description}` : ''}${contentSummary}`
        }).join('\n\n')

        previousSessionsContext = `\n\n=== PREVIOUS SESSIONS IN THIS CLASS ===
${sessionsSummary}

IMPORTANT: Build upon the topics covered in previous sessions. Avoid repeating content. Reference previous concepts when introducing new material.`
      }
    }

    // Setup AI Gateway
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return NextResponse.json({ error: 'AI Gateway not configured' }, { status: 500 })
    }

    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })

    // Build A2A context
    const a2aContext: A2AContext = {
      className: className || entityTitle,
      classDescription: classDescription || entityDescription || '',
      sessionNumber: session.session_number,
      sessionTitle: sessionTitle,
      sessionDescription: sessionDescription || '',
      scheduledDate: session.scheduled_date,
      previousSessionsSummary: previousSessionsContext,
      conversationContext: conversationContext
    }

    // Create streaming response
    const encoder = createEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const NUM_ITERATIONS = 3
          let currentComponents: any[] = []
          let allIterations: any[] = []

          // A2A Refinement Loop
          for (let iteration = 1; iteration <= NUM_ITERATIONS; iteration++) {
            // Send iteration start event
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'iteration_start',
              iteration,
              total: NUM_ITERATIONS
            }) + '\n'))

            // TEACHER AGENT: Generate/Refine Content
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'agent_activity',
              agent: 'teacher',
              activity: iteration === 1 ? 'Generating initial content...' : 'Refining content based on feedback...',
              iteration
            }) + '\n'))

            const studentFeedback = iteration > 1 ? allIterations[iteration - 2]?.studentFeedback : undefined
            const teacherPrompt = buildTeacherAgentPrompt(a2aContext, iteration, studentFeedback?.overall_feedback)

            const teacherResult = await generateText({
              model: openai.chat('meituan/longcat-flash-chat'),
              prompt: teacherPrompt,
              temperature: 0.7,
            })

            currentComponents = extractComponentsFromTeacherResponse(teacherResult.text)

            // Send teacher content
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'teacher_content',
              iteration,
              components: currentComponents,
              rawResponse: teacherResult.text
            }) + '\n'))

            // STUDENT AGENT: Review Content
            if (iteration < NUM_ITERATIONS) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'agent_activity',
                agent: 'student',
                activity: 'Reviewing content from student perspective...',
                iteration
              }) + '\n'))

              const studentPrompt = buildStudentAgentPrompt(a2aContext, iteration)
              const contentToReview = JSON.stringify(currentComponents, null, 2)

              const studentResult = await generateText({
                model: openai.chat('meituan/longcat-flash-chat'),
                prompt: `${studentPrompt}\n\n**CONTENT TO REVIEW:**\n${contentToReview}`,
                temperature: 0.5,
              })

              const feedback = extractFeedbackFromStudentResponse(studentResult.text)

              // Send student feedback
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'student_feedback',
                iteration,
                feedback,
                rawResponse: studentResult.text
              }) + '\n'))

              allIterations.push({
                iteration,
                teacherContent: currentComponents,
                studentFeedback: feedback
              })
            } else {
              // Final iteration - no student review needed
              allIterations.push({
                iteration,
                teacherContent: currentComponents,
                studentFeedback: null
              })
            }

            // Send iteration complete event
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'iteration_complete',
              iteration
            }) + '\n'))
          }

          // Send final components
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'a2a_complete',
            finalComponents: currentComponents,
            allIterations
          }) + '\n'))

          controller.close()
        } catch (error: any) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            error: error.message
          }) + '\n'))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('Session content generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}

