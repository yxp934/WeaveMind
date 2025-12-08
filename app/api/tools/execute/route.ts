import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createToolManager } from '@/lib/tools/tool-manager'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { toolName, parameters, sessionId, conversationStateId } = body

    if (!toolName || !parameters) {
      return NextResponse.json(
        { error: 'Tool name and parameters are required' },
        { status: 400 }
      )
    }

    // 创建工具管理器
    const toolManager = createToolManager(supabase)

    // 执行工具
    const result = await toolManager.executeTool(toolName, parameters, {
      userId: user.id,
      sessionId,
      conversationStateId
    })

    if (!result.success) {
      return NextResponse.json({
        error: 'Tool execution failed',
        details: result.error,
        executionTimeMs: result.executionTimeMs
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      executionTimeMs: result.executionTimeMs
    })

  } catch (error: any) {
    console.error('Tool execution error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * 获取可用工具列表
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = supabase
      .from('ai_tools_registry')
      .select('*')
      .eq('enabled', true)
      .order('tool_name')

    if (category) {
      query = query.eq('tool_category', category)
    }

    const { data: tools, error } = await query

    if (error) {
      throw new Error(`Failed to fetch tools: ${error.message}`)
    }

    return NextResponse.json({
      tools: tools?.map(tool => ({
        id: tool.id,
        name: tool.tool_name,
        description: tool.tool_description,
        category: tool.tool_category,
        schema: tool.tool_schema,
        usageCount: tool.usage_count
      })) || []
    })

  } catch (error: any) {
    console.error('Get tools error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}