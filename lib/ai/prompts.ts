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

