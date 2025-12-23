import { createGatewayOpenAI, DEFAULT_MODEL } from '@/lib/ai/langgraph/config/openai-gateway'
import { streamText } from 'ai'
import { COURSE_REQUIREMENT_SYSTEM_PROMPT } from '@/lib/ai/prompts'

export const runtime = 'edge'

// 使用统一的 Gateway 配置
const openai = createGatewayOpenAI()

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // Stream the AI response - 使用统一的默认模型
    const result = streamText({
      model: openai.chat(DEFAULT_MODEL),
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

