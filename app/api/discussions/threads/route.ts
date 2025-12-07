import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type {
  CreateThreadRequest,
  ApiResponse,
  ThreadWithMeta,
  ThreadFilters,
  PaginationParams,
  SortParams
} from '@/types/discussion'

// Validation schemas
const createThreadSchema = z.object({
  class_id: z.string().uuid('Invalid class_id'),
  course_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  type: z.enum(['general', 'course', 'assignment', 'announcement']),
  is_pinned: z.boolean().optional().default(false),
  is_public: z.boolean().optional().default(true),
})

const getThreadsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  type: z.enum(['general', 'course', 'assignment', 'announcement']).optional(),
  is_pinned: z.string().optional().transform(val => val === 'true'),
  class_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  sortBy: z.enum(['last_activity_at', 'created_at', 'post_count', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// POST /api/discussions/threads - Create a new discussion thread
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Unauthorized',
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createThreadSchema.parse(body)

    // Verify user is a teacher in the class
    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', validatedData.class_id)
      .eq('user_id', user.id)
      .single()

    if (!classMember || classMember.role !== 'teacher') {
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Insufficient permissions. Only teachers can create discussion threads.',
      }, { status: 403 })
    }

    // Get class and organization info
    const { data: classData } = await supabase
      .from('classes')
      .select('organization_id')
      .eq('id', validatedData.class_id)
      .single()

    if (!classData) {
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Class not found',
      }, { status: 404 })
    }

    // Create the discussion thread
    const { data: thread, error } = await supabase
      .from('discussion_threads')
      .insert({
        class_id: validatedData.class_id,
        course_id: validatedData.course_id,
        assignment_id: validatedData.assignment_id,
        organization_id: classData.organization_id,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        is_pinned: validatedData.is_pinned,
        is_public: validatedData.is_public,
        created_by: user.id,
        last_activity_at: new Date().toISOString(),
        post_count: 0,
      })
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
      console.error('Error creating discussion thread:', error)
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Failed to create discussion thread',
        details: error.message,
      }, { status: 500 })
    }

    const response: ApiResponse<ThreadWithMeta> = {
      success: true,
      data: {
        ...thread,
        user_participation: {
          is_participant: false,
          post_count: 0,
        },
      },
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error: any) {
    console.error('Create thread error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Validation error',
        details: (error as any).errors || error.issues,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      data: null as any,
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 })
  }
}

// GET /api/discussions/threads - Get discussion threads list
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Unauthorized',
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const validatedParams = getThreadsSchema.parse(Object.fromEntries(searchParams))

    // Build query
    let query = supabase
      .from('discussion_threads')
      .select(`
        *,
        creator:users!discussion_threads_created_by_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        class_members!inner(
          user_id,
          role
        )
      `)
      .eq('is_deleted', false)

    // Apply filters
    if (validatedParams.type) {
      query = query.eq('type', validatedParams.type)
    }
    if (validatedParams.is_pinned !== undefined) {
      query = query.eq('is_pinned', validatedParams.is_pinned)
    }
    if (validatedParams.class_id) {
      query = query.eq('class_id', validatedParams.class_id)
    }
    if (validatedParams.course_id) {
      query = query.eq('course_id', validatedParams.course_id)
    }
    if (validatedParams.assignment_id) {
      query = query.eq('assignment_id', validatedParams.assignment_id)
    }

    // Apply sorting
    const sortBy = validatedParams.sortBy || 'last_activity_at'
    const sortOrder = validatedParams.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const limit = validatedParams.limit || 20
    const offset = validatedParams.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data: threads, error, count } = await query

    if (error) {
      console.error('Error fetching discussion threads:', error)
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Failed to fetch discussion threads',
        details: error.message,
      }, { status: 500 })
    }

    // Get user participation data
    const threadIds = threads?.map(t => t.id) || []
    const { data: participations } = await supabase
      .from('discussion_participants')
      .select('thread_id, last_read_at, post_count')
      .eq('user_id', user.id)
      .in('thread_id', threadIds)

    // Get user class membership for permission check
    const classIds = threads?.map(t => t.class_id) || []
    const { data: userClasses } = await supabase
      .from('class_members')
      .select('class_id, role')
      .eq('user_id', user.id)
      .in('class_id', classIds)

    // Filter threads based on user permissions and enrich with participation data
    const accessibleThreads = threads?.filter(thread => {
      const userClass = userClasses?.find(uc => uc.class_id === thread.class_id)
      return userClass && (userClass.role === 'teacher' || userClass.role === 'student')
    }).map(thread => {
      const participation = participations?.find(p => p.thread_id === thread.id)
      const userClass = userClasses?.find(uc => uc.class_id === thread.class_id)

      return {
        ...thread,
        user_participation: {
          is_participant: !!participation,
          last_read_at: participation?.last_read_at,
          post_count: participation?.post_count || 0,
        },
        _user_role: userClass?.role,
      }
    }) || []

    const total = count || 0
    const page = validatedParams.page || 1
    const totalPages = Math.ceil(total / limit)

    const response: ApiResponse<ThreadWithMeta[]> = {
      success: true,
      data: accessibleThreads,
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
    console.error('Get threads error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Validation error',
        details: (error as any).errors || error.issues,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      data: null as any,
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 })
  }
}
