import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  SCHEDULE_GENERATION_SYSTEM_PROMPT, 
  buildSchedulePrompt, 
  ScheduleRequirements 
} from '@/lib/ai/prompts'

export async function POST(req: Request) {
  try {
    const { requirements, courseId } = await req.json() as { 
      requirements: ScheduleRequirements
      courseId: string 
    }

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Verify user is authenticated and owns the course
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, created_by')
      .eq('id', courseId)
      .single()

    if (courseError || !course || course.created_by !== user.id) {
      return NextResponse.json({ error: 'Course not found or access denied' }, { status: 403 })
    }

    // Verify Vercel Gateway key
    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
    if (!gatewayKey) {
      return NextResponse.json({ error: 'AI Gateway not configured' }, { status: 500 })
    }

    // Create OpenAI client with Vercel AI Gateway
    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })

    // Generate schedule
    const prompt = buildSchedulePrompt(requirements)
    const result = await generateText({
      model: openai.chat('meituan/longcat-flash-chat'),
      system: SCHEDULE_GENERATION_SYSTEM_PROMPT,
      prompt,
      temperature: 0.5,
    })

    // Parse the generated schedule
    const responseText = result.text
    const jsonMatch = responseText.match(/\{[\s\S]*"sessions"[\s\S]*\}/)
    
    if (!jsonMatch) {
      console.error('Failed to parse schedule response:', responseText)
      return NextResponse.json({ error: 'Failed to parse generated schedule' }, { status: 500 })
    }

    const scheduleData = JSON.parse(jsonMatch[0])
    const sessions = scheduleData.sessions

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ error: 'Invalid schedule format' }, { status: 500 })
    }

    // Store schedule requirements in course_outlines
    const { error: outlineError } = await supabase
      .from('course_outlines')
      .upsert({
        course_id: courseId,
        requirements: requirements,
        schedule_requirements: requirements,
        schedule_generated: true,
        chapters: [],
        created_by: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'course_id'
      })

    if (outlineError) {
      console.error('Failed to save schedule requirements:', outlineError)
    }

    // Insert sessions into database
    const sessionsToInsert = sessions.map((session: any) => ({
      course_id: courseId,
      session_number: session.session_number,
      title: session.title,
      description: session.description,
      scheduled_date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: session.duration_minutes,
      content_generated: false
    }))

    // Delete existing sessions first
    await supabase
      .from('course_sessions')
      .delete()
      .eq('course_id', courseId)

    // Insert new sessions
    const { error: insertError } = await supabase
      .from('course_sessions')
      .insert(sessionsToInsert)

    if (insertError) {
      console.error('Failed to insert sessions:', insertError)
      return NextResponse.json({ error: 'Failed to save sessions' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      sessions: sessions,
      message: 'Schedule generated and saved successfully'
    })

  } catch (error: any) {
    console.error('Schedule generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate schedule' },
      { status: 500 }
    )
  }
}

