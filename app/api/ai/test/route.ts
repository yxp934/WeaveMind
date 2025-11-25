import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Use Vercel AI Gateway with Meituan LongCat model
    const result = streamText({
      model: openai('meituan/longcat-flash-chat', {
        baseURL: 'https://gateway.ai.cloudflare.com/v1/55xllKZ4hA3q7eXviwxUpL0mCVBbsfyKLhklsVHv3ALDIp9mK12A0UPh/weavemind/openai',
      }),
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for WeaveMind, an intelligent learning management system.',
        },
        {
          role: 'user',
          content: message || 'Hello, can you hear me?',
        },
      ],
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('AI Gateway test error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to connect to AI Gateway', 
        details: error.message 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

