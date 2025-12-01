/**
 * AI Prompt Templates for WeaveMind
 * Phase 3: Course Requirement Gathering & Outline Generation
 */

export interface CourseRequirements {
  goals?: string
  audience?: string
  duration?: string
  style?: string
  topics?: string[]
  additionalContext?: string
}

/**
 * System prompt for course requirement gathering conversation
 */
export const COURSE_REQUIREMENT_SYSTEM_PROMPT = `You are an expert educational consultant helping teachers create effective online courses. Your role is to gather comprehensive information about the course they want to create through a natural, conversational approach.

Your objectives:
1. Understand the course goals and learning objectives
2. Identify the target audience (age, background, prior knowledge)
3. Determine the course duration and pacing
4. Understand the preferred teaching style and approach
5. Collect the main topics and subtopics to cover

Guidelines:
- Ask one question at a time to avoid overwhelming the teacher
- Be encouraging and supportive
- Provide examples when helpful
- Summarize what you've learned periodically
- Once you have enough information, confirm the details before proceeding

Keep responses concise and focused. Use Chinese (中文) if the teacher communicates in Chinese, otherwise use English.`

/**
 * Initial greeting message for course creation
 */
export const COURSE_REQUIREMENT_INITIAL_MESSAGE = `你好！我是你的AI课程助手。我会帮助你创建一门优质的在线课程。

让我们从课程的基本信息开始。请告诉我：
1. 你想创建什么主题的课程？
2. 这门课程的主要学习目标是什么？

（你可以用中文或英文回答）`

/**
 * System prompt for outline generation
 */
export const OUTLINE_GENERATION_SYSTEM_PROMPT = `You are an expert curriculum designer. Based on the course requirements provided, generate a well-structured course outline with chapters.

Requirements for the outline:
1. Create 5-10 chapters that logically progress through the material
2. Each chapter should have a clear, descriptive title
3. Each chapter should have a brief description (2-3 sentences) explaining what will be covered
4. Ensure the chapters build upon each other progressively
5. Match the teaching style and audience level specified in the requirements

Output format: Return a JSON array of chapters with this structure:
[
  {
    "title": "Chapter title",
    "description": "Brief description of what this chapter covers"
  }
]

Use the same language (Chinese or English) as the course requirements.`

/**
 * Build context for requirement gathering conversation
 */
export function buildRequirementContext(requirements: Partial<CourseRequirements>): string {
  const parts: string[] = []
  
  if (requirements.goals) {
    parts.push(`Course Goals: ${requirements.goals}`)
  }
  
  if (requirements.audience) {
    parts.push(`Target Audience: ${requirements.audience}`)
  }
  
  if (requirements.duration) {
    parts.push(`Duration: ${requirements.duration}`)
  }
  
  if (requirements.style) {
    parts.push(`Teaching Style: ${requirements.style}`)
  }
  
  if (requirements.topics && requirements.topics.length > 0) {
    parts.push(`Topics: ${requirements.topics.join(', ')}`)
  }
  
  if (requirements.additionalContext) {
    parts.push(`Additional Context: ${requirements.additionalContext}`)
  }
  
  return parts.length > 0 
    ? `Current course information:\n${parts.join('\n')}`
    : 'No course information collected yet.'
}

/**
 * Generate outline from requirements
 */
export function buildOutlinePrompt(requirements: CourseRequirements): string {
  return `Generate a course outline based on these requirements:

Goals: ${requirements.goals || 'Not specified'}
Target Audience: ${requirements.audience || 'General learners'}
Duration: ${requirements.duration || 'Flexible'}
Teaching Style: ${requirements.style || 'Standard'}
Topics to Cover: ${requirements.topics?.join(', ') || 'Not specified'}
${requirements.additionalContext ? `\nAdditional Context: ${requirements.additionalContext}` : ''}

Please create a comprehensive course outline with chapters.`
}

/**
 * Validate if requirements are sufficient for outline generation
 */
export function areRequirementsSufficient(requirements: Partial<CourseRequirements>): boolean {
  // At minimum, we need goals and at least one topic
  return !!(requirements.goals && requirements.topics && requirements.topics.length > 0)
}

