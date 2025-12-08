import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { workflow_id, tool_name, parameters } = body

    if (!workflow_id || !tool_name) {
      return NextResponse.json(
        { error: 'Workflow ID and tool name are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workflow ownership
    const { data: workflow } = await supabase
      .from('chatbot_workflows')
      .select('*')
      .eq('id', workflow_id)
      .eq('user_id', user.id)
      .single()

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Get tool definition
    const { data: tool } = await supabase
      .from('ai_tools_registry')
      .select('*')
      .eq('tool_name', tool_name)
      .eq('enabled', true)
      .single()

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found or disabled' }, { status: 404 })
    }

    // Validate parameters against schema
    // This is a simplified validation - in production, use a proper JSON schema validator
    if (tool.tool_schema && parameters) {
      const schema = tool.tool_schema
      const requiredProps = schema.required || []

      for (const prop of requiredProps) {
        if (!(prop in parameters)) {
          return NextResponse.json(
            { error: `Missing required parameter: ${prop}` },
            { status: 400 }
          )
        }
      }
    }

    // Execute tool
    let result = {}
    let error = null

    try {
      switch (tool_name) {
        case 'create_session':
          result = await executeCreateSession(parameters, user.id, supabase)
          break
        case 'update_session':
          result = await executeUpdateSession(parameters, user.id, supabase)
          break
        case 'delete_session':
          result = await executeDeleteSession(parameters, user.id, supabase)
          break
        case 'generate_outline':
          result = await executeGenerateOutline(parameters, user.id, supabase)
          break
        case 'generate_session_content':
          result = await executeGenerateSessionContent(parameters, user.id, supabase)
          break
        case 'a2a_session_generation':
          result = await executeA2ASessionGeneration(parameters, user.id, supabase)
          break
        case 'get_class_sessions':
          result = await executeGetClassSessions(parameters, user.id, supabase)
          break
        case 'get_session_details':
          result = await executeGetSessionDetails(parameters, user.id, supabase)
          break
        default:
          return NextResponse.json({ error: 'Tool execution not implemented' }, { status: 501 })
      }
    } catch (execError: any) {
      error = execError.message
      console.error(`Tool ${tool_name} execution error:`, execError)
    }

    // Update tool usage count
    await supabase
      .from('ai_tools_registry')
      .update({ usage_count: tool.usage_count + 1 })
      .eq('id', tool.id)

    // Record tool call in workflow
    const toolCall = {
      tool_name,
      parameters,
      result: error ? { error } : result,
      timestamp: new Date().toISOString()
    }

    const { data: updatedWorkflow } = await supabase
      .from('chatbot_workflows')
      .update({
        tools_called: [...(workflow.tools_called || []), toolCall],
        current_step: error ? 'error' : 'tool_executed',
        status: error ? 'error' : 'active',
        error_message: error || null,
        result: error ? { error } : result
      })
      .eq('id', workflow_id)
      .select()
      .single()

    return NextResponse.json({
      success: !error,
      result: error ? null : result,
      error: error || null,
      workflow: updatedWorkflow
    })
  } catch (error: any) {
    console.error('Tool call error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to execute tool' },
      { status: 500 }
    )
  }
}

