import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '@/lib/ai/langgraph/config/openai-gateway'

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

    const body = await request.json()
    const { message, sessionId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Verify research assignment exists and user is student
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        id,
        assignment_subtype,
        class_id,
        title,
        research_assignments:research_assignments!inner(
          id,
          ai_assistance_allowed
        )
      `)
      .eq('id', id)
      .single()

    if (!assignment || assignment.assignment_subtype !== 'research') {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (!assignment.research_assignments[0]?.ai_assistance_allowed) {
      return NextResponse.json({ error: 'AI assistance not allowed' }, { status: 403 })
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

    let conversation
    if (sessionId) {
      // Get existing conversation
      const { data } = await supabase
        .from('research_ai_conversations')
        .select('*')
        .eq('id', sessionId)
        .eq('student_id', user.id)
        .eq('research_assignment_id', assignment.research_assignments[0].id)
        .single()

      if (!data) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
      conversation = data
    } else {
      // Create new conversation
      const { data: newConversation } = await supabase
        .from('research_ai_conversations')
        .insert({
          research_assignment_id: assignment.research_assignments[0].id,
          student_id: user.id,
          session_title: `Chat about ${assignment.title}`,
          messages: [],
        })
        .select()
        .single()

      if (!newConversation) {
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      conversation = newConversation
    }

    // Add user message to conversation
    const updatedMessages = [
      ...(conversation.messages as any[]),
      {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
    ]

    // Generate AI response
    const systemPrompt = `
You are an AI research assistant helping a student with their assignment.
Assignment: ${assignment.title}

Provide helpful, educational responses that guide the student to think critically and conduct their own research.
Do not provide direct answers to the assignment questions, but offer guidance and suggestions.
Keep responses concise and focused on helping the student understand the topic better.
`

    try {
      const openai = ensureGatewayClient()
      const { text } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        system: systemPrompt,
        prompt: message,
        temperature: 0.7,
      })

      // Add AI response to conversation
      updatedMessages.push({
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
      })

      // Update conversation in database
      const { data: updatedConversation, error: updateError } = await supabase
        .from('research_ai_conversations')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating conversation:', updateError)
        return NextResponse.json(
          { error: 'Failed to update conversation' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        conversation: updatedConversation,
        response: text,
      })

    } catch (aiError: any) {
      console.error('AI Generation Error:', aiError)
      return NextResponse.json(
        { error: 'Failed to generate AI response', details: aiError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('AI chat error:', error)
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

    // Get research assignment
    const { data: assignment } = await supabase
      .from('research_assignments')
      .select(`
        id,
        assignment_id,
        assignments!inner(
          class_id,
          assignment_subtype
        )
      `)
      .eq('assignment_id', id)
      .single()

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', (assignment.assignments as any).class_id)
      .eq('user_id', user.id)
      .single()

    if (!classMember || classMember.role !== 'student') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all conversations for this student and assignment
    const { data: conversations, error } = await supabase
      .from('research_ai_conversations')
      .select('*')
      .eq('research_assignment_id', assignment.id)
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ conversations })

  } catch (error: any) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
