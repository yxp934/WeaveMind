import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Parse schedule requirements from conversation text
function parseRequirementsFromConversation(conversationText: string): {
  totalClasses: number
  frequency: string
  startDate: string
  startTime: string
  durationMinutes: number
  classTopic: string
  objectives: string[]
} {
  // Default values
  let totalClasses = 8
  let frequency = 'twice a week'
  let startDate = new Date().toISOString().split('T')[0]
  let startTime = '14:00'
  let durationMinutes = 90
  let classTopic = 'Class'
  let objectives: string[] = []

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
  const durationMatch = conversationText.match(/(\d+)\s*(minutes?|mins?|分钟)/i)
  if (durationMatch) durationMinutes = parseInt(durationMatch[1])

  // Parse class topic
  const topicMatch = conversationText.match(/(?:class|课程)(?:\s+(?:is|about|on|:))?\s*([^.!?\n]+)/i)
  if (topicMatch) classTopic = topicMatch[1].trim()

  // Parse objectives
  const objectiveMatches = conversationText.match(/(?:objectives?|goals?|目标)[:\s]*([^.!?\n]+)/gi)
  if (objectiveMatches) {
    objectives = objectiveMatches.map(m => m.replace(/(?:objectives?|goals?|目标)[:\s]*/i, '').trim())
  }

  return { totalClasses, frequency, startDate, startTime, durationMinutes, classTopic, objectives }
}

// Generate sessions based on requirements (no AI call - deterministic)
function generateSessions(requirements: ReturnType<typeof parseRequirementsFromConversation>) {
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

  // Generate session titles based on class topic
  const sessionTitles = [
    'Introduction and Setup',
    'Core Concepts Part 1',
    'Core Concepts Part 2',
    'Practical Application 1',
    'Intermediate Topics',
    'Practical Application 2',
    'Advanced Topics',
    'Review and Assessment',
    'Project Work 1',
    'Project Work 2',
    'Final Review',
    'Course Conclusion'
  ]

  let sessionCount = 0
  while (sessionCount < requirements.totalClasses) {
    // Find next valid day
    while (!daysOfWeek.includes(currentDate.getDay())) {
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const [hours, minutes] = requirements.startTime.split(':').map(Number)
    const endHours = hours + Math.floor((minutes + requirements.durationMinutes) / 60)
    const endMinutes = (minutes + requirements.durationMinutes) % 60

    sessions.push({
      session_number: sessionCount + 1,
      title: `Session ${sessionCount + 1}: ${sessionTitles[sessionCount % sessionTitles.length]}`,
      description: `${requirements.classTopic} - ${sessionTitles[sessionCount % sessionTitles.length]}`,
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

    // Generate sessions deterministically (no AI call)
    const sessions = generateSessions(parsedRequirements)

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


