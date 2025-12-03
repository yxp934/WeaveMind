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

    const { text } = await generateText({
      model: openai.chat(MODEL_NAME),
      prompt: 'Say "Hello from AI Gateway"',
      temperature: 0.7,
    })

    return NextResponse.json({
      success: true,
      response: text,
      gatewayUrl: GATEWAY_BASE_URL,
      model: MODEL_NAME
    })

  } catch (error: any) {
    console.error('Gateway test error:', error)
    return NextResponse.json(
      {
        error: 'Gateway test failed',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
