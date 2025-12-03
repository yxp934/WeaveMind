import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'
const MODEL_NAME = 'meituan/longcat-flash-chat'

export async function GET(request: NextRequest) {
  try {
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return NextResponse.json(
        { error: 'VERCEL_GATEWAY_KEY not configured' },
        { status: 500 }
      )
    }

    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: GATEWAY_BASE_URL
    })

    // Simple test prompt
    const prompt = `Create a simple assignment with 2 questions:

1. A multiple choice question about computer science
2. A fill in the blank question

Return ONLY a JSON object like this:
{
  "questions": [
    {
      "question_number": 1,
      "question_type": "mcq",
      "question_text": "What is computer science?",
      "question_data": {"options": ["A", "B", "C", "D"]},
      "answer_data": {"correct_answer": [0]},
      "estimated_time": 5,
      "rationale": "Tests basic knowledge"
    }
  ],
  "total_estimated_time": 10,
  "coverage_notes": "Covers basic concepts"
}`

    const { text } = await generateText({
      model: openai.chat(MODEL_NAME),
      prompt,
      temperature: 0.7,
    })

    console.log('Simple Assignment Test Response:', text)

    // Try to parse
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        error: 'No JSON found in response',
        rawResponse: text
      }, { status: 500 })
    }

    const data = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      parsed: data,
      rawResponse: text
    })

  } catch (error: any) {
    console.error('Simple assignment test error:', error)
    return NextResponse.json(
      {
        error: 'Simple assignment test failed',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
