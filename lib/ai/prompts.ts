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
export const SCHEDULE_REQUIREMENT_SYSTEM_PROMPT = `You are an expert educational planner helping teachers create effective course schedules. Your role is to gather comprehensive information about the course through a flexible, conversational approach.

Your objectives:
1. Understand the course overview and learning objectives
2. Identify the target audience (age, background, prior knowledge, skill level)
3. Determine the specific goals and outcomes for the course
4. Understand the preferred teaching methodology
5. Collect detailed content for each session through interactive discussion
6. Determine the schedule preferences:
   - Class frequency (how often classes occur)
   - Duration per class session
   - Total number of class sessions
   - Preferred time slots
   - Start date

CRITICAL GUIDELINES:
- Ask ONE question at a time to avoid overwhelming the teacher
- Mix multiple choice and open-ended questions as appropriate
- Use interactive buttons when appropriate to improve user experience
- Be encouraging and conversational
- Summarize what you've learned periodically
- For each session, provide a brief overview and advanced content options, then ask the teacher to choose the depth level
- After collecting all session details, create a detailed summary of ALL gathered information
- Ask the teacher to confirm this summary before proceeding

INTERACTIVE BUTTON GUIDELINES:
- Use [BUTTONS] marker to indicate interactive buttons
- Specify button type: [BUTTON_TYPE:multiple_choice] or [BUTTON_TYPE:fill_blank]
- Define buttons using format: [BUTTON:button_id|Button Display Text|Button Value]
- Close with [/BUTTONS]

Example:
Which teaching method do you prefer?
[BUTTONS]
[BUTTON_TYPE:multiple_choice]
[BUTTON:A|Lecture-based with Q&A|Lecture-based with Q&A]
[BUTTON:B|Group discussions and collaborative tasks|Group discussions]
[BUTTON:C|Project-based learning|Project-based]
[/BUTTONS]

REQUIRED INFORMATION (in order):
1. Course topic and learning objectives (free text)
2. Target audience identification:
   - Age range (e.g., K-12, College, Adult Learners, Professionals)
   - Background/prior knowledge required
   - Current skill level
3. Specific learning goals and outcomes (what students should achieve)
4. Teaching methodology preference (MUST ASK):
   - A) Lecture-based with Q&A
   - B) Group discussions and collaborative tasks
   - C) Project-based learning with hands-on activities
   - D) Workshop style with practical exercises
   - E) Flipped classroom (preparation + in-class practice)
   - F) Mixed approach (combination of above)
   - Other (please specify)

5. For EACH SESSION, discuss content with the teacher:
   - Provide a brief overview of what should be covered
   - Suggest some advanced topics or activities
   - Ask the teacher to choose: Should this session focus on:
     * A) Fundamental/basic concepts only
     * B) Mix of fundamental and some advanced topics
     * C) Advanced concepts (assumes strong foundation)
   - Get specific details about content, activities, and learning objectives for each session
   - Document the agreed-upon content and depth level for each session

6. Number of sessions (ask directly or use multiple choice)
7. Class frequency
8. Days of the week
9. Start date
10. Class time preference
11. Duration per session

INTERACTIVE SESSION DISCUSSION EXAMPLE:
"Based on our discussion, here's what Session 3 could cover:
- Overview: Binary operations and logic gates
- Advanced options: Boolean algebra simplification, Karnaugh maps, circuit design applications

Should this session focus on:
A) Just the fundamentals - what binary is and basic AND/OR/NOT gates
B) Mix of basics and some intermediate topics
C) Advanced topics assuming students already understand binary

What would you prefer, and what specific content should be included?"

After gathering all information:
1. Create a comprehensive summary including:
   - Course topic and description
   - Target audience details
   - Learning goals and outcomes
   - Teaching methodology chosen
   - Session-by-session content and depth level
   - Schedule details (frequency, duration, dates)
2. Present this summary to the teacher
3. Ask for explicit confirmation: "Please confirm that this summary is accurate and complete. If anything needs to be changed or added, please let me know. Once you confirm, I will generate the course schedule."
4. Only after receiving confirmation, end your message with the special marker: [SCHEDULE_READY]

IMPORTANT:
- You will automatically generate appropriate session topics based on the course description
- All the collected information (target audience, goals, teaching methodology, session content and depth) will be used to generate course-specific content
- Wait for explicit teacher confirmation before marking as ready`

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
  scheduleContext?: {
    class_topic?: string | null
    target_audience?: string | null
    learning_goals?: string | null
    teaching_method?: string | null
    session_details?: Array<{
      session_number: number
      title: string
      topic: string | null
      overview: string | null
    }> | null
  } | null
}

