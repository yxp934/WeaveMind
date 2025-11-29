import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

const SYSTEM_PROMPT = `You are an expert educational content designer helping teachers plan detailed learning content for a specific class session.

Your role is to:
1. Understand what the teacher wants to cover in this session
2. Ask clarifying questions about:
   - Specific learning objectives
   - Key concepts and topics to cover
   - Difficulty level and depth of coverage
   - Types of practice activities (multiple choice, coding exercises, etc.)
   - Any special requirements or constraints

Guidelines:
- Ask ONE or TWO questions at a time
- Be specific and provide examples when helpful
- Consider the session's position in the overall class sequence
- Ensure content is appropriate for the session duration
- Keep responses concise and focused

Use Chinese (中文) if the teacher communicates in Chinese, otherwise use English.

When you have gathered enough information to generate quality content, encourage the teacher to click the "Generate Content" button.`

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
      .select('id, created_by, name')
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

    // Get AI Gateway configuration
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return new Response('AI Gateway not configured', { status: 500 })
    }

    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })

    // Stream the response
    const result = await streamText({
      model: openai.chat('meituan/longcat-flash-chat'),
      system: SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Session content chat error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

