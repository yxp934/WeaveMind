import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const workflow_type = searchParams.get('workflow_type')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from('ai_tools_registry')
      .select('*')
      .eq('enabled', true)
      .order('tool_name')

    // Filter by category if specified
    if (category) {
      query = query.eq('tool_category', category)
    }

    const { data: tools, error } = await query

    if (error) {
      console.error('Error fetching tools:', error)
      return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 })
    }

    // Filter tools based on workflow type
    let filteredTools = tools
    if (workflow_type === 'session_creation') {
      filteredTools = tools?.filter(tool =>
        ['session_management', 'ai_generation'].includes(tool.tool_category)
      ) || []
    } else if (workflow_type === 'outline_generation') {
      filteredTools = tools?.filter(tool =>
        tool.tool_category === 'ai_generation'
      ) || []
    }

    // Return tools with metadata
    const response = {
      tools: filteredTools,
      categories: [
        'session_management',
        'ai_generation',
        'data_retrieval',
        'content_management'
      ],
      total: filteredTools.length
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Get tools list error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get tools list' },
      { status: 500 }
    )
  }
}