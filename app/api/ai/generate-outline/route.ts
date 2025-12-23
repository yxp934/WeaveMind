import { generateText } from 'ai'
import { OUTLINE_GENERATION_SYSTEM_PROMPT, buildOutlinePrompt, type CourseRequirements } from '@/lib/ai/prompts'
import { createClient } from '@/lib/supabase/server'
import { createGatewayOpenAI, DEFAULT_MODEL } from '@/lib/ai/langgraph/config/openai-gateway'

export const runtime = 'edge'

// 使用统一的 Gateway 配置
const openai = createGatewayOpenAI()

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { requirements, class_id, save_to_class = false } = body as {
      requirements: CourseRequirements
      class_id?: string
      save_to_class?: boolean
    }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // If saving to class, verify user has access to the class
    if (save_to_class && class_id) {
      const { data: classMember } = await supabase
        .from('class_members')
        .select('role')
        .eq('class_id', class_id)
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .single()

      if (!classMember) {
        return new Response('Access denied: Not a teacher in this class', { status: 403 })
      }
    }

    // Generate outline using AI - 使用统一的默认模型
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      system: OUTLINE_GENERATION_SYSTEM_PROMPT,
      prompt: buildOutlinePrompt(requirements),
      temperature: 0.7,
    })

    // Parse the JSON response
    let chapters
    try {
      chapters = JSON.parse(text)
    } catch (parseError) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        chapters = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse outline from AI response')
      }
    }

    // Save outline to class if requested
    let savedOutline = null
    if (save_to_class && class_id) {
      // Check if outline already exists for this class
      const { data: existingOutline } = await supabase
        .from('course_outlines')
        .select('id')
        .eq('class_id', class_id)
        .eq('created_by', user.id)
        .single()

      if (existingOutline) {
        // Update existing outline
        const { data: updatedOutline, error } = await supabase
          .from('course_outlines')
          .update({
            requirements,
            chapters,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingOutline.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating class outline:', error)
          throw new Error('Failed to update class outline')
        }

        savedOutline = updatedOutline
      } else {
        // Create new outline
        const { data: newOutline, error } = await supabase
          .from('course_outlines')
          .insert({
            class_id,
            requirements,
            chapters,
            created_by: user.id,
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating class outline:', error)
          throw new Error('Failed to create class outline')
        }

        savedOutline = newOutline
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        chapters,
        requirements,
        class_id: class_id || null,
        saved_outline: savedOutline
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('Outline generation error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate outline'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

