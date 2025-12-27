import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGatewayOpenAI, DEFAULT_MODEL } from '@/lib/ai/langgraph/config/openai-gateway'
import { generateText } from 'ai'
import { A2A_BUILDER_PROMPT, A2A_CRITIC_PROMPT } from '@/lib/ai/prompts'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { session_id, max_iterations = 3, requirements } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session ownership
    const { data: session } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('created_by', user.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 })
    }

    // Check if session generation already exists
    const { data: existingGeneration } = await supabase
      .from('a2a_session_generations')
      .select('*')
      .eq('session_id', session_id)
      .eq('created_by', user.id)
      .in('status', ['pending', 'running'])
      .single()

    if (existingGeneration) {
      return NextResponse.json({
        error: 'Session content generation already in progress',
        generation: existingGeneration
      }, { status: 400 })
    }

    // Create generation record
    const { data: generation, error: createError } = await supabase
      .from('a2a_session_generations')
      .insert({
        session_id,
        created_by: user.id,
        max_iterations,
        status: 'pending'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating session generation:', createError)
      return NextResponse.json({ error: 'Failed to start session content generation' }, { status: 500 })
    }

    // Update generation status to running
    await supabase
      .from('a2a_session_generations')
      .update({ status: 'running' })
      .eq('id', generation.id)

    // Start session generation process
    const result = await runA2AGeneration({
      session,
      requirements,
      max_iterations,
      user_id: user.id
    })

    // Update generation with results
    const { data: finalGeneration } = await supabase
      .from('a2a_session_generations')
      .update({
        status: result.success ? 'completed' : 'failed',
        current_iteration: result.current_iteration,
        builder_feedback: result.builder_feedback,
        critic_feedback: result.critic_feedback,
        final_content: result.final_content,
        error_message: result.error
      })
      .eq('id', generation.id)
      .select()
      .single()

    return NextResponse.json({
      success: result.success,
      generation: finalGeneration,
      message: result.success ? 'Session content generation completed' : 'Session content generation failed'
    })

  } catch (error: any) {
    console.error('Session generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate session' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const session_id = searchParams.get('session_id')

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get latest generation for this session
    const { data: generation, error } = await supabase
      .from('a2a_session_generations')
      .select('*')
      .eq('session_id', session_id)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return NextResponse.json({ generation: null })
    }

    return NextResponse.json({ generation })
  } catch (error: any) {
    console.error('Get session generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get generation status' },
      { status: 500 }
    )
  }
}

async function runA2AGeneration({
  session,
  requirements,
  max_iterations,
  user_id
}: {
  session: any
  requirements?: any
  max_iterations: number
  user_id: string
}) {
  try {
    // Verify AI Gateway configuration
    // 使用全局统一的 Gateway 配置
// Create OpenAI client with Vercel AI Gateway
    const openai = createGatewayOpenAI()
let builder_feedback = []
    let critic_feedback = []
    let current_iteration = 0
    let final_content = {}

    // Run A2A iterations
    for (let i = 0; i < max_iterations; i++) {
      current_iteration = i + 1

      try {
        // Builder agent creates content
        const builderResponse = await generateText({
          model: openai.chat(DEFAULT_MODEL),
          system: A2A_BUILDER_PROMPT,
          prompt: `
            Session Details:
            - Title: ${session.title}
            - Description: ${session.description}
            - Scheduled: ${session.scheduled_date}
            - Duration: ${session.duration_minutes} minutes

            Requirements: ${requirements ? JSON.stringify(requirements) : 'None specified'}

            Create comprehensive content for this session including:
            1. Learning objectives
            2. Key topics to cover
            3. Activities and exercises
            4. Assessment methods
            5. Resources needed

            Iteration ${current_iteration} of ${max_iterations}
          `,
          temperature: 0.7,
        })

        const builder_content = builderResponse.text
        builder_feedback.push({
          iteration: current_iteration,
          content: builder_content,
          timestamp: new Date().toISOString()
        })

        // Critic agent reviews and provides feedback
        const criticResponse = await generateText({
          model: openai.chat(DEFAULT_MODEL),
          system: A2A_CRITIC_PROMPT,
          prompt: `
            Review the following session content from a student learning perspective:

            Session: ${session.title}
            Content: ${builder_content}

            Provide feedback on:
            1. Clarity and comprehensibility
            2. Learning progression
            3. Engagement level
            4. Practical applicability
            5. Areas for improvement

            Be specific and constructive in your feedback.
          `,
          temperature: 0.5,
        })

        const critic_content = criticResponse.text
        critic_feedback.push({
          iteration: current_iteration,
          content: critic_content,
          timestamp: new Date().toISOString()
        })

        // Check if content is satisfactory (simplified criteria)
        if (i === max_iterations - 1 || isContentSatisfactory(builder_content, critic_content)) {
          final_content = {
            session_id: session.id,
            iteration: current_iteration,
            content: builder_content,
            feedback: critic_content,
            generated_at: new Date().toISOString()
          }
          break
        }

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (iterationError: any) {
        console.error(`Iteration ${current_iteration} error:`, iterationError)
        // Continue with next iteration even if one fails
      }
    }

    return {
      success: Object.keys(final_content).length > 0,
      current_iteration,
      builder_feedback,
      critic_feedback,
      final_content,
      error: null
    }

  } catch (error: any) {
    console.error('Session generation process error:', error)
    return {
      success: false,
      current_iteration,
      builder_feedback,
      critic_feedback,
      final_content: {},
      error: error.message
    }
  }
}

function isContentSatisfactory(builderContent: string, criticContent: string): boolean {
  // Simplified satisfaction check based on critic feedback
  // In production, this would be more sophisticated
  const negativeWords = ['poor', 'unclear', 'insufficient', 'lacking', 'weak']
  const content = criticContent.toLowerCase()

  const hasNegativeFeedback = negativeWords.some(word => content.includes(word))

  return !hasNegativeFeedback && builderContent.length > 500
}