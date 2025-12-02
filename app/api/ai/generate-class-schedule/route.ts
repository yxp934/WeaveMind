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
  targetAudience: string
  goals: string
  sessionOverviews: string[]
  teachingMethod: string
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
  let targetAudience = ''
  let goals = ''
  let sessionOverviews: string[] = []
  let teachingMethod = ''

  // Parse total classes - improved patterns to catch various formats
  let classMatch = conversationText.match(/(\d+)\s*(classes|sessions|节课|堂课|次课)/i)
  if (classMatch) {
    totalClasses = parseInt(classMatch[1])
  } else {
    // Check in structured text like "Number of sessions: X" or "Total: X sessions"
    classMatch = conversationText.match(/(?:number of|total|共|总共).*?(\d+).*?(?:classes|sessions|节课|次课)/i)
    if (classMatch) {
      totalClasses = parseInt(classMatch[1])
    }
  }

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

  // Parse teaching method
  const teachingMethodPatterns = [
    { pattern: /(?:teaching method|教学方式|教学方法|teaching style|教学模式)[:\s]*([^.!?\n]+)/i, method: null },
    { pattern: /A\)\s*(lecture-based with Q&A|讲座式问答)/i, method: 'Lecture-based with Q&A' },
    { pattern: /B\)\s*(group discussions and collaborative tasks|小组讨论和协作任务)/i, method: 'Group discussions and collaborative tasks' },
    { pattern: /C\)\s*(project-based learning with hands-on activities|项目式学习与实践操作)/i, method: 'Project-based learning with hands-on activities' },
    { pattern: /D\)\s*(workshop style with practical exercises|工作坊式实践练习)/i, method: 'Workshop style with practical exercises' },
    { pattern: /E\)\s*(flipped classroom|翻转课堂)/i, method: 'Flipped classroom' },
    { pattern: /F\)\s*(mixed approach|混合式方法)/i, method: 'Mixed approach' },
    { pattern: /(lecture-based|讲座式|讲授式)/i, method: 'Lecture-based with Q&A' },
    { pattern: /(project-based|项目式)/i, method: 'Project-based learning with hands-on activities' },
    { pattern: /(group|小组|collaborative|协作)/i, method: 'Group discussions and collaborative tasks' },
    { pattern: /(workshop|工作坊|practical|实践)/i, method: 'Workshop style with practical exercises' },
    { pattern: /(flipped|翻转)/i, method: 'Flipped classroom' }
  ]

  for (const { pattern, method } of teachingMethodPatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      teachingMethod = method || match[1].trim()
      break
    }
  }

  // Parse session topics - look for patterns like "Session 1: Topic" or "1) Topic" or "Topics: 1) Topic"
  // Pattern 1: "Session X: Topic" or "Session X - Topic"
  const sessionPattern1 = conversationText.matchAll(/(?:session|Session|第\d+节)\s*(\d+)[:\-]\s*([^,\n]+?)(?=(?:\s*(?:session|Session)\s*\d+)|(?:\s*\d+\))|$)/gi)
  for (const match of sessionPattern1) {
    const topic = match[2].trim()
    if (topic && topic.length > 0 && topic.length < 100) {
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
        if (topic && topic.length > 0 && !topic.match(/^(sessions?|classes?|hours?|minutes?)/i) && topic.length < 100) {
          sessionTopics.push(topic)
        }
      }
    }
  }

  // Pattern 3: Look in "Topics:" section - IMPROVED extraction
  if (sessionTopics.length === 0) {
    // Try to find a "Topics:" section
    const topicsMatch = conversationText.match(/(?:topics?|session topics?)[:\s]*([\s\S]*?)(?=\n\n|SCHEDULE_READY|Goals:|Teaching|Method|$)/i)
    if (topicsMatch && topicsMatch[1]) {
      const topicsText = topicsMatch[1]
      // Match numbered items: "1) Topic 2) Topic" or "1. Topic 2. Topic" or "- Topic"
      const sessionPattern3 = topicsText.matchAll(/(\d+)[\)\.\-]\s*([^0-9\n\-]+?)(?=\s*\d+[\)\.\-]|\s*\-|\n\n|$)/gi)
      for (const match of sessionPattern3) {
        let topic = match[2].trim()
        // Remove trailing punctuation and clean up
        topic = topic.replace(/[,;.\s]+$/, '').trim()
        // Additional cleaning for chat artifacts
        topic = topic.replace(/For:\s*[^|]*$/i, '').trim()
        topic = topic.replace(/Goals:\s*[^|]*$/i, '').trim()
        topic = topic.replace(/Method:\s*[^|]*$/i, '').trim()

        if (topic && topic.length > 3 && topic.length < 100 && !topic.match(/^(sessions?|classes?|hours?|minutes?|goals?|teaching)/i)) {
          sessionTopics.push(topic)
        }
      }

      // If still no topics, try simple comma/line separation
      if (sessionTopics.length === 0) {
        const topics = topicsText.split(/[,;\n]/).map(t => {
          let cleaned = t.trim().replace(/^\d+[\)\.\-]\s*/, '').replace(/For:.*$/i, '').replace(/Goals:.*$/i, '').trim()
          return cleaned.length > 3 && cleaned.length < 100 ? cleaned : null
        }).filter((t): t is string => Boolean(t))
        sessionTopics.push(...topics)
      }
    }
  }

  // NEW Pattern 4: Extract from detailed session descriptions
  if (sessionTopics.length === 0) {
    // Look for patterns like "Session 1: Binary Logic Fundamentals" or "1) Binary Logic Fundamentals"
    const sessionTopicPattern = conversationText.matchAll(/(?:^|\n)(?:Session\s*\d+|\d+)\s*[:\)]\s*([^,\n|]+?)(?=\s*[-:|]|\s*For:|\s*Goals:|\n|$)/gi)
    for (const match of sessionTopicPattern) {
      let topic = match[1].trim()
      topic = topic.replace(/For:\s*[^|]*$/i, '').replace(/Goals:\s*[^|]*$/i, '').trim()
      if (topic && topic.length > 3 && topic.length < 80 && !topic.match(/^(introduction|overview|basic|part)/i)) {
        sessionTopics.push(topic)
      }
    }
  }

  // Ensure we have at least totalClasses topics (fill with placeholders if needed)
  while (sessionTopics.length < totalClasses && sessionTopics.length > 0) {
    sessionTopics.push(`${classTopic} - Additional Session ${sessionTopics.length + 1}`)
  }

  // Parse objectives
  const objectiveMatches = conversationText.match(/(?:objectives?|goals?|目标)[:\s]*([^.!?\n]+)/gi)
  if (objectiveMatches) {
    objectives = objectiveMatches.map(m => m.replace(/(?:objectives?|goals?|目标)[:\s]*/i, '').trim())
  }

  // Parse target audience - look for patterns mentioning students
  const audiencePatterns = [
    /(?:target audience|audience|学生|受众)[:\s]*([^.!?\n]+)/i,
    /(?:for|面向)\s+(?:students|learners|学生|学习者)[s]?[:\s]*([^.!?\n]+)/i,
    /(?:students|learners) (?:are|should be|will be)[:\s]*([^.!?\n]+)/i
  ]
  for (const pattern of audiencePatterns) {
    const match = conversationText.match(pattern)
    if (match && match[1]) {
      targetAudience = match[1].trim()
      break
    }
  }

  // Parse goals - comprehensive goal extraction
  const goalSection = conversationText.match(/(?:goals?|objectives?|学习目标|学习成果|学习效果)[:\s]*([\s\S]*?)(?=session|audience|target|schedule|频率|duration|date|time|teaching|method|Teaching|Method|$)/i)
  if (goalSection && goalSection[1]) {
    goals = goalSection[1].trim()
  } else {
    // Fallback: extract all goal-related content
    const goalMatches = conversationText.match(/(?:will be able to|should be able to|goal|objective|学习目标|目标)[:\s]*([^.!?\n]+)/gi)
    if (goalMatches) {
      goals = goalMatches.map(m => m.replace(/:[\s]*/, ': ')).join(' ')
    }
  }

  // Parse session overviews - IMPROVED extraction avoiding chat artifacts
  // First, try to extract from "Session X: Content" patterns
  const sessionOverviewPattern1 = conversationText.matchAll(/Session\s*\d+[:\-\s\n]+([^.!?]{20,200}?)(?=(?:Session\s*\d+|A\)|B\)|C\)|Overview:|Goals:|Teaching|$))/gi)
  for (const match of sessionOverviewPattern1) {
    let overview = match[1].trim()
    // Clean up common chat artifacts - IMPROVED cleaning
    overview = overview.replace(/^(Your|你的|Your -|你的 -)\s*/i, '')
    overview = overview.replace(/\|.*?(Goals?:|Goals|目标|GOALS).*?$/i, '')
    overview = overview.replace(/\*\*.*?\*\*/g, '') // Remove bold markdown
    overview = overview.replace(/---.*$/i, '') // Remove everything after ---
    overview = overview.replace(/For:\s*[^|]*\|/i, '') // Remove "For: ... |"
    overview = overview.replace(/Goals:\s*[^|]*\|/i, '') // Remove "Goals: ... |"
    overview = overview.replace(/Method:\s*[^|]*\|/i, '') // Remove "Method: ... |"
    overview = overview.trim()

    // Additional validation to avoid chat artifacts
    if (overview &&
        overview.length > 10 &&
        overview.length < 200 &&
        !overview.match(/^(Your|你的)/i) &&
        !overview.includes('Binary Logic Foundations')) {
      sessionOverviews.push(overview)
    }
  }

  // If still empty, try looking in summary sections - IMPROVED extraction
  if (sessionOverviews.length === 0) {
    const summaryMatch = conversationText.match(/(?:session-by-session|Session-by-Session|session details|Session Details)[:\s]*([\s\S]*?)(?=SCHEDULE_READY|Schedule|Frequency|$)/i)
    if (summaryMatch && summaryMatch[1]) {
      // Extract individual sessions from summary
      const sessionParts = summaryMatch[1].split(/(?:Session\s*\d+|第\d+节)/i)
      for (const part of sessionParts) {
        const trimmed = part.trim()
        if (trimmed.length > 15 &&
            trimmed.length < 200 &&
            !trimmed.match(/^(course|audience|goal|target|schedule|Teaching|Method)/i) &&
            !trimmed.includes('Binary Logic Foundations')) {
          let cleaned = trimmed
            .replace(/---.*$/i, '')
            .replace(/\*\*.*?\*\*/g, '')
            .replace(/For:\s*[^|]*\|/i, '')
            .replace(/Goals:\s*[^|]*\|/i, '')
            .replace(/Method:\s*[^|]*\|/i, '')
            .trim()
          if (cleaned.length > 10 && !cleaned.match(/^(Your|你的)/i)) {
            sessionOverviews.push(cleaned)
          }
        }
      }
    }
  }

  // NEW PATTERN: Try to extract from structured content with session topics
  if (sessionOverviews.length === 0) {
    // Look for patterns like "Session X - Topic: Overview content"
    const structuredPattern = conversationText.matchAll(/Session\s*\d+\s*[-:]\s*[^.\n]+[:\-\s\n]+([^.!?\n]{20,150})(?=\n|Session|\d+\)|A\)|B\)|C\)|$)/gi)
    for (const match of structuredPattern) {
      let overview = match[1].trim()
      overview = overview
        .replace(/For:\s*[^|]*\|/i, '')
        .replace(/Goals:\s*[^|]*\|/i, '')
        .replace(/Method:\s*[^|]*\|/i, '')
        .replace(/\*\*.*?\*\*/g, '')
        .trim()

      if (overview &&
          overview.length > 10 &&
          overview.length < 150 &&
          !overview.match(/^(Your|你的)/i) &&
          !overview.includes('Binary Logic Foundations')) {
        sessionOverviews.push(overview)
      }
    }
  }

  // Final fallback: if we still have no overviews, create from class topic
  if (sessionOverviews.length === 0 && totalClasses > 0) {
    for (let i = 0; i < totalClasses; i++) {
      sessionOverviews.push(`${classTopic} - Session ${i + 1}`)
    }
  }

  return {
    totalClasses,
    frequency,
    startDate,
    startTime,
    durationMinutes,
    classTopic,
    objectives,
    sessionTopics,
    daysOfWeek,
    targetAudience,
    goals,
    sessionOverviews,
    teachingMethod
  }
}

