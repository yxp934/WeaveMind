import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createStateManager, type StateManager, type ConversationState, type ConversationMessage } from '@/lib/conversation/state-manager'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const stateManager = createStateManager(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const state = await stateManager.getState(sessionId)

    if (!state) {
      return NextResponse.json(
        { error: 'Conversation state not found' },
        { status: 404 }
      )
    }

    // 确保用户只能访问自己的对话状态
    if (state.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ state })

  } catch (error: any) {
    console.error('Get conversation state error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const stateManager = createStateManager(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflowType, sessionId } = body

    if (!workflowType) {
      return NextResponse.json(
        { error: 'Workflow type is required' },
        { status: 400 }
      )
    }

    // 创建新的对话状态
    const state = await stateManager.createState(user.id, workflowType, sessionId)

    return NextResponse.json({ state }, { status: 201 })

  } catch (error: any) {
    console.error('Create conversation state error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const stateManager = createStateManager(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, updates } = body

    if (!sessionId || !updates) {
      return NextResponse.json(
        { error: 'Session ID and updates are required' },
        { status: 400 }
      )
    }

    // 获取当前状态以验证权限
    const currentState = await stateManager.getState(sessionId)
    if (!currentState) {
      return NextResponse.json(
        { error: 'Conversation state not found' },
        { status: 404 }
      )
    }

    // 确保用户只能更新自己的对话状态
    if (currentState.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 更新状态
    await stateManager.updateState(sessionId, updates)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Update conversation state error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const stateManager = createStateManager(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // 获取当前状态以验证权限
    const currentState = await stateManager.getState(sessionId)
    if (!currentState) {
      return NextResponse.json(
        { error: 'Conversation state not found' },
        { status: 404 }
      )
    }

    // 确保用户只能删除自己的对话状态
    if (currentState.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 清理对话状态
    await stateManager.cleanup(sessionId)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete conversation state error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}