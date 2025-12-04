import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const runtime = 'edge'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'

export async function POST(req: Request) {
  try {
    // Parse request body
    const { componentId, courseId, message, componentData } = await req.json()

    if (!componentId || !courseId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: componentId, courseId, message' }),
        { status: 400 }
      )
    }

    // Use provided component data or fallback
    let componentContent = 'No component content available'
    let chapterTitle = 'Unknown Chapter'
    let courseTitle = 'Unknown Course'
    let className = 'Unknown Class'

    if (componentData) {
      const { type, content, chapter, course } = componentData

      // Extract chapter and course info
      if (chapter) {
        chapterTitle = chapter.title || chapterTitle
        if (course) {
          courseTitle = course.title || courseTitle
          if (course.classes) {
            className = course.classes.name || className
          }
        }
      }

      // Format component content based on type
      componentContent = formatComponentContent(type, content)
    }

    // Build enhanced system prompt with full context
    const systemPrompt = `You are a helpful AI tutor assisting a student learning from an online course.

=== COURSE INFORMATION ===
Course: ${courseTitle}
Class: ${className}

=== CHAPTER INFORMATION ===
Chapter: ${chapterTitle}

=== CURRENT COMPONENT ===
Component ID: ${componentId}
Component Content:
${componentContent}

=== YOUR ROLE ===
- Answer the student's questions based on the component content above
- Provide clear and concise explanations related to this specific component
- Guide the student to understand the chapter and course material better
- Encourage critical thinking and deeper understanding
- Be patient, supportive, and educational
- If the question is outside the scope of this component, gently guide the student back to the topic
- Reference specific parts of the component content when answering

Provide helpful responses that help the student master this component and the broader learning objectives.`

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

function formatComponentContent(type: string, content: any): string {
  if (!content) return 'No content available'

  switch (type) {
    case 'text':
      return content.text || 'No text content available'

    case 'question':
      let questionStr = `Question: ${content.question || 'No question'}\n`
      if (content.options && Array.isArray(content.options)) {
        questionStr += `Options:\n${content.options.map((opt: string, idx: number) => `  ${idx + 1}. ${opt}`).join('\n')}\n`
      }
      if (content.correctAnswer !== undefined) {
        questionStr += `Correct Answer: ${content.correctAnswer}`
      }
      return questionStr

    case 'image':
      let imageStr = `Image: ${content.url || 'No URL'}\n`
      if (content.caption) {
        imageStr += `Caption: ${content.caption}`
      }
      return imageStr

    case 'video':
      let videoStr = `Video Title: ${content.title || 'No title'}\n`
      videoStr += `Video URL: ${content.url || 'No URL'}\n`
      if (content.description) {
        videoStr += `Description: ${content.description}`
      }
      return videoStr

    case 'interactive':
      let interactiveStr = `Interactive Component: ${content.title || 'No title'}\n`
      if (content.description) {
        interactiveStr += `Description: ${content.description}\n`
      }
      if (content.instructions) {
        interactiveStr += `Instructions: ${content.instructions}`
      }
      return interactiveStr

    default:
      return JSON.stringify(content, null, 2)
  }
}
