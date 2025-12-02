import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

const SYSTEM_PROMPT = `You are an expert educational content designer helping teachers plan detailed learning content for a specific class session.

**IMPORTANT WORKFLOW:**
You are in the OUTLINE PLANNING phase. Your goal is to:
1. Present the session outline based on the schedule context provided
2. Discuss any modifications the teacher wants to make
3. Get explicit confirmation before content generation

**YOUR TASKS:**

STEP 1 - Present the Outline:
When starting a new session, present a structured outline based on the schedule context including:
- Session Topic and Learning Objectives (from schedule context)
- Target Audience consideration
- Teaching Method alignment
- Proposed content sections (3-5 sections with titles and brief descriptions)
- Suggested practice activities

STEP 2 - Discuss Modifications:
Ask the teacher if they want to:
- Add or remove sections
- Adjust difficulty level
- Add specific examples or exercises
- Modify the teaching approach for this session

STEP 3 - Confirmation:
When the teacher is satisfied with the outline:
- Summarize the final outline
- Ask for explicit confirmation: "Please confirm this outline to proceed with content generation"
- Only when confirmed, end your message with: [OUTLINE_CONFIRMED]

Guidelines:
- Ask ONE or TWO questions at a time
- Be specific and provide examples when helpful
- Consider the session's position in the overall class sequence
- Ensure content is appropriate for the session duration and teaching method
- Keep responses concise and focused

Use Chinese (中文) if the teacher communicates in Chinese, otherwise use English.`

export async function POST(req: Request) {
  try {
    const { messages, sessionId, classId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages are required', { status: 400 })
    }

    if (!sessionId || !classId) {
      return new Response('Session ID and Class ID are required', { status: 400 })
    }

    // Verify authentication and authorization
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Verify class ownership
    const { data: classData } = await supabase
      .from('classes')
      .select('id, created_by, name, description')
      .eq('id', classId)
      .single()

    if (!classData || classData.created_by !== user.id) {
      return new Response('Access denied', { status: 403 })
    }

    // Get session info
    const { data: session } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return new Response('Session not found', { status: 404 })
    }

    // Get schedule generation context
    const { data: scheduleContext } = await supabase
      .from('schedule_generation_context')
      .select('*')
      .eq('class_id', classId)
      .single()

    // Build comprehensive context
    let contextInfo = `\n\n=== SCHEDULE GENERATION CONTEXT ===`

    if (scheduleContext) {
      contextInfo += `
Class Topic: ${scheduleContext.class_topic || classData.name}
Target Audience: ${scheduleContext.target_audience || 'Not specified'}
Learning Goals: ${scheduleContext.learning_goals || 'Not specified'}
Teaching Method: ${scheduleContext.teaching_method || 'Standard approach'}
Total Sessions: ${scheduleContext.total_sessions || 'Not specified'}
Frequency: ${scheduleContext.frequency || 'Not specified'}`

      // Get session-specific details
      const sessionDetails = scheduleContext.session_details as any[]
      if (sessionDetails && sessionDetails.length > 0) {
        const currentSessionDetail = sessionDetails.find(
          (s: any) => s.session_number === session.session_number
        )
        if (currentSessionDetail) {
          contextInfo += `

=== THIS SESSION DETAILS ===
Session Number: ${currentSessionDetail.session_number}
Session Title: ${currentSessionDetail.title}
Session Topic: ${currentSessionDetail.topic || 'To be defined'}
Session Overview: ${currentSessionDetail.overview || 'To be defined'}`
        }
      }
    } else {
      contextInfo += `
Class: ${classData.name}
Class Description: ${classData.description || 'Not specified'}
Note: No schedule context found. Please gather information from the teacher.`
    }

    // Add current session info
    contextInfo += `

=== CURRENT SESSION INFO ===
Session Number: ${session.session_number}
Session Title: ${session.title}
Session Description: ${session.description || 'N/A'}
Scheduled Date: ${session.scheduled_date}
Duration: ${session.duration_minutes || 60} minutes`

    // Get previous sessions for context
    const { data: previousSessions } = await supabase
      .from('course_sessions')
      .select('session_number, title, description, chapter_id')
      .eq('class_id', classId)
      .lt('session_number', session.session_number)
      .order('session_number', { ascending: true })

    if (previousSessions && previousSessions.length > 0) {
      const prevSessionsList = previousSessions
        .map((s: any) => {
          const hasContent = s.chapter_id ? ' ✓' : ''
          return `  - Session ${s.session_number}: ${s.title}${hasContent}`
        })
        .join('\n')

      contextInfo += `

=== PREVIOUS SESSIONS ===
${prevSessionsList}

NOTE: This session should build upon previous sessions and avoid repeating content.`
    }

    // Get AI Gateway configuration
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return new Response('AI Gateway not configured', { status: 500 })
    }

    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })

    // Enhanced system prompt with context
    const enhancedSystemPrompt = SYSTEM_PROMPT + contextInfo

    // Stream the response
    const result = await streamText({
      model: openai.chat('meituan/longcat-flash-chat'),
      system: enhancedSystemPrompt,
      messages,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Session content chat error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