/**
 * Extract requirements from conversation history
 */
export function extractRequirementsFromConversation(messages: Array<{ role: string; content: string }>): Partial<CourseRequirements> {
  // This is a simple implementation - in production, you might use AI to extract this
  const requirements: Partial<CourseRequirements> = {}

  // Combine all user messages
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')

  const lowerMessages = userMessages.toLowerCase()

  // Extract goals
  if (lowerMessages.includes('goal') || lowerMessages.includes('目标') || lowerMessages.includes('学习')) {
    requirements.goals = userMessages
  }

  // Extract audience
  if (lowerMessages.includes('audience') || lowerMessages.includes('受众') || lowerMessages.includes('学生') || lowerMessages.includes('职场')) {
    requirements.audience = userMessages
  }

  // Extract duration
  if (lowerMessages.includes('week') || lowerMessages.includes('周') || lowerMessages.includes('hour') || lowerMessages.includes('小时')) {
    requirements.duration = userMessages
  }

  // Extract style
  if (lowerMessages.includes('style') || lowerMessages.includes('风格') || lowerMessages.includes('项目') || lowerMessages.includes('project')) {
    requirements.style = userMessages
  }

  // Extract topics - if message is long enough and contains course-related keywords
  if (userMessages.length > 50) {
    requirements.topics = [userMessages]
  }

  return requirements
}

// ============================================
// Phase 8: Schedule Generation Prompts
// ============================================

export interface ScheduleRequirements {
  courseOverview?: string
  objectives?: string
  targetAudience?: string
  frequency?: string // e.g., "twice a week", "every Monday and Thursday"
  duration?: string // e.g., "45 minutes per class"
  totalClasses?: number
  startDate?: string
  timeSlots?: string // e.g., "10:00 AM - 11:30 AM"
  additionalNotes?: string
}

/**
 * System prompt for schedule requirement gathering
 */
export const SCHEDULE_REQUIREMENT_SYSTEM_PROMPT = `You are an expert educational planner helping teachers create effective course schedules. Your role is to gather information about the course schedule through a structured conversation using MULTIPLE CHOICE QUESTIONS.

Your objectives:
1. Understand the course overview and learning objectives
2. Identify the target audience
3. Determine the schedule preferences:
   - Class frequency (how often classes occur)
   - Duration per class session
   - Total number of class sessions
   - Preferred time slots
   - Start date

CRITICAL GUIDELINES:
- ALWAYS use multiple choice questions (A, B, C, D format)
- Ask ONE question at a time
- Provide 3-4 clear options for each question
- Include an "Other (please specify)" option when appropriate
- DO NOT ask the teacher to provide session topics - you will automatically generate appropriate topics based on the course description
- Be encouraging and concise
- Summarize what you've learned periodically

REQUIRED INFORMATION (in order):
1. Course topic and learning objectives (free text)
2. Number of sessions (multiple choice: A) 4 sessions, B) 8 sessions, C) 12 sessions, D) Other)
3. Class frequency (multiple choice: A) Once a week, B) Twice a week, C) Three times a week, D) Other)
4. Days of the week (multiple choice based on frequency)
5. Start date (ask for specific date)
6. Class time (multiple choice: A) Morning (9:00 AM), B) Afternoon (2:00 PM), C) Evening (6:00 PM), D) Other)
7. Duration per session (multiple choice: A) 45 minutes, B) 90 minutes, C) 120 minutes, D) Other)

Once you have gathered all required information, confirm the details with the teacher and end your message with the special marker: [SCHEDULE_READY]

IMPORTANT: You will automatically generate appropriate session topics based on the course description. The teacher does not need to provide topics manually.`

/**
 * Initial message for schedule generation conversation
 */
export const SCHEDULE_INITIAL_MESSAGE = `你好！我将帮助你为课程创建一个详细的教学日程安排。

让我们开始收集一些信息。首先，请告诉我：

**这门课程的主题和主要学习目标是什么？**

（请简要描述课程内容和你希望学生达到的学习目标）

---
Hello! I'll help you create a detailed teaching schedule for your course.

Let's start by gathering some information. First, please tell me:

**What is the course topic and main learning objectives?**

(Please briefly describe the course content and the learning goals you want students to achieve)`

