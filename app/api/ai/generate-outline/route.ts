import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { OUTLINE_GENERATION_SYSTEM_PROMPT, buildOutlinePrompt, type CourseRequirements } from '@/lib/ai/prompts'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { requirements } = await req.json() as { requirements: CourseRequirements }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

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

    // Generate outline using AI
    const { text } = await generateText({
      model: openai.chat('meituan/longcat-flash-chat'),
      system: OUTLINE_GENERATION_SYSTEM_PROMPT,
      prompt: buildOutlinePrompt(requirements),
      temperature: 0.7,
    })

    // Parse the JSON response
    let chapters
    try {
      chapters = JSON.parse(text)
    } catch (parseError) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        chapters = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse outline from AI response')
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        chapters,
        requirements 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('Outline generation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to generate outline' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

