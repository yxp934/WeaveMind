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
  classTopic: string
  objectives: string[]
  sessionTopics: string[]
  daysOfWeek: string[]
} {
  // Default values
  let totalClasses = 8
  let frequency = 'twice a week'
  let startDate = new Date().toISOString().split('T')[0]
  let startTime = '14:00'
  let durationMinutes = 90
  let classTopic = 'Class'
  let objectives: string[] = []
  let sessionTopics: string[] = []
  let daysOfWeek: string[] = []

  // Parse total classes
  const classMatch = conversationText.match(/(\d+)\s*(classes|sessions|节课|堂课)/i)
  if (classMatch) totalClasses = parseInt(classMatch[1])

  // Parse frequency
  if (conversationText.match(/twice\s+a?\s*week|每周两次|周二次/i)) {
    frequency = 'twice a week'
  } else if (conversationText.match(/three\s+times?\s+a?\s*week|每周三次|周三次/i)) {
    frequency = 'three times a week'
  } else if (conversationText.match(/once\s+a?\s*week|每周一次|周一次/i)) {
    frequency = 'once a week'
  } else if (conversationText.match(/weekly/i)) {
    frequency = 'once a week'
  }

  // Parse days of week
  const dayPatterns = [
    { pattern: /monday|mon\b/i, day: 'Monday' },
    { pattern: /tuesday|tue\b/i, day: 'Tuesday' },
    { pattern: /wednesday|wed\b/i, day: 'Wednesday' },
    { pattern: /thursday|thu\b/i, day: 'Thursday' },
    { pattern: /friday|fri\b/i, day: 'Friday' },
    { pattern: /saturday|sat\b/i, day: 'Saturday' },
    { pattern: /sunday|sun\b/i, day: 'Sunday' }
  ]

  for (const { pattern, day } of dayPatterns) {
    if (pattern.test(conversationText)) {
      daysOfWeek.push(day)
    }
  }

  // Parse start date
  const dateMatch = conversationText.match(/(?:starting|from|begin)\s+(?:on\s+)?(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},?\s+\d{4})/i)
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[1])
    if (!isNaN(parsedDate.getTime())) {
      startDate = parsedDate.toISOString().split('T')[0]
    }
  }

  // Parse time - improved regex to avoid matching class/session counts
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
  const durationMatch = conversationText.match(/(\d+)\s*(hours?|hrs?|小时)/i)
  if (durationMatch) {
    durationMinutes = parseInt(durationMatch[1]) * 60
  } else {
    const minuteMatch = conversationText.match(/(\d+)\s*(minutes?|mins?|分钟)/i)
    if (minuteMatch) durationMinutes = parseInt(minuteMatch[1])
  }

  // Parse class topic - look for "for X" pattern
  const topicForMatch = conversationText.match(/(?:for|about)\s+([A-Z][^,.!?\n]+?)(?:\s+(?:development|programming|course|class))?(?:,|\.|$)/i)
  if (topicForMatch) {
    classTopic = topicForMatch[1].trim()
  } else {
    const topicMatch = conversationText.match(/(?:class|课程)(?:\s+(?:is|about|on|:))?\s*([^.!?\n]+)/i)
    if (topicMatch) classTopic = topicMatch[1].trim()
  }

  // Parse session topics - look for patterns like "Session 1: Topic" or "1) Topic" or "Topics: 1) Topic"
  // Pattern 1: "Session X: Topic" or "Session X - Topic"
  const sessionPattern1 = conversationText.matchAll(/(?:session|Session)\s*(\d+)[:\-]\s*([^,\n]+?)(?=(?:\s*(?:session|Session)\s*\d+)|(?:\s*\d+\))|$)/gi)
  for (const match of sessionPattern1) {
    const topic = match[2].trim()
    if (topic && topic.length > 0) {
      sessionTopics.push(topic)
    }
  }

  // Pattern 2: "1) Topic 2) Topic" or "1. Topic 2. Topic"
  if (sessionTopics.length === 0) {
    // Split by "Topics:" first to isolate the topics section
    const topicsMatch = conversationText.match(/topics?:\s*(.+?)(?=\n|$)/i)
    if (topicsMatch) {
      const topicsText = topicsMatch[1]
      // Match numbered items: "1) Topic 2) Topic" or "1. Topic 2. Topic"
      const sessionPattern2 = topicsText.matchAll(/(\d+)[\)\.]\s*([^0-9]+?)(?=\s*\d+[\)\.]|$)/gi)
      for (const match of sessionPattern2) {
        let topic = match[2].trim()
        // Remove trailing punctuation and whitespace
        topic = topic.replace(/[,;.\s]+$/, '').trim()
        if (topic && topic.length > 0 && !topic.match(/^(sessions?|classes?|hours?|minutes?)/i)) {
          sessionTopics.push(topic)
        }
      }
    }
  }

  // Pattern 3: Look in "Topics:" section
  if (sessionTopics.length === 0) {
    const topicsSection = conversationText.match(/(?:topics?|session topics?)[:\s]*([^\n]+)/i)
    if (topicsSection) {
      const topics = topicsSection[1].split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0)
      sessionTopics.push(...topics)
    }
  }

  // Parse objectives
  const objectiveMatches = conversationText.match(/(?:objectives?|goals?|目标)[:\s]*([^.!?\n]+)/gi)
  if (objectiveMatches) {
    objectives = objectiveMatches.map(m => m.replace(/(?:objectives?|goals?|目标)[:\s]*/i, '').trim())
  }

  return { totalClasses, frequency, startDate, startTime, durationMinutes, classTopic, objectives, sessionTopics, daysOfWeek }
}