// Tool execution functions
async function executeCreateSession(params: any, userId: string, supabase: any) {
  const { class_id, title, description, scheduled_date, duration_minutes, location } = params

  // Verify user is a teacher in the class
  const { data: classMember } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', class_id)
    .eq('user_id', userId)
    .eq('role', 'teacher')
    .single()

  if (!classMember) {
    throw new Error('Access denied: Not a teacher in this class')
  }

  // Get next session number
  const { data: lastSession } = await supabase
    .from('course_sessions')
    .select('session_number')
    .eq('class_id', class_id)
    .order('session_number', { ascending: false })
    .limit(1)
    .single()

  const nextSessionNumber = (lastSession?.session_number || 0) + 1

  // Create session
  const { data: session, error } = await supabase
    .from('course_sessions')
    .insert({
      class_id,
      session_number: nextSessionNumber,
      title,
      description,
      scheduled_date,
      duration_minutes,
      location,
      created_by: userId,
      content_generated: false,
      posted: false
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return { session }
}

async function executeUpdateSession(params: any, userId: string, supabase: any) {
  const { session_id, ...updates } = params

  // Verify user owns the session
  const { data: session } = await supabase
    .from('course_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('created_by', userId)
    .single()

  if (!session) {
    throw new Error('Access denied: Session not found or not owned by user')
  }

  // Update session
  const { data: updatedSession, error } = await supabase
    .from('course_sessions')
    .update(updates)
    .eq('id', session_id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`)
  }

  return { session: updatedSession }
}

async function executeDeleteSession(params: any, userId: string, supabase: any) {
  const { session_id } = params

  // Verify user owns the session
  const { data: session } = await supabase
    .from('course_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('created_by', userId)
    .single()

  if (!session) {
    throw new Error('Access denied: Session not found or not owned by user')
  }

  // Delete session
  const { error } = await supabase
    .from('course_sessions')
    .delete()
    .eq('id', session_id)

  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`)
  }

  return { success: true }
}

async function executeGenerateOutline(params: any, userId: string, supabase: any) {
  const { requirements, target_audience, duration_weeks } = params

  // This would integrate with the existing outline generation API
  // For now, return a placeholder
  return {
    message: 'Outline generation initiated',
    requirements,
    target_audience,
    duration_weeks
  }
}

async function executeGenerateSessionContent(params: any, userId: string, supabase: any) {
  const { session_id, content_type, specific_requirements } = params

  // Verify session ownership
  const { data: session } = await supabase
    .from('course_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('created_by', userId)
    .single()

  if (!session) {
    throw new Error('Access denied: Session not found or not owned by user')
  }

  // Mark session as having generated content
  await supabase
    .from('course_sessions')
    .update({ content_generated: true })
    .eq('id', session_id)

  return {
    message: 'Session content generation initiated',
    session_id,
    content_type,
    specific_requirements
  }
}

async function executeA2ASessionGeneration(params: any, userId: string, supabase: any) {
  const { session_id, max_iterations = 3 } = params

  // Verify session ownership
  const { data: session } = await supabase
    .from('course_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('created_by', userId)
    .single()

  if (!session) {
    throw new Error('Access denied: Session not found or not owned by user')
  }

  // Create A2A generation record
  const { data: generation, error } = await supabase
    .from('a2a_session_generations')
    .insert({
      session_id,
      created_by: userId,
      max_iterations,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to start A2A generation: ${error.message}`)
  }

  return { generation }
}

async function executeGetClassSessions(params: any, userId: string, supabase: any) {
  const { class_id } = params

  // Verify user is a member of the class
  const { data: classMember } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', class_id)
    .eq('user_id', userId)
    .single()

  if (!classMember) {
    throw new Error('Access denied: Not a member of this class')
  }

  // Get sessions
  const { data: sessions, error } = await supabase
    .from('course_sessions')
    .select('*')
    .eq('class_id', class_id)
    .order('session_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to get sessions: ${error.message}`)
  }

  return { sessions }
}

async function executeGetSessionDetails(params: any, userId: string, supabase: any) {
  const { session_id } = params

  // Get session with access check
  const { data: session, error } = await supabase
    .from('course_sessions')
    .select('*')
    .eq('id', session_id)
    .single()

  if (error) {
    throw new Error(`Failed to get session: ${error.message}`)
  }

  // Check if user has access to this session
  const { data: classMember } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', session.class_id)
    .eq('user_id', userId)
    .single()

  if (!classMember) {
    throw new Error('Access denied: Not a member of this class')
  }

  // If student, only allow access if session is posted
  if (classMember.role === 'student' && !session.posted) {
    throw new Error('Access denied: Session not posted yet')
  }

  return { session }
}