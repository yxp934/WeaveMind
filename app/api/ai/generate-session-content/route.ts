import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function POST(req: Request) {
  try {
    const {
      courseId,
      classId,
      sessionId,
      sessionTitle,
      sessionDescription,
      className,
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

    // Generate chapter content using AI
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return NextResponse.json({ error: 'AI Gateway not configured' }, { status: 500 })
    }

    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })

    // Build conversation context
    let conversationSummary = ''
    if (conversationContext) {
      conversationSummary = `\n\nTeacher's Requirements (from conversation):
${conversationContext}

Please incorporate the teacher's specific requirements into the content.`
    }

    const prompt = `Generate detailed educational content for a class session.

${courseId ? 'Course' : 'Class'}: ${entityTitle}
${courseId ? 'Course' : 'Class'} Description: ${entityDescription || 'N/A'}
Session Number: ${session.session_number}
Session Title: ${sessionTitle}
Session Description: ${sessionDescription || 'N/A'}${previousSessionsContext}${conversationSummary}

Generate a structured lesson with:
1. Learning objectives (2-3 points)
2. Main content sections with explanations
3. Key concepts and definitions
4. Practice questions (2-3 multiple choice)
5. Summary points

Output as JSON:
{
  "components": [
    { "type": "text", "content": { "text": "..." } },
    { "type": "question", "content": { "question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0 } }
  ]
}`

    const result = await generateText({
      model: openai.chat('meituan/longcat-flash-chat'),
      prompt,
      temperature: 0.7,
    })

    // Parse the generated content
    let components = []
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*"components"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        components = parsed.components || []
      }
    } catch (e) {
      // If parsing fails, create a simple text component
      components = [{ type: 'text', content: { text: result.text } }]
    }

    // Create a chapter for this session
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert({
        course_id: courseId || null,
        class_id: classId || null,
        title: sessionTitle,
        description: sessionDescription,
        order_index: session.session_number
      })
      .select()
      .single()

    if (chapterError) {
      console.error('Chapter creation error:', chapterError)
      return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
    }

    // Insert components
    if (components.length > 0) {
      const componentsToInsert = components.map((comp: any, idx: number) => ({
        chapter_id: chapter.id,
        type: comp.type || 'text',
        content: comp.content || {},
        order_index: idx
      }))

      const { error: componentsError } = await supabase.from('components').insert(componentsToInsert)

      if (componentsError) {
        console.error('Components insertion error:', componentsError)
        // Delete the chapter if components failed to insert
        await supabase.from('chapters').delete().eq('id', chapter.id)
        return NextResponse.json({ error: 'Failed to insert learning components' }, { status: 500 })
      }
    }

    // Update session to mark content as generated
    await supabase
      .from('course_sessions')
      .update({ 
        content_generated: true,
        chapter_id: chapter.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return NextResponse.json({ 
      success: true, 
      chapter_id: chapter.id,
      components_count: components.length
    })

  } catch (error: any) {
    console.error('Session content generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}

