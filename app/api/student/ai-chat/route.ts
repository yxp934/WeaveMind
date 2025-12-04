import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const runtime = 'edge'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'

export async function POST(req: Request) {
  try {
    // Parse request body
    const { componentId, courseId, message } = await req.json()

    if (!componentId || !courseId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: componentId, courseId, message' }),
        { status: 400 }
      )
    }

    // Build system prompt with component and course context
    const systemPrompt = `You are a helpful AI tutor assisting a student learning from an online course.

Component ID: ${componentId}
Course ID: ${courseId}

Your role:
- Answer the student's questions clearly and concisely
- Provide educational guidance and explanations
- Encourage critical thinking and deeper understanding
- Be patient and supportive
- Keep responses focused and educational

Provide helpful responses that guide the student to understand the content better.`

    // Initialize OpenAI client with Vercel AI Gateway
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return new Response('AI Gateway not configured', { status: 500 })
    }

    const openai = createOpenAI({
      baseURL: GATEWAY_BASE_URL,
      apiKey: gatewayKey,
    })

    // Stream the AI response
    const result = await streamText({
      model: openai.chat('meituan/longcat-flash-chat'),
      system: systemPrompt,
      prompt: message,
      temperature: 0.7,
    })

    // Return the stream as a text stream response
    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error('Student AI chat error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process chat' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
