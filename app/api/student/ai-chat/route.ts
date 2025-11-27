import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { componentId, courseId, message } = await req.json()

    if (!componentId || !courseId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: componentId, courseId, message' },
        { status: 400 }
      )
    }

    // Verify student has access to this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, class_id, classes(id, organization_id)')
      .eq('id', courseId)
      .eq('published', true)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found or not published' }, { status: 404 })
    }

    // Verify student is a member of the class
    const { data: membership } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', course.class_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this class' }, { status: 403 })
    }

    // Get component details
    const { data: component, error: componentError } = await supabase
      .from('components')
      .select('*, chapter:chapters(id, title, description, course_id)')
      .eq('id', componentId)
      .single()

    if (componentError || !component || component.chapter.course_id !== courseId) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 })
    }

    // Get or create conversation
    let { data: conversation } = await supabase
      .from('student_ai_conversations')
      .select('id')
      .eq('student_id', user.id)
      .eq('component_id', componentId)
      .eq('course_id', courseId)
      .single()

    if (!conversation) {
      const { data: newConversation, error: createError } = await supabase
        .from('student_ai_conversations')
        .insert({
          student_id: user.id,
          component_id: componentId,
          course_id: courseId,
        })
        .select('id')
        .single()

      if (createError || !newConversation) {
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      conversation = newConversation
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('student_ai_messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    // Build context for AI
    const componentContext = buildComponentContext(component)
    const courseContext = await buildCourseContext(supabase, courseId)

    // Initialize OpenAI client with Vercel AI Gateway
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return NextResponse.json({ error: 'AI Gateway not configured' }, { status: 500 })
    }

    const openai = createOpenAI({
      baseURL: GATEWAY_BASE_URL,
      apiKey: gatewayKey,
    })

    // Build messages array
    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful AI tutor assisting a student learning from an online course.

Course Context:
${courseContext}

Current Component Context:
${componentContext}

Your role:
- Answer the student's questions clearly and concisely
- Relate your answers to the course content and learning objectives
- Encourage critical thinking and deeper understanding
- Be patient and supportive
- If the question is outside the scope of this component or course, gently guide the student back to the topic

Keep responses focused and educational.`,
    }

    const conversationMessages = [
      systemMessage,
      ...(messages || []).map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Save user message
    await supabase.from('student_ai_messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: message,
    })

    // Stream AI response
    const result = await streamText({
      model: openai.chat('meituan/longcat-flash-chat'),
      messages: conversationMessages,
      temperature: 0.7,
      async onFinish({ text }) {
        // Save assistant response after streaming completes
        await supabase.from('student_ai_messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: text,
        })
      },
    })

    // Return streaming response
    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function buildComponentContext(component: any): string {
  const chapter = component.chapter
  let context = `Chapter: ${chapter.title}\n`
  if (chapter.description) {
    context += `Chapter Description: ${chapter.description}\n`
  }
  context += `\nComponent Type: ${component.type}\n`
  context += `Component Content:\n`

  switch (component.type) {
    case 'text':
      context += component.content?.text || 'No content'
      break
    case 'question':
      context += `Question: ${component.content?.question || 'No question'}\n`
      context += `Options: ${(component.content?.options || []).join(', ')}\n`
      context += `Correct Answer: ${component.content?.correctAnswer || 'Not specified'}`
      break
    case 'image':
      context += `Image URL: ${component.content?.url || 'No URL'}\n`
      context += `Caption: ${component.content?.caption || 'No caption'}`
      break
    case 'video':
      context += `Video Title: ${component.content?.title || 'No title'}\n`
      context += `Video URL: ${component.content?.url || 'No URL'}`
      break
    case 'interactive':
      context += `Title: ${component.content?.title || 'No title'}\n`
      context += `Description: ${component.content?.description || 'No description'}`
      break
    default:
      context += JSON.stringify(component.content, null, 2)
  }

  return context
}

async function buildCourseContext(supabase: any, courseId: string): Promise<string> {
  // Get course outline
  const { data: outline } = await supabase
    .from('course_outlines')
    .select('requirements, chapters')
    .eq('course_id', courseId)
    .single()

  if (!outline) {
    return 'No course outline available.'
  }

  let context = 'Course Overview:\n'
  if (outline.requirements) {
    context += `Learning Goals: ${JSON.stringify(outline.requirements)}\n\n`
  }

  context += 'Course Structure:\n'
  if (outline.chapters && Array.isArray(outline.chapters)) {
    outline.chapters.forEach((ch: any, idx: number) => {
      context += `${idx + 1}. ${ch.title || 'Untitled Chapter'}`
      if (ch.description) {
        context += `: ${ch.description}`
      }
      context += '\n'
    })
  }

  return context
}

