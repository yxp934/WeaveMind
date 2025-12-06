import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type {
  UpdateThreadRequest,
  ApiResponse,
  ThreadWithMeta
} from '@/types/discussion'

// Validation schemas
const updateThreadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().optional(),
  is_pinned: z.boolean().optional(),
  is_locked: z.boolean().optional(),
  is_public: z.boolean().optional(),
})

// GET /api/discussions/threads/[id] - Get specific discussion thread
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 })
    }

    // Get the discussion thread
    const { data: thread, error } = await supabase
      .from('discussion_threads')
      .select(`
        *,
        creator:users!discussion_threads_created_by_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        classes!inner(
          id,
          organization_id
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error || !thread) {
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

    // Get user participation data
    const { data: participation } = await supabase
      .from('discussion_participants')
      .select('last_read_at, post_count')
      .eq('thread_id', id)
      .eq('user_id', user.id)
      .single()

    const response: ApiResponse<ThreadWithMeta> = {
      success: true,
      data: {
        ...thread,
        user_participation: {
          is_participant: !!participation,
          last_read_at: participation?.last_read_at,
          post_count: participation?.post_count || 0,
        },
      },
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Get thread error:', error)
    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 })
  }
}

// PUT /api/discussions/threads/[id] - Update discussion thread
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateThreadSchema.parse(body)

    // Get the discussion thread
    const { data: thread, error: fetchError } = await supabase
      .from('discussion_threads')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !thread) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Discussion thread not found',
      }, { status: 404 })
    }

    // Check permissions - only creator or teacher can update
    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', thread.class_id)
      .eq('user_id', user.id)
      .single()

    if (!classMember || (classMember.role !== 'teacher' && thread.created_by !== user.id)) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Insufficient permissions. Only the creator or teachers can update this thread.',
      }, { status: 403 })
    }

    // Update the thread
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    }

    const { data: updatedThread, error } = await supabase
      .from('discussion_threads')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:users!discussion_threads_created_by_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error updating discussion thread:', error)
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Failed to update discussion thread',
        details: error.message,
      }, { status: 500 })
    }

    // Get user participation data
    const { data: participation } = await supabase
      .from('discussion_participants')
      .select('last_read_at, post_count')
      .eq('thread_id', id)
      .eq('user_id', user.id)
      .single()

    const response: ApiResponse<ThreadWithMeta> = {
      success: true,
      data: {
        ...updatedThread,
        user_participation: {
          is_participant: !!participation,
          last_read_at: participation?.last_read_at,
          post_count: participation?.post_count || 0,
        },
      },
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Update thread error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 })
  }
}

// DELETE /api/discussions/threads/[id] - Delete discussion thread
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 })
    }

    // Get the discussion thread
    const { data: thread, error: fetchError } = await supabase
      .from('discussion_threads')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !thread) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Discussion thread not found',
      }, { status: 404 })
    }

    // Check permissions - only creator or teacher can delete
    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', thread.class_id)
      .eq('user_id', user.id)
      .single()

    if (!classMember || (classMember.role !== 'teacher' && thread.created_by !== user.id)) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Insufficient permissions. Only the creator or teachers can delete this thread.',
      }, { status: 403 })
    }

    // Soft delete the thread
    const { error } = await supabase
      .from('discussion_threads')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting discussion thread:', error)
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Failed to delete discussion thread',
        details: error.message,
      }, { status: 500 })
    }

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Delete thread error:', error)
    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 })
  }
}
