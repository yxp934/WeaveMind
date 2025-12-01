import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

// Parse schedule requirements from conversation text
function parseRequirementsFromConversation(conversationText: string): {
  totalClasses: number
  frequency: string
  startDate: string
  startTime: string
  durationMinutes: number
  courseTopic: string
  objectives: string[]
} {
  // Default values
  let totalClasses = 8
  let frequency = 'twice a week'
  let startDate = new Date().toISOString().split('T')[0]
  let startTime = '14:00'
  let durationMinutes = 90
  let courseTopic = 'Course'
  let objectives: string[] = []

  // Parse total classes
  const classMatch = conversationText.match(/(\d+)\s*(classes|sessions|节课|堂课)/i)
  if (classMatch) totalClasses = parseInt(classMatch[1])

  // Parse frequency
  if (conversationText.match(/twice\s*a?\s*week|每周两次|2次\/周/i)) {
    frequency = 'twice a week'
  } else if (conversationText.match(/once\s*a?\s*week|每周一次|1次\/周/i)) {
    frequency = 'once a week'
  } else if (conversationText.match(/three\s*times?\s*a?\s*week|每周三次|3次\/周/i)) {
    frequency = 'three times a week'
  }

  // Parse start date
  const dateMatch = conversationText.match(/(?:starting?\s*(?:from|on)?|从)\s*(\w+\s+\d+(?:st|nd|rd|th)?,?\s*\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i)
  if (dateMatch) {
    try {
      const parsedDate = new Date(dateMatch[1])
      if (!isNaN(parsedDate.getTime())) {
        startDate = parsedDate.toISOString().split('T')[0]
      }
    } catch {}
  }
  // Also try "December 1st, 2025" format
  const monthDateMatch = conversationText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d+)(?:st|nd|rd|th)?,?\s*(\d{4})/i)
  if (monthDateMatch) {
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    }
    const month = months[monthDateMatch[1].toLowerCase()]
    const day = parseInt(monthDateMatch[2])
    const year = parseInt(monthDateMatch[3])
    const date = new Date(year, month, day)
    startDate = date.toISOString().split('T')[0]
  }

  // Parse time - look for patterns like "2:00 PM", "14:00", "at 2 PM"
  // First try to match time with AM/PM
  const timeWithPeriodMatch = conversationText.match(/(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)/i)
  // Then try 24-hour format like "14:00"
  const time24Match = conversationText.match(/(?:at\s+)?(\d{1,2}):(\d{2})(?!\s*(?:AM|PM|classes|sessions|weeks))/i)

  const timeMatch = timeWithPeriodMatch || time24Match
  if (timeMatch) {
    let hour = parseInt(timeMatch[1])
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const period = timeMatch[3]?.toUpperCase()
    if (period === 'PM' && hour < 12) hour += 12
    if (period === 'AM' && hour === 12) hour = 0
    startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  // Parse duration
  const durationMatch = conversationText.match(/(\d+)\s*(minutes?|mins?|分钟)/i)
  if (durationMatch) durationMinutes = parseInt(durationMatch[1])

  // Parse course topic
  const topicMatch = conversationText.match(/(?:course|课程)(?:\s+(?:is|about|on|:))?\s*([^.!?\n]+)/i)
  if (topicMatch) courseTopic = topicMatch[1].trim()

  // Parse objectives
  const objectiveMatches = conversationText.match(/(?:objectives?|goals?|目标)[:\s]*([^.!?\n]+)/gi)
  if (objectiveMatches) {
    objectives = objectiveMatches.map(m => m.replace(/(?:objectives?|goals?|目标)[:\s]*/i, '').trim())
  }

  return { totalClasses, frequency, startDate, startTime, durationMinutes, courseTopic, objectives }
}