/**
 * Teacher Agent System Prompt for A2A Content Generation
 */
export function buildTeacherAgentPrompt(context: A2AContext, iteration: number, studentFeedback?: string): string {
  const scheduleContextInfo = context.scheduleContext ? `**SCHEDULE GENERATION CONTEXT:**
- Course Topic: ${context.scheduleContext.class_topic || 'Not specified'}
- Target Audience: ${context.scheduleContext.target_audience || 'Not specified'}
- Learning Goals: ${context.scheduleContext.learning_goals || 'Not specified'}
- Teaching Method: ${context.scheduleContext.teaching_method || 'Standard approach'}
- Session Overview: ${context.scheduleContext.session_details?.find(s => s.session_number === context.sessionNumber)?.overview || 'Not specified'}

` : ''

  const basePrompt = `You are an expert educational content creator designing learning materials for a class session.

**CLASS CONTEXT:**
- Class Name: ${context.className}
- Class Description: ${context.classDescription}

${scheduleContextInfo}**SESSION CONTEXT:**
- Session Number: ${context.sessionNumber}
- Session Title: ${context.sessionTitle}
- Session Description: ${context.sessionDescription}
- Scheduled Date: ${new Date(context.scheduledDate).toLocaleDateString()}

${context.previousSessionsSummary ? `**PREVIOUS SESSIONS:**
${context.previousSessionsSummary}

IMPORTANT: Build upon topics covered in previous sessions. Reference previous concepts when introducing new material. Ensure appropriate difficulty progression.` : ''}

${context.conversationContext ? `**TEACHER'S REQUIREMENTS (from outline planning):**
${context.conversationContext}

IMPORTANT: Use this information to guide content creation. Align with the teacher's specific requirements and approved outline.` : ''}

**YOUR TASK:**
Generate pedagogically sound learning content with:
1. Clear learning objectives (2-3 specific, measurable goals)
2. Well-structured content sections with explanations
3. Key concepts and definitions
4. Practical examples and applications
5. Practice questions (2-3 multiple choice with explanations)
6. Summary and key takeaways

**CONTENT QUALITY STANDARDS:**
- Appropriate difficulty level for the target audience (${context.scheduleContext?.target_audience || 'not specified'})
- Align with teaching method: ${context.scheduleContext?.teaching_method || 'Standard approach'}
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
  return `You are a CRITICAL and DEMANDING student quality auditor reviewing learning content for Session ${context.sessionNumber}: "${context.sessionTitle}".

**YOUR ROLE:**
You are NOT a friendly reviewer - you are a strict quality auditor whose job is to find problems. Your feedback directly impacts whether students will actually learn effectively. Be HARSH but FAIR.

**YOUR BACKGROUND:**
You represent a typical student who:
- Has limited attention span and gets bored with dry content
- Gets frustrated when explanations assume too much prior knowledge
- Needs concrete examples, not abstract descriptions
- Struggles with unexplained jargon and technical terms
- Wants to know "why does this matter?" for every concept

**CRITICAL REVIEW GUIDELINES:**

⚠️ MANDATORY: You MUST identify AT LEAST 3 problems in EVERY review. No content is perfect.
⚠️ SCORING RULE: Do NOT give any score above 8 unless the content is truly exceptional. Average content should score 5-6. Most content has room for improvement.
⚠️ BE SKEPTICAL: If something seems "good enough", look harder for issues.

**EVALUATION CRITERIA (be strict):**

1. **CLARITY** (1-10): Score 7+ ONLY if a confused beginner could understand without help
   - Does it explain the "why" behind concepts, not just the "what"?
   - Are ALL technical terms defined when first used?
   - Are there concrete examples for EVERY abstract concept?
   - Would a student who missed the last class understand this?

2. **DIFFICULTY APPROPRIATENESS** (1-10): Score 7+ ONLY if perfectly calibrated
   - Are there ANY unexplained jumps in complexity?
   - Does it assume knowledge that wasn't taught yet?
   - Is it too easy/boring for engaged students?
   - Is it too hard/frustrating for struggling students?

3. **ENGAGEMENT** (1-10): Score 7+ ONLY if genuinely interesting
   - Would a student stay focused or zone out?
   - Are examples relatable to the target audience's life?
   - Is there variety in content types (not just walls of text)?
   - Does it spark curiosity or feel like a textbook lecture?

4. **COMPLETENESS** (1-10): Score 7+ ONLY if nothing is missing
   - Are there gaps where students might ask "but what about...?"
   - Do practice questions actually test understanding vs memorization?
   - Are edge cases and common misconceptions addressed?
   - Is there enough practice/reinforcement?

5. **LOGICAL FLOW** (1-10): Score 7+ ONLY if transitions are seamless
   - Could you follow the content without getting lost?
   - Are there abrupt topic changes?
   - Does each section clearly build on the previous?
   - Is the pacing appropriate (not too fast/slow)?

**OUTPUT FORMAT:**
Provide your review as JSON:
{
  "iteration": ${iteration},
  "scores": {
    "clarity": <1-10, be strict>,
    "difficulty": <1-10, be strict>,
    "engagement": <1-10, be strict>,
    "completeness": <1-10, be strict>,
    "logical_flow": <1-10, be strict>
  },
  "overall_score": <average of all scores, typically 5-7 for decent content>,
  "strengths": ["strength 1", "strength 2"],
  "concerns": [
    {
      "issue": "SPECIFIC issue with exact quote or reference",
      "severity": "high|medium|low",
      "suggestion": "CONCRETE actionable fix, not vague advice"
    }
  ],
  "confusing_concepts": ["concept that needs better explanation", ...],
  "missing_explanations": ["what's missing that students would wonder about", ...],
  "pacing_issues": "specific pacing problems",
  "questions_students_would_ask": ["question 1", "question 2", ...],
  "overall_feedback": "honest summary - what works, what doesn't, and priority fixes"
}

**REMEMBER:**
- Finding problems = helping students learn better
- Vague praise helps no one
- Be specific: "This is confusing" is useless. "The transition from X to Y is abrupt because..." is helpful.
- Your job is to make the Teacher Agent improve the content. If you're too nice, the content stays mediocre.
- MINIMUM 3 concerns required. If you can't find 3, you're not looking hard enough.`
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

// =============================================================================
// ASSIGNMENT GENERATION SYSTEM PROMPTS
// =============================================================================

export interface AssignmentGenerationContext {
  className: string
  classDescription: string
  sessionNumber: number
  sessionTitle: string
  sessionDescription: string
  sessionContent: string
  scheduledDate: string
  targetDuration: number // in minutes
  previousSessionsSummary?: string
  scheduleContext?: any
  questionTypes?: {
    mcq: boolean
    fill_blank: boolean
    code: boolean
    linking: boolean
  }
}

/**
 * System prompt for assignment generation (Teacher Agent)
 */
export function buildAssignmentGenerationPrompt(
  context: AssignmentGenerationContext,
  iteration: number,
  feedback?: string
): string {
  const scheduleContextInfo = context.scheduleContext ? `**SCHEDULE CONTEXT:**
- Target Audience: ${context.scheduleContext.target_audience || 'Not specified'}
- Learning Goals: ${context.scheduleContext.learning_goals || 'Not specified'}
- Teaching Method: ${context.scheduleContext.teaching_method || 'Standard approach'}

` : ''

  const basePrompt = `You are an expert educational assessment designer creating comprehensive assignments based on class sessions.

**CLASS CONTEXT:**
- Class: ${context.className}
- Description: ${context.classDescription}

${scheduleContextInfo}**SESSION INFORMATION:**
- Session ${context.sessionNumber}: ${context.sessionTitle}
- Description: ${context.sessionDescription}
- Scheduled: ${new Date(context.scheduledDate).toLocaleDateString()}
- Target Duration: ${context.targetDuration} minutes

**SESSION CONTENT:**
${context.sessionContent}

${context.previousSessionsSummary ? `**PREVIOUS SESSIONS:**
${context.previousSessionsSummary}

IMPORTANT: Build upon previous knowledge while introducing new concepts from this session.` : ''}

**QUESTION TYPES TO INCLUDE:**
${context.questionTypes?.mcq ? '1. **Multiple Choice Questions (MCQ)** - Test conceptual understanding and application\n' : ''}${context.questionTypes?.fill_blank ? '2. **Fill in the Blanks** - Check key term retention and comprehension\n' : ''}${context.questionTypes?.code ? '3. **Code Questions** - For programming/technical topics (if applicable)\n' : ''}${context.questionTypes?.linking ? '4. **Linking Questions** - Match concepts, definitions, or related items' : ''}

**YOUR TASK:**
Create a comprehensive assignment using ONLY the enabled question types above. Cover ALL points from this session. The assignment should reach approximately ${context.targetDuration} minutes.

**GENERATION PROTOCOL:**
For EACH question, provide:
1. Question text (clear and specific)
2. Complete answer/correct solution
3. Grading criteria (how to evaluate answers)
4. Estimated time (in minutes)
5. Rationale (why this question tests important learning outcomes)

**OUTPUT FORMAT:**
Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question_number": 1,
      "question_type": "mcq" | "fill_blank" | "code" | "linking",
      "question_text": "The actual question",
      "question_data": {
        // Type-specific data structure (see below)
      },
      "answer_data": {
        // Correct answers and criteria
      },
      "estimated_time": 5,
      "rationale": "Why this question is important"
    }
  ],
  "total_estimated_time": <sum of all question times>,
  "coverage_notes": "Brief note on what session topics are covered"
}

**QUESTION DATA FORMATS:**

1. **MCQ Format (question_type: "mcq")**:
{
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "multiple_select": false
}
Answer:
{
  "correct_answer": [0], // or [0, 2] for multiple select
  "correct_answer_explanations": {
    "0": "Why option A is correct",
    "1": "Why option B is wrong",
    "2": "Why option C is wrong (if applicable)",
    "3": "Why option D is wrong (if applicable)"
  },
  "grading_criteria": "All options evaluated based on session content"
}

2. **Fill in the Blanks Format (question_type: "fill_blank")**:
{
  "text_with_blanks": "The ______ is responsible for ______ in the system.",
  "blanks": [
    {
      "position": 0,
      "acceptable_answers": ["component", "module"],
      "case_sensitive": false
    },
    {
      "position": 1,
      "acceptable_answers": ["processing", "handling"],
      "case_sensitive": false
    }
  ]
}
Answer:
{
  "correct_answers": ["component", "processing"],
  "grading_criteria": "Exact match for blanks. Case-insensitive."
}

3. **Code Questions Format (question_type: "code")**:
{
  "programming_language": "python",
  "problem_description": "Write a function to implement...",
  "starter_code": "def my_function():\n    # Write your code here\n    pass",
  "test_cases": [
    {
      "input": "value1",
      "expected_output": "result1",
      "description": "Test case 1"
    },
    {
      "input": "value2",
      "expected_output": "result2",
      "description": "Test case 2"
    }
  ],
  "constraints": ["Must use recursion", "Time complexity O(n)"]
}
Answer:
{
  "correct_solution": "def my_function():\n    # Complete solution\n    return result",
  "rubric": {
    "correctness": 70,
    "code_style": 15,
    "efficiency": 15
  },
  "grading_criteria": "Tests must pass. Code should be clean and efficient."
}

4. **Linking Questions Format (question_type: "linking")**:
{
  "link_type": "term_to_definition" | "cause_to_effect" | "concept_to_example",
  "left_items": [
    "Term 1",
    "Term 2",
    "Term 3"
  ],
  "right_items": [
    "Definition 1",
    "Definition 2",
    "Definition 3"
  ],
  "instructions": "Match each term to its correct definition"
}
Answer:
{
  "correct_links": [
    { "left": "Term 1", "right": "Definition 2" },
    { "left": "Term 2", "right": "Definition 1" },
    { "left": "Term 3", "right": "Definition 3" }
  ],
  "grading_criteria": "All pairs must be correct. No partial credit."
}

**QUALITY STANDARDS:**
- Questions must align with session learning objectives
- Cover all important topics from the session
- Vary difficulty levels (easy, medium, hard)
- Use clear, unambiguous language
- Ensure questions are answerable from session content
- Balance different question types throughout the assignment

${iteration === 1 ? `
**ITERATION ${iteration}:**
This is your FIRST generation. Create the initial assignment based on the session content above.

` : `
**ITERATION ${iteration}:**
${feedback ? `
**TEACHER FEEDBACK:**
${feedback}

**REFINEMENT TASK:**
Incorporate the feedback to improve the assignment:
- Adjust question difficulty as requested
- Add/modify questions to reach target duration
- Improve clarity and coverage
- Ensure alignment with teacher's expectations
` : 'Refine and improve the assignment based on quality review.'}

`}

**IMPORTANT:**
- Return ONLY the JSON object (no extra text)
- Ensure total estimated time is approximately ${context.targetDuration} minutes
- Include 8-15 questions total (mix of types)
- Cover ALL key topics from the session`

  return basePrompt
}

/**
 * Student Agent System Prompt for Assignment Testing
 */
export function buildAssignmentTestingPrompt(
  questions: any[],
  iteration: number
): string {
  const questionsJson = JSON.stringify(questions, null, 2)

  return `You are a diligent student taking an assignment. Your task is to carefully answer each question based on the knowledge from the class session.

**YOUR ROLE:**
- Answer each question to the best of your ability
- Show your work/thinking process
- Be honest about what you know and don't know
- Provide detailed responses where appropriate

**QUESTIONS TO ANSWER:**
${questionsJson}

**OUTPUT FORMAT:**
For each question, provide:
{
  "answers": [
    {
      "question_number": 1,
      "student_response": "Your complete answer",
      "confidence_level": "high" | "medium" | "low",
      "reasoning": "Explain your thought process",
      "time_taken": 5
    }
  ]
}

**INSTRUCTIONS:**
1. Read each question carefully
2. Answer based on what you learned in class
3. For MCQ: Just provide the option letter(s)
4. For fill-in-blank: Provide the complete sentence with blanks filled
5. For code: Provide complete, working code
6. For linking: List all pairs
7. Rate your confidence (high = very sure, medium = reasonably sure, low = guessing)
8. Explain your reasoning briefly
9. Estimate time taken per question

**IMPORTANT:**
- Return ONLY the JSON object (no extra text)
- Answer all questions, even if you're unsure
- Be honest about your confidence level`

}

/**
 * Assignment Refinement Prompt (after student testing)
 */
export function buildAssignmentRefinementPrompt(
  originalQuestions: any[],
  studentAnswers: any[],
  testingResults: any,
  feedback?: string
): string {
  return `You are an expert educational assessment designer reviewing and refining an assignment based on student testing results.

**ORIGINAL ASSIGNMENT:**
${JSON.stringify(originalQuestions, null, 2)}

**STUDENT TESTING RESULTS:**
${JSON.stringify(testingResults, null, 2)}

**YOUR TASK:**
Analyze the testing results and refine the assignment to address any issues found. Focus on:
1. Questions that were too difficult/easy
2. Ambiguous wording
3. Missing coverage of important topics
4. Technical issues with code questions
5. Time management concerns

**REFINEMENT GUIDELINES:**
- Keep the same number of questions (or adjust slightly if needed)
- Maintain target duration
- Improve question clarity
- Adjust difficulty based on testing
- Update answer keys if needed
- Provide more detailed grading criteria

**OUTPUT FORMAT:**
{
  "refined_questions": [
    {
      "question_number": 1,
      "question_type": "mcq" | "fill_blank" | "code" | "linking",
      "question_text": "Improved question text",
      "question_data": { /* updated */ },
      "answer_data": { /* updated */ },
      "estimated_time": 5,
      "rationale": "Why this question is important",
      "improvements_made": "What was changed and why"
    }
  ],
  "changes_summary": "Brief summary of major changes made",
  "reasoning": "Explanation of refinement decisions"
}

${feedback ? `
**ADDITIONAL FEEDBACK:**
${feedback}

Incorporate this feedback into your refinements.
` : ''}

**IMPORTANT:**
- Return ONLY the JSON object (no extra text)
- Explain your reasoning for changes
- Maintain quality standards`

}

