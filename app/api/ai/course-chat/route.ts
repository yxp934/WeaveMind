import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { COURSE_REQUIREMENT_SYSTEM_PROMPT } from '@/lib/ai/prompts'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // Verify Vercel Gateway key
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return new Response('AI Gateway not configured', { status: 500 })
    }

    // Create OpenAI client with Vercel AI Gateway
    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })

    // Stream the AI response
    const result = streamText({
      model: openai.chat('meituan/longcat-flash-chat'),
      system: COURSE_REQUIREMENT_SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
    })

    // Return the stream as a text stream response
    return (await result).toTextStreamResponse()
  } catch (error: any) {
    console.error('Course chat error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process chat' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