/**
 * System prompt for schedule generation
 */
export const SCHEDULE_GENERATION_SYSTEM_PROMPT = `You are an expert curriculum designer. Based on the schedule requirements provided, generate a chronological course schedule with specific dates and high-level descriptions for each class session.

Requirements for the schedule:
1. Generate exactly the number of class sessions specified
2. Follow the frequency pattern specified (e.g., twice a week)
3. Each session should have:
   - A session number
   - A specific date (starting from the provided start date)
   - Start and end time (based on duration)
   - A concise, high-level title
   - A brief vague description (1-2 sentences) of what will be covered - keep it high-level, not detailed
4. Ensure sessions logically progress through the material
5. Space sessions according to the specified frequency

IMPORTANT: Keep session descriptions VAGUE and HIGH-LEVEL. Do NOT include detailed content - that will be generated later when the teacher clicks "Generate Content" for each session.

Output format: Return a JSON array of sessions with this structure:
{
  "sessions": [
    {
      "session_number": 1,
      "date": "2024-01-15",
      "start_time": "10:00",
      "end_time": "11:30",
      "duration_minutes": 90,
      "title": "Session title",
      "description": "Brief high-level description"
    }
  ]
}

Use the same language (Chinese or English) as the schedule requirements.`

/**
 * Build schedule generation prompt
 */
export function buildSchedulePrompt(requirements: ScheduleRequirements): string {
  return `Generate a course schedule based on these requirements:

Course Overview: ${requirements.courseOverview || 'Not specified'}
Learning Objectives: ${requirements.objectives || 'Not specified'}
Target Audience: ${requirements.targetAudience || 'General learners'}
Total Classes: ${requirements.totalClasses || 10}
Frequency: ${requirements.frequency || 'Twice a week'}
Duration per Class: ${requirements.duration || '60 minutes'}
Start Date: ${requirements.startDate || 'Next Monday'}
Time Slots: ${requirements.timeSlots || '10:00 AM'}
${requirements.additionalNotes ? `\nAdditional Notes: ${requirements.additionalNotes}` : ''}

Please create a detailed schedule with specific dates for each class session. Remember to keep session descriptions HIGH-LEVEL and VAGUE.`
}

/**
 * Validate if schedule requirements are sufficient
 */
export function areScheduleRequirementsSufficient(requirements: Partial<ScheduleRequirements>): boolean {
  return !!(
    requirements.courseOverview &&
    requirements.totalClasses &&
    requirements.frequency &&
    requirements.startDate
  )
}

// ============================================
// A2A (Agent-to-Agent) Content Refinement Prompts
// ============================================

export interface A2AContext {
  className: string
  classDescription: string
  sessionNumber: number
  sessionTitle: string
  sessionDescription: string
  scheduledDate: string
  previousSessionsSummary?: string
  conversationContext?: string
}

/**
 * Teacher Agent System Prompt for A2A Content Generation
 */
