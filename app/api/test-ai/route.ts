import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const runtime = 'edge'

export async function GET() {
  try {
    // Verify environment variable
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY

    if (!gatewayKey) {
      return NextResponse.json(
        { error: 'VERCEL_GATEWAY_KEY not configured' },
        { status: 500 }
      )
    }

    // Create OpenAI client configured for Vercel AI Gateway
    // Using the correct Vercel AI Gateway baseURL
    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })

    // Test with meituan/longcat-flash-chat model
    const { text } = await generateText({
      model: openai.chat('meituan/longcat-flash-chat'),
      prompt: 'Say "Hello from Vercel AI Gateway!" in one sentence.',
    })

    return NextResponse.json({
      success: true,
      message: 'AI Gateway connection successful',
      model: 'meituan/longcat-flash-chat',
      response: text,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('AI Gateway test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

