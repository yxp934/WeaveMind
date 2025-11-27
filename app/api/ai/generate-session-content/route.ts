import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function POST(req: Request) {
  try {
    const { courseId, sessionId, sessionTitle, sessionDescription } = await req.json()

    if (!courseId || !sessionId) {
      return NextResponse.json({ error: 'Course ID and Session ID are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify course ownership
    const { data: course } = await supabase
      .from('courses')
      .select('id, created_by, title, description')
      .eq('id', courseId)
      .single()

    if (!course || course.created_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the session
    const { data: session } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Generate chapter content using AI
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return NextResponse.json({ error: 'AI Gateway not configured' }, { status: 500 })
    }

    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })

    const prompt = `Generate detailed educational content for a class session.

Course: ${course.title}
Course Description: ${course.description || 'N/A'}
Session Title: ${sessionTitle}
Session Description: ${sessionDescription || 'N/A'}

Generate a structured lesson with:
1. Learning objectives (2-3 points)
2. Main content sections with explanations
3. Key concepts and definitions
4. Practice questions (2-3 multiple choice)
5. Summary points

Output as JSON:
{
  "components": [
    { "type": "text", "content": { "text": "..." } },
    { "type": "question", "content": { "question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0 } }
  ]
}`

    const result = await generateText({
      model: openai.chat('meituan/longcat-flash-chat'),
      prompt,
      temperature: 0.7,
    })

    // Parse the generated content
    let components = []
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*"components"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        components = parsed.components || []
      }
    } catch (e) {
      // If parsing fails, create a simple text component
      components = [{ type: 'text', content: { text: result.text } }]
    }

    // Create a chapter for this session
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert({
        course_id: courseId,
        title: sessionTitle,
        description: sessionDescription,
        order_index: session.session_number
      })
      .select()
      .single()

    if (chapterError) {
      console.error('Chapter creation error:', chapterError)
      return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
    }

    // Insert components
    if (components.length > 0) {
      const componentsToInsert = components.map((comp: any, idx: number) => ({
        chapter_id: chapter.id,
        type: comp.type || 'text',
        content: comp.content || {},
        order_index: idx
      }))

      await supabase.from('components').insert(componentsToInsert)
    }

    // Update session to mark content as generated
    await supabase
      .from('course_sessions')
      .update({ 
        content_generated: true,
        chapter_id: chapter.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return NextResponse.json({ 
      success: true, 
      chapter_id: chapter.id,
      components_count: components.length
    })

  } catch (error: any) {
    console.error('Session content generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}