export function buildTeacherAgentPrompt(context: A2AContext, iteration: number, studentFeedback?: string): string {
  const basePrompt = `You are an expert educational content creator designing learning materials for a class session.

**CLASS CONTEXT:**
- Class Name: ${context.className}
- Class Description: ${context.classDescription}

**SESSION CONTEXT:**
- Session Number: ${context.sessionNumber}
- Session Title: ${context.sessionTitle}
- Session Description: ${context.sessionDescription}
- Scheduled Date: ${new Date(context.scheduledDate).toLocaleDateString()}

${context.previousSessionsSummary ? `**PREVIOUS SESSIONS:**
${context.previousSessionsSummary}

IMPORTANT: Build upon topics covered in previous sessions. Reference previous concepts when introducing new material. Ensure appropriate difficulty progression.` : ''}

${context.conversationContext ? `**TEACHER'S REQUIREMENTS:**
${context.conversationContext}` : ''}

**YOUR TASK:**
Generate pedagogically sound learning content with:
1. Clear learning objectives (2-3 specific, measurable goals)
2. Well-structured content sections with explanations
3. Key concepts and definitions
4. Practical examples and applications
5. Practice questions (2-3 multiple choice with explanations)
6. Summary and key takeaways

**CONTENT QUALITY STANDARDS:**
- Appropriate difficulty level for the target audience
- Clear, concise explanations
- Logical flow and progression
- Engaging and relevant examples
- Questions that test understanding, not just memorization

Output as JSON:
{
  "components": [
    { "type": "text", "content": { "text": "..." } },
    { "type": "question", "content": { "question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "explanation": "..." } }
  ]
}`

  if (iteration === 1) {
    return basePrompt + '\n\nThis is your FIRST iteration. Generate initial content based on the requirements above.'
  } else if (studentFeedback) {
    return basePrompt + `

**STUDENT FEEDBACK FROM ITERATION ${iteration - 1}:**
${studentFeedback}

**YOUR TASK FOR ITERATION ${iteration}:**
Refine the content based on the student's feedback. Address all concerns raised:
- Clarify confusing concepts
- Adjust difficulty if needed
- Add missing explanations
- Improve examples
- Fix pacing issues
- Enhance engagement

Generate the IMPROVED content incorporating all feedback.`
  }

  return basePrompt
}

/**
 * Student Agent System Prompt for A2A Content Review
 */
export function buildStudentAgentPrompt(context: A2AContext, iteration: number): string {
  return `You are a thoughtful student reviewing learning content for Session ${context.sessionNumber}: "${context.sessionTitle}".

**YOUR BACKGROUND:**
You are a typical student in this class with:
- Moderate prior knowledge from previous sessions
- Genuine interest in learning but need clear explanations
- Tendency to get confused by jargon or unexplained concepts
- Appreciation for practical examples and real-world applications

**YOUR TASK:**
Review the generated content critically from a student's perspective. Evaluate:

1. **CLARITY** (1-10):
   - Are explanations clear and easy to understand?
   - Is technical jargon explained?
   - Are concepts broken down into digestible pieces?

2. **DIFFICULTY APPROPRIATENESS** (1-10):
   - Is the difficulty level appropriate for Session ${context.sessionNumber}?
   - Does it build on previous sessions appropriately?
   - Are there sudden jumps in complexity?

3. **ENGAGEMENT** (1-10):
   - Is the content interesting and engaging?
   - Are examples relevant and relatable?
   - Does it maintain attention throughout?

4. **COMPLETENESS** (1-10):
   - Are all key concepts covered?
   - Are there gaps in explanations?
   - Do practice questions test the right concepts?

5. **LOGICAL FLOW** (1-10):
   - Does content progress logically?
   - Are transitions smooth?
   - Is the pacing appropriate?

**OUTPUT FORMAT:**
Provide your review as JSON:
{
  "iteration": ${iteration},
  "scores": {
    "clarity": <1-10>,
    "difficulty": <1-10>,
    "engagement": <1-10>,
    "completeness": <1-10>,
    "logical_flow": <1-10>
  },
  "overall_score": <average of all scores>,
  "strengths": ["strength 1", "strength 2", ...],
  "concerns": [
    {
      "issue": "specific issue description",
      "severity": "high|medium|low",
      "suggestion": "specific actionable suggestion"
    }
  ],
  "confusing_concepts": ["concept 1", "concept 2", ...],
  "missing_explanations": ["what's missing 1", "what's missing 2", ...],
  "pacing_issues": "description of pacing problems if any",
  "overall_feedback": "comprehensive summary of your review"
}

Be specific, constructive, and actionable in your feedback. Focus on helping improve the content for better learning outcomes.`
}

/**
 * Extract components from teacher agent response
 */
export function extractComponentsFromTeacherResponse(response: string): any[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*"components"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.components || []
    }
  } catch (e) {
    console.error('Failed to parse teacher response:', e)
  }
  return []
}

/**
 * Extract feedback from student agent response
 */
export function extractFeedbackFromStudentResponse(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*"iteration"[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Failed to parse student response:', e)
  }
  return null
}

