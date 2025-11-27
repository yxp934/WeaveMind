import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { courseEditingTools } from '@/lib/ai/editing-tool-definitions'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'
const MODEL_NAME = 'meituan/longcat-flash-chat'

/**
 * POST /api/ai/course-edit
 * 
 * Accepts natural language editing instructions and uses AI with tool calling
 * to safely modify course content
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId, instruction } = await request.json()

    if (!courseId || !instruction) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, instruction' },
        { status: 400 }
      )
    }

    // Verify user has access to this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, created_by')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    if (course.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this course' },
        { status: 403 }
      )
    }

	    // Initialize OpenAI client with Vercel AI Gateway using API key (no OIDC)
	    const gatewayKey = process.env.VERCEL_GATEWAY_KEY
	    if (!gatewayKey) {
	      return NextResponse.json(
	        { error: 'AI Gateway not configured' },
	        { status: 500 }
	      )
	    }
	
	    const openai = createOpenAI({
	      baseURL: GATEWAY_BASE_URL,
	      apiKey: gatewayKey,
	    })

    // Build system prompt with course context
    const systemPrompt = `You are a course editing assistant. You help teachers modify their course content using the available tools.

Course ID: ${courseId}

Available tools:
- getCourseStructure: Get the current course structure (use this first to understand the course)
- insertComponent: Add new components to chapters
- moveComponent: Reorder or move components between chapters
- deleteComponent: Remove components
- updateComponentContent: Modify existing component content
- addExamplesToConcept: Add examples to all components mentioning a concept across all chapters

When the teacher gives you an instruction:
1. First use getCourseStructure to understand the current course structure
2. Analyze what needs to be done
3. Use the appropriate tools to make the changes
4. Confirm what you did

If the instruction is ambiguous, ask for clarification.`

    // Generate response with tool calling
    const result = await generateText({
      model: openai.chat(MODEL_NAME),
      system: systemPrompt,
      prompt: instruction,
      tools: courseEditingTools,
    })

    // Extract tool calls and results
    const toolCalls = result.toolCalls || []
    const toolResults = result.toolResults || []

    // Log edit history
    const changesSummary = toolResults
      .map((tr: any) => `${tr.toolName}: ${JSON.stringify(tr.result)}`)
      .join('; ')

    if (toolCalls.length > 0) {
      await supabase.from('course_edit_history').insert({
        course_id: courseId,
        edited_by: user.id,
        edit_type: 'ai_instruction',
        instruction,
        tool_calls: toolCalls.map((tc: any) => ({
          toolName: tc.toolName,
          args: tc.args,
        })),
        changes_summary: changesSummary || 'AI editing operation',
      })

      // Create version snapshot if any changes were made
      await supabase.rpc('create_course_version_snapshot', {
        p_course_id: courseId,
        p_created_by: user.id,
        p_description: `AI edit: ${instruction.substring(0, 100)}`,
      })
    }

    return NextResponse.json({
      success: true,
      response: result.text,
      toolCalls: toolCalls.map((tc: any) => ({
        toolName: tc.toolName,
        args: tc.args,
      })),
      toolResults: toolResults.map((tr: any) => ({
        toolName: tr.toolName,
        result: tr.result,
      })),
      usage: result.usage,
    })
  } catch (error: any) {
    console.error('Error in AI course editing:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process editing instruction' },
      { status: 500 }
    )
  }
}

