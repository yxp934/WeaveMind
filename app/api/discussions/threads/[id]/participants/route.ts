import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type {
  ApiResponse,
  ParticipantWithUser,
  PaginationParams,
  SortParams
} from '@/types/discussion'

// Validation schemas
const getParticipantsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  sortBy: z.enum(['last_post_at', 'first_post_at', 'post_count', 'created_at']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// GET /api/discussions/threads/[id]/participants - Get thread participants
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const validatedParams = getParticipantsSchema.parse(Object.fromEntries(searchParams))

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

    // Build query for participants
    let query = supabase
      .from('discussion_participants')
      .select(`
        *,
        user:users!discussion_participants_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('thread_id', threadId)

    // Apply sorting
    const sortBy = validatedParams.sortBy || 'last_post_at'
    const sortOrder = validatedParams.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const limit = validatedParams.limit || 20
    const offset = validatedParams.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data: participants, error, count } = await query

    if (error) {
      console.error('Error fetching participants:', error)
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Failed to fetch participants',
        details: error.message,
      }, { status: 500 })
    }

    const total = count || 0
    const page = validatedParams.page || 1
    const totalPages = Math.ceil(total / limit)

    const response: ApiResponse<ParticipantWithUser[]> = {
      success: true,
      data: participants || [],
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Get participants error:', error)

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
