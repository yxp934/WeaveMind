import { createGatewayOpenAI, DEFAULT_MODEL } from '@/lib/ai/langgraph/config/openai-gateway'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const OUTLINE_EDITING_SYSTEM_PROMPT = `You are an expert course designer helping to edit course outlines based on natural language instructions.

You will receive:
1. The current course outline (chapters with lessons)
2. A natural language instruction for how to modify it

Your task:
- Understand the instruction and apply the requested changes
- Maintain the overall structure and quality of the outline
- Return the modified outline in the same JSON format

Output format:
Return ONLY a valid JSON array of chapters. Each chapter should have:
{
  "title": "Chapter title",
  "description": "Chapter description",
  "lessons": [
    {
      "title": "Lesson title",
      "description": "Lesson description",
      "duration": "Duration in minutes"
    }
  ]
}

Important:
- Preserve existing content unless the instruction specifically asks to change it
- If adding lessons, create meaningful titles and descriptions
- If the instruction is unclear, make reasonable assumptions
- Always return valid JSON`

export async function POST(req: Request) {
  try {
    const { chapters, instruction } = await req.json()

    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return NextResponse.json(
        { error: 'AI Gateway key not configured' },
        { status: 500 }
      )
    }

    const openai = createGatewayOpenAI()
const prompt = `Current outline:
${JSON.stringify(chapters, null, 2)}

Instruction: ${instruction}

Please apply the requested changes and return the updated outline as a JSON array.`

    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      system: OUTLINE_EDITING_SYSTEM_PROMPT,
      prompt,
      temperature: 0.7,
    })

    // Parse the AI response
    let updatedChapters
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        updatedChapters = JSON.parse(jsonMatch[0])
      } else {
        updatedChapters = JSON.parse(text)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', text)
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: text },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      chapters: updatedChapters,
    })
  } catch (error: any) {
    console.error('Outline editing error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to edit outline' },
      { status: 500 }
    )
  }
}

