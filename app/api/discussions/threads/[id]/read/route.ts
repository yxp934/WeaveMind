import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  ApiResponse
} from '@/types/discussion'

// POST /api/discussions/threads/[id]/read - Mark thread as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 })
    }

    // Get the discussion thread
    const { data: thread } = await supabase
      .from('discussion_threads')
      .select('class_id')
      .eq('id', threadId)
      .eq('is_deleted', false)
      .single()

    if (!thread) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Discussion thread not found',
      }, { status: 404 })
    }

    // Check if user has access to this class
    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', thread.class_id)
      .eq('user_id', user.id)
      .single()

    if (!classMember) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Access denied',
      }, { status: 403 })
    }

    const now = new Date().toISOString()

    // Check if user is already a participant
    const { data: existingParticipation } = await supabase
      .from('discussion_participants')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .single()

    if (existingParticipation) {
      // Update existing participation
      const { error } = await supabase
        .from('discussion_participants')
        .update({
          last_read_at: now,
        })
        .eq('thread_id', threadId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating participant read status:', error)
        return NextResponse.json<ApiResponse<never>>({
          success: false,
          error: 'Failed to mark thread as read',
          details: error.message,
        }, { status: 500 })
      }
    } else {
      // Create new participation record
      const { error } = await supabase
        .from('discussion_participants')
        .insert({
          thread_id: threadId,
          user_id: user.id,
          notification_level: 'normal',
          last_read_at: now,
          post_count: 0,
        })

      if (error) {
        console.error('Error creating participant record:', error)
        return NextResponse.json<ApiResponse<never>>({
          success: false,
          error: 'Failed to mark thread as read',
          details: error.message,
        }, { status: 500 })
      }
    }

    const response: ApiResponse<{ thread_id: string; user_id: string; last_read_at: string }> = {
      success: true,
      data: {
        thread_id: threadId,
        user_id: user.id,
        last_read_at: now,
      },
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Mark thread as read error:', error)
    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 })
  }
}