// Generate sessions using AI to create course-specific topics
async function generateSessions(requirements: ReturnType<typeof parseRequirementsFromConversation>) {
  let sessionTopics: string[] = []

  try {
    // Initialize OpenAI client
    const openai = createOpenAI({
      apiKey: process.env.VERCEL_GATEWAY_KEY,
      baseURL: 'https://ai-gateway.vercel.sh/v1'
    })

    // Create a prompt to generate specific session topics
    const sessionTopicPrompt = `Generate ${requirements.totalClasses} specific, meaningful session topics for a class on "${requirements.classTopic}".

Requirements:
- Class Topic: ${requirements.classTopic}
- Total Sessions: ${requirements.totalClasses}
- Class Objectives: ${requirements.objectives.join('; ')}

Instructions:
- Generate exactly ${requirements.totalClasses} session topics
- Each topic should be specific and relevant to the class content
- Avoid generic titles like "Introduction" or "Core Concepts"
- Make topics progressive, building on each other
- Each topic should be 3-7 words
- Return ONLY a JSON array of strings, like this:
["Topic 1", "Topic 2", "Topic 3", ...]

Example for a Python class:
["Python Basics and Environment Setup", "Data Types and Variables", "Control Structures and Functions", "Object-Oriented Programming in Python"]

Now generate topics for "${requirements.classTopic}":`

    // Call AI to generate session topics using generateText
    const { text } = await generateText({
      model: openai.chat('meituan/longcat-flash-chat'),
      prompt: sessionTopicPrompt,
      temperature: 0.7
    })

    // Parse the AI response
    let content = text || '[]'

    try {
      // Try to extract JSON from the response (handle code blocks, extra text, etc.)
      let jsonStr = content.trim()

      // Remove code block markers if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
      }

      // Find JSON array in the response
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      // Try to parse as JSON
      sessionTopics = JSON.parse(jsonStr)

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

      console.log('Successfully generated session topics:', sessionTopics)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.log('AI Response content:', content)
      console.log('Attempted to parse:', content)
      // Fall back to basic topics
      sessionTopics = Array.from({ length: requirements.totalClasses }, (_, i) =>
        `${requirements.classTopic} - Part ${i + 1}`
      )
    }
  } catch (error) {
    console.error('Error generating topics with AI:', error)
    // Fallback to basic topics if AI fails
    sessionTopics = Array.from({ length: requirements.totalClasses }, (_, i) =>
      `${requirements.classTopic} - Part ${i + 1}`
    )
  }

  // Generate the schedule with AI-generated topics
  const sessions = []
  const startDate = new Date(requirements.startDate)
  let currentDate = new Date(startDate)

  // Determine days of week based on frequency and parsed days
  let daysOfWeek: number[] = []

  // If specific days were mentioned, use those
  if (requirements.daysOfWeek.length > 0) {
    const dayMap: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    }
    daysOfWeek = requirements.daysOfWeek.map(day => dayMap[day]).filter(d => d !== undefined)
  } else {
    // Fall back to frequency-based days
    if (requirements.frequency === 'twice a week') {
      daysOfWeek = [1, 3] // Monday, Wednesday
    } else if (requirements.frequency === 'three times a week') {
      daysOfWeek = [1, 3, 5] // Monday, Wednesday, Friday
    } else {
      daysOfWeek = [5] // Friday only for weekly
    }
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
      description: `${requirements.classTopic} - ${topic}`,
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

export async function POST(req: Request) {
  try {
    const { requirements, classId } = await req.json() as {
      requirements: { courseOverview: string }
      classId: string
    }

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    // Verify user is authenticated and owns the class
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify class ownership
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, created_by, name')
      .eq('id', classId)
      .single()

    if (classError || !classData || classData.created_by !== user.id) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 403 })
    }

    // Parse requirements from conversation
    const parsedRequirements = parseRequirementsFromConversation(requirements.courseOverview)

    // Use class name as topic if not parsed
    if (parsedRequirements.classTopic === 'Class') {
      parsedRequirements.classTopic = classData.name || 'Class'
    }

    // Generate sessions using AI for class-specific topics
    const sessions = await generateSessions(parsedRequirements)

    // Insert sessions into database
    const sessionsToInsert = sessions.map((session) => ({
      class_id: classId,
      course_id: null,
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
      .eq('class_id', classId)

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


