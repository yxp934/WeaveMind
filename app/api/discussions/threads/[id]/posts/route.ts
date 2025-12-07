import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type {
  CreatePostRequest,
  ApiResponse,
  PostWithMeta,
  PaginationParams,
  PostFilters,
  SortParams
} from '@/types/discussion'

// Validation schemas
const createPostSchema = z.object({
  parent_post_id: z.string().uuid().optional(),
  title: z.string().max(255, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required'),
  post_type: z.enum(['text', 'markdown', 'code']).default('text'),
  attachments: z.array(z.any()).optional(),
})

const getPostsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  depth: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  user_id: z.string().uuid().optional(),
  sortBy: z.enum(['created_at', 'updated_at']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

// POST /api/discussions/threads/[id]/posts - Create a new post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params
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
    const validatedData = createPostSchema.parse(body)

    // Get the discussion thread
    const { data: thread, error: threadError } = await supabase
      .from('discussion_threads')
      .select('*')
      .eq('id', threadId)
      .eq('is_deleted', false)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Discussion thread not found',
      }, { status: 404 })
    }

    // Check if thread is locked
    if (thread.is_locked) {
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Cannot post to a locked discussion thread',
      }, { status: 403 })
    }

    // Check if user has access to this class
    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', thread.class_id)
      .eq('user_id', user.id)
      .single()

    if (!classMember) {
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Access denied',
      }, { status: 403 })
    }

    // If this is a reply, validate parent post and depth
    let depth = 0
    if (validatedData.parent_post_id) {
      const { data: parentPost } = await supabase
        .from('discussion_posts')
        .select('depth')
        .eq('id', validatedData.parent_post_id)
        .eq('thread_id', threadId)
        .eq('is_deleted', false)
        .single()

      if (!parentPost) {
        return NextResponse.json({
          success: false,
          error: 'Parent post not found',
        }, { status: 404 })
      }

      depth = parentPost.depth + 1

      if (depth > 10) {
        return NextResponse.json({
          success: false,
          error: 'Maximum reply depth (10) exceeded',
        }, { status: 400 })
      }
    } else {
      // For root posts, title is required
      if (!validatedData.title) {
        return NextResponse.json({
          success: false,
          error: 'Title is required for root posts',
        }, { status: 400 })
      }
    }

    // Create the post
    const { data: post, error } = await supabase
      .from('discussion_posts')
      .insert({
        thread_id: threadId,
        parent_post_id: validatedData.parent_post_id,
        user_id: user.id,
        title: validatedData.title,
        content: validatedData.content,
        post_type: validatedData.post_type,
        attachments: validatedData.attachments || [],
        depth,
        reply_count: 0,
        like_count: 0,
        dislike_count: 0,
        is_edited: false,
        edit_count: 0,
      })
      .select(`
        *,
        author:users!discussion_posts_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Failed to create post',
        details: error.message,
      }, { status: 500 })
    }

    // Auto-join the discussion thread if not already a participant
    const { data: existingParticipation } = await supabase
      .from('discussion_participants')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .single()

    if (!existingParticipation) {
      await supabase
        .from('discussion_participants')
        .insert({
          thread_id: threadId,
          user_id: user.id,
          notification_level: 'normal',
          post_count: 1,
          first_post_at: new Date().toISOString(),
          last_post_at: new Date().toISOString(),
        })
    }

    // Update thread activity and post count
    await supabase
      .from('discussion_threads')
      .update({
        last_activity_at: new Date().toISOString(),
        post_count: thread.post_count + 1,
      })
      .eq('id', threadId)

    const response: ApiResponse<PostWithMeta> = {
      success: true,
      data: {
        ...post,
        reactions: {
          like_count: 0,
          dislike_count: 0,
        },
      },
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error: any) {
    console.error('Create post error:', error)

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

// GET /api/discussions/threads/[id]/posts - Get posts for a thread
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params
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
    const validatedParams = getPostsSchema.parse(Object.fromEntries(searchParams))

    // Get the discussion thread
    const { data: thread } = await supabase
      .from('discussion_threads')
      .select('class_id')
      .eq('id', threadId)
      .eq('is_deleted', false)
      .single()

    if (!thread) {
      return NextResponse.json({
        success: false,
        data: null as any,
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
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Access denied',
      }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('discussion_posts')
      .select(`
        *,
        author:users!discussion_posts_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('thread_id', threadId)
      .eq('is_deleted', false)

    // Apply filters
    if (validatedParams.depth !== undefined) {
      query = query.eq('depth', validatedParams.depth)
    }
    if (validatedParams.user_id) {
      query = query.eq('user_id', validatedParams.user_id)
    }

    // Apply sorting
    const sortBy = validatedParams.sortBy || 'created_at'
    const sortOrder = validatedParams.sortOrder || 'asc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const limit = validatedParams.limit || 20
    const offset = validatedParams.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data: posts, error, count } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({
        success: false,
        data: null as any,
        error: 'Failed to fetch posts',
        details: error.message,
      }, { status: 500 })
    }

    // Get user's reactions for these posts
    const postIds = posts?.map(p => p.id) || []
    const { data: reactions } = await supabase
      .from('discussion_reactions')
      .select('post_id, reaction_type')
      .eq('user_id', user.id)
      .in('post_id', postIds)

    // Get reaction counts for all posts
    const { data: reactionCounts } = await supabase
      .from('discussion_posts')
      .select('id, like_count, dislike_count')
      .in('id', postIds)

    // Enrich posts with reaction data
    const enrichedPosts = posts?.map(post => {
      const userReaction = reactions?.find(r => r.post_id === post.id)
      const counts = reactionCounts?.find(c => c.id === post.id)

      return {
        ...post,
        reactions: {
          like_count: counts?.like_count || 0,
          dislike_count: counts?.dislike_count || 0,
          user_reaction: userReaction?.reaction_type,
        },
      }
    }) || []

    // Build tree structure for nested posts
    const buildTree = (posts: PostWithMeta[], depth = 0): PostWithMeta[] => {
      const roots = posts.filter(post => post.depth === depth)
      return roots.map(post => ({
        ...post,
        children: buildTree(posts, depth + 1)
          .filter(child => child.parent_post_id === post.id),
      }))
    }

    const treePosts = buildTree(enrichedPosts)

    const total = count || 0
    const page = validatedParams.page || 1
    const totalPages = Math.ceil(total / limit)

    const response: ApiResponse<PostWithMeta[]> = {
      success: true,
      data: treePosts,
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
    console.error('Get posts error:', error)

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