// Generate sessions using AI to create course-specific topics
async function generateSessions(requirements: ReturnType<typeof parseRequirementsFromConversation>) {
  try {
    // Initialize OpenAI client
    const openai = createOpenAI({
      apiKey: process.env.VERCEL_GATEWAY_KEY,
      baseURL: 'https://ai-gateway.vercel.sh/v1'
    })

    // Create a prompt to generate specific session topics
    const sessionTopicPrompt = `Generate ${requirements.totalClasses} specific, meaningful session topics for a course on "${requirements.courseTopic}".

Requirements:
- Course Topic: ${requirements.courseTopic}
- Total Sessions: ${requirements.totalClasses}
- Course Objectives: ${requirements.objectives.join('; ')}

Instructions:
- Generate exactly ${requirements.totalClasses} session topics
- Each topic should be specific and relevant to the course content
- Avoid generic titles like "Introduction" or "Core Concepts"
- Make topics progressive, building on each other
- Each topic should be 3-7 words
- Return ONLY a JSON array of strings, like this:
["Topic 1", "Topic 2", "Topic 3", ...]

Example for a Python course:
["Python Basics and Environment Setup", "Data Types and Variables", "Control Structures and Functions", "Object-Oriented Programming in Python"]

Now generate topics for "${requirements.courseTopic}":`

    // Call AI to generate session topics using generateText
    const { text } = await generateText({
      model: openai.chat('meituan/longcat-flash-chat'),
      prompt: sessionTopicPrompt,
      temperature: 0.7
    })

    let sessionTopics: string[] = []

    // Parse the AI response
    const content = text || '[]'
    try {
      // Try to parse as JSON
      sessionTopics = JSON.parse(content)

      // Validate that we got an array
      if (!Array.isArray(sessionTopics)) {
        throw new Error('Response is not an array')
      }

      // Ensure we have the right number of topics
      if (sessionTopics.length !== requirements.totalClasses) {
        console.warn(`AI returned ${sessionTopics.length} topics, expected ${requirements.totalClasses}`)
        // Pad or truncate as needed
        while (sessionTopics.length < requirements.totalClasses) {
          sessionTopics.push(`Session ${sessionTopics.length + 1}`)
        }
        sessionTopics = sessionTopics.slice(0, requirements.totalClasses)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.log('AI Response:', content)
      // Fall back to numbered sessions
      sessionTopics = Array.from({ length: requirements.totalClasses }, (_, i) =>
        `${requirements.courseTopic} - Part ${i + 1}`
      )
    }

    // Now generate the schedule with AI-generated topics
    const sessions = []
    const startDate = new Date(requirements.startDate)
    let currentDate = new Date(startDate)

    // Determine days of week based on frequency
    let daysOfWeek: number[] = []
    if (requirements.frequency === 'twice a week') {
      daysOfWeek = [1, 3] // Monday, Wednesday
    } else if (requirements.frequency === 'three times a week') {
      daysOfWeek = [1, 3, 5] // Monday, Wednesday, Friday
    } else {
      daysOfWeek = [1] // Monday only
    }

    let sessionCount = 0
    while (sessionCount < requirements.totalClasses) {
      // Find next valid day
      while (!daysOfWeek.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const [hours, minutes] = requirements.startTime.split(':').map(Number)
      const endHours = hours + Math.floor((minutes + requirements.durationMinutes) / 60)
      const endMinutes = (minutes + requirements.durationMinutes) % 60

      const topic = sessionTopics[sessionCount] || `Session ${sessionCount + 1}`

      sessions.push({
        session_number: sessionCount + 1,
        title: `Session ${sessionCount + 1}: ${topic}`,
        description: `${topic} - ${requirements.courseTopic}`,
        date: currentDate.toISOString().split('T')[0],
        start_time: requirements.startTime,
        end_time: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
        duration_minutes: requirements.durationMinutes
      })

      sessionCount++
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return sessions
  } catch (error) {
    console.error('Error generating sessions with AI:', error)

    // Fallback to basic sessions if AI fails
    const sessions = []
    const startDate = new Date(requirements.startDate)
    let currentDate = new Date(startDate)

    let daysOfWeek: number[] = []
    if (requirements.frequency === 'twice a week') {
      daysOfWeek = [1, 3]
    } else if (requirements.frequency === 'three times a week') {
      daysOfWeek = [1, 3, 5]
    } else {
      daysOfWeek = [1]
    }

    let sessionCount = 0
    while (sessionCount < requirements.totalClasses) {
      while (!daysOfWeek.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const [hours, minutes] = requirements.startTime.split(':').map(Number)
      const endHours = hours + Math.floor((minutes + requirements.durationMinutes) / 60)
      const endMinutes = (minutes + requirements.durationMinutes) % 60

      sessions.push({
        session_number: sessionCount + 1,
        title: `Session ${sessionCount + 1}: ${requirements.courseTopic} - Part ${sessionCount + 1}`,
        description: `${requirements.courseTopic} - Part ${sessionCount + 1}`,
        date: currentDate.toISOString().split('T')[0],
        start_time: requirements.startTime,
        end_time: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
        duration_minutes: requirements.durationMinutes
      })

      sessionCount++
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return sessions
  }
}

export async function POST(req: Request) {
  try {
    const { requirements, courseId } = await req.json() as {
      requirements: { courseOverview: string }
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
      .select('id, created_by, title')
      .eq('id', courseId)
      .single()

    if (courseError || !course || course.created_by !== user.id) {
      return NextResponse.json({ error: 'Course not found or access denied' }, { status: 403 })
    }

    // Parse requirements from conversation
    const parsedRequirements = parseRequirementsFromConversation(requirements.courseOverview)

    // Use course title as topic if not parsed
    if (parsedRequirements.courseTopic === 'Course') {
      parsedRequirements.courseTopic = course.title || 'Course'
    }

    // Generate sessions using AI for course-specific topics
    const sessions = await generateSessions(parsedRequirements)

    // Store schedule requirements in course_outlines
    const { error: outlineError } = await supabase
      .from('course_outlines')
      .upsert({
        course_id: courseId,
        requirements: parsedRequirements,
        schedule_requirements: parsedRequirements,
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
    const sessionsToInsert = sessions.map((session) => ({
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