// Generate sessions using AI to create course-specific topics
async function generateSessions(requirements: ReturnType<typeof parseRequirementsFromConversation>) {
  let sessionTopics: string[] = []

  // Initialize OpenAI client
  const openai = createOpenAI({
    apiKey: process.env.VERCEL_GATEWAY_KEY,
    baseURL: 'https://ai-gateway.vercel.sh/v1'
  })

  // Log the actual number of classes for debugging
  console.log(`Generating ${requirements.totalClasses} sessions for class: ${requirements.classTopic}`)

  // Create a comprehensive prompt with all collected context
  const sessionTopicPrompt = `You MUST generate exactly ${requirements.totalClasses} specific session topics for a class on "${requirements.classTopic}".

**COMPREHENSIVE COURSE CONTEXT:**

Class Topic: ${requirements.classTopic}

Target Audience: ${requirements.targetAudience || 'Not specified'}

Learning Goals and Objectives: ${requirements.goals || requirements.objectives.join(', ') || 'Not specified'}

Teaching Methodology: ${requirements.teachingMethod || 'Not specified'}

Session Overviews: ${requirements.sessionOverviews.length > 0 ? requirements.sessionOverviews.map((o, i) => `Session ${i + 1}: ${o}`).join(' | ') : 'Not specified'}

**IMPORTANT RULES:**
- Return ONLY a JSON array of strings
- NO markdown code blocks
- NO explanations or extra text
- Each topic must be 4-6 words
- Topics must be specific to "${requirements.classTopic}" and appropriate for the target audience
- Adapt topics to the teaching methodology: ${requirements.teachingMethod || 'Standard approach'}
- NO generic terms like "Introduction", "Overview", "Basics", "Part X"
- Make topics progressive and meaningful
- Consider the learning goals when creating topics
- Align topics with the session overviews if provided

Example JSON format:
["Topic 1", "Topic 2", "Topic 3"]

Generate exactly ${requirements.totalClasses} specific topics that align with the course context above:`

  // Retry mechanism - retry up to 3 times to get valid AI response
  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts) {
    attempts++
    try {
      // Call AI to generate session topics using generateText
      const { text } = await generateText({
        model: openai.chat('meituan/longcat-flash-chat'),
        prompt: sessionTopicPrompt,
        temperature: 0.3
      })

      // Parse the AI response - no fallbacks
      let content = text.trim()

      // Remove any markdown code blocks
      content = content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')

      // Extract JSON array
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        content = jsonMatch[0]
      }

      // Parse JSON
      sessionTopics = JSON.parse(content)

      // Validate
      if (!Array.isArray(sessionTopics)) {
        throw new Error('Response is not an array')
      }

      if (sessionTopics.length !== requirements.totalClasses) {
        throw new Error(`Expected ${requirements.totalClasses} topics, got ${sessionTopics.length}`)
      }

      // Validate each topic
      for (const topic of sessionTopics) {
        if (typeof topic !== 'string' || topic.length < 3) {
          throw new Error('Invalid topic format')
        }
        const lowerTopic = topic.toLowerCase()
        if (lowerTopic.includes('introduction') ||
            lowerTopic.includes('overview') ||
            lowerTopic.includes('basic') ||
            lowerTopic.includes('part')) {
          throw new Error('Generic topic detected')
        }
      }

      console.log('Successfully generated session topics:', sessionTopics)
      break // Success, exit retry loop
    } catch (error) {
      console.error(`AI generation attempt ${attempts} failed:`, error)
      if (attempts >= maxAttempts) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to generate AI session topics after ${maxAttempts} attempts: ${errorMessage}`)
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Generate the schedule with AI-generated topics - IMPROVED date calculation
  const sessions = []
  const startDate = new Date(requirements.startDate)
  let currentDate = new Date(startDate)

  // Validate start date is not in the past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (currentDate < today) {
    currentDate = new Date(today)
    currentDate.setDate(currentDate.getDate() + 1) // Start tomorrow
  }

  // Determine days of week based on frequency and parsed days - IMPROVED logic
  let daysOfWeek: number[] = []

  // If specific days were mentioned, use those
  if (requirements.daysOfWeek.length > 0) {
    const dayMap: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    }
    daysOfWeek = requirements.daysOfWeek.map(day => dayMap[day]).filter(d => d !== undefined)
  } else {
    // Fall back to frequency-based days - IMPROVED distribution
    if (requirements.frequency === 'twice a week') {
      // Use Tuesday and Thursday for better spacing
      daysOfWeek = [2, 4] // Tuesday, Thursday
    } else if (requirements.frequency === 'three times a week') {
      // Use Monday, Wednesday, Friday
      daysOfWeek = [1, 3, 5] // Monday, Wednesday, Friday
    } else {
      // For weekly, use the day closest to the start date
      daysOfWeek = [currentDate.getDay() || 5] // Default to Friday if Sunday
    }
  }

  let sessionCount = 0
  let safetyCounter = 0 // Prevent infinite loop

  while (sessionCount < requirements.totalClasses && safetyCounter < 365) {
    safetyCounter++

    // Find next valid day - IMPROVED algorithm
    while (!daysOfWeek.includes(currentDate.getDay())) {
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const [hours, minutes] = requirements.startTime.split(':').map(Number)
    const endHours = hours + Math.floor((minutes + requirements.durationMinutes) / 60)
    const endMinutes = (minutes + requirements.durationMinutes) % 60

    const topic = sessionTopics[sessionCount]
    if (!topic) {
      throw new Error(`Missing topic for session ${sessionCount + 1}`)
    }

    // Build comprehensive session description with all context - CLEAN VERSION
    const sessionOverview = requirements.sessionOverviews[sessionCount] || ''
    const teachingMethod = requirements.teachingMethod ? `Method: ${requirements.teachingMethod}` : ''

    const descriptionParts = [
      `${requirements.classTopic} - ${topic}`,
      requirements.targetAudience ? `For: ${requirements.targetAudience}` : '',
      requirements.goals ? `Goals: ${requirements.goals.substring(0, 80)}${requirements.goals.length > 80 ? '...' : ''}` : '',
      teachingMethod,
      sessionOverview ? `Overview: ${sessionOverview.substring(0, 100)}${sessionOverview.length > 100 ? '...' : ''}` : ''
    ].filter(Boolean)

    sessions.push({
      session_number: sessionCount + 1,
      title: `Session ${sessionCount + 1}: ${topic}`,
      description: descriptionParts.join(' | '),
      date: currentDate.toISOString().split('T')[0],
      start_time: requirements.startTime,
      end_time: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
      duration_minutes: requirements.durationMinutes
    })

    sessionCount++

    // Move to next valid day based on frequency - IMPROVED logic
    if (requirements.daysOfWeek.length > 0) {
      // For custom schedules, find next occurrence of specified days
      let nextDate = new Date(currentDate)
      nextDate.setDate(nextDate.getDate() + 1)

      // Find next day in the custom days list
      let daysToAdd = 1
      while (!daysOfWeek.includes(nextDate.getDay()) && daysToAdd < 14) {
        nextDate.setDate(nextDate.getDate() + 1)
        daysToAdd++
      }
      currentDate = nextDate
    } else {
      // For standard frequencies, use fixed intervals
      if (requirements.frequency === 'twice a week') {
        currentDate.setDate(currentDate.getDate() + 3) // 3 days later (Tue->Fri or Thu->Mon)
      } else if (requirements.frequency === 'three times a week') {
        currentDate.setDate(currentDate.getDate() + 2) // 2 days later (Mon->Wed, Wed->Fri, Fri->Mon)
      } else {
        currentDate.setDate(currentDate.getDate() + 7) // 1 week later for weekly
      }
    }
  }

  // Validate we generated all sessions
  if (sessionCount < requirements.totalClasses) {
    throw new Error(`Failed to generate all ${requirements.totalClasses} sessions. Only generated ${sessionCount}.`)
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


