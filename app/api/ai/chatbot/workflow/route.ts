import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { workflow_type, context } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create new workflow
    const { data: workflow, error } = await supabase
      .from('chatbot_workflows')
      .insert({
        user_id: user.id,
        workflow_type: workflow_type || 'session_creation',
        context: context || {},
        current_step: 'initial',
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating workflow:', error)
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
    }

    // Discover available tools based on workflow type
    const { data: tools } = await supabase
      .from('ai_tools_registry')
      .select('*')
      .eq('enabled', true)

    let discoveredTools = []
    if (workflow_type === 'session_creation') {
      discoveredTools = tools?.filter(tool =>
        ['session_management', 'ai_generation'].includes(tool.tool_category)
      ) || []
    } else if (workflow_type === 'outline_generation') {
      discoveredTools = tools?.filter(tool =>
        tool.tool_category === 'ai_generation'
      ) || []
    }

    // Update workflow with discovered tools
    const { data: updatedWorkflow } = await supabase
      .from('chatbot_workflows')
      .update({
        tools_discovered: discoveredTools,
        current_step: 'tools_discovered'
      })
      .eq('id', workflow.id)
      .select()
      .single()

    return NextResponse.json({
      success: true,
      workflow: updatedWorkflow
    })
  } catch (error: any) {
    console.error('Chatbot workflow error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process workflow' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workflowId = searchParams.get('id')

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workflow details
    const { data: workflow, error } = await supabase
      .from('chatbot_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching workflow:', error)
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    return NextResponse.json({ workflow })
  } catch (error: any) {
    console.error('Get workflow error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get workflow' },
      { status: 500 }
    )
  }
}