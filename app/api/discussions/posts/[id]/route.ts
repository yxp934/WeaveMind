import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type {
  UpdatePostRequest,
  ApiResponse,
  PostWithMeta
} from '@/types/discussion'

// Validation schemas
const updatePostSchema = z.object({
  content: z.string().min(1, 'Content is required').optional(),
  post_type: z.enum(['text', 'markdown', 'code']).optional(),
  attachments: z.array(z.any()).optional(),
})

// PUT /api/discussions/posts/[id] - Update a post
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
    const validatedData = updatePostSchema.parse(body)

    // Get the post
    const { data: post, error: fetchError } = await supabase
      .from('discussion_posts')
      .select(`
        *,
        thread:discussion_threads!discussion_posts_thread_id_fkey(
          id,
          class_id,
          is_locked
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !post) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Post not found',
      }, { status: 404 })
    }

    // Check if thread is locked
    if (post.thread.is_locked) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Cannot edit posts in a locked discussion thread',
      }, { status: 403 })
    }

    // Check permissions - only the author can edit their post
    if (post.user_id !== user.id) {
      // Also allow teachers to edit posts
      const { data: classMember } = await supabase
        .from('class_members')
        .select('role')
        .eq('class_id', post.thread.class_id)
        .eq('user_id', user.id)
        .single()

      if (!classMember || classMember.role !== 'teacher') {
        return NextResponse.json<ApiResponse<never>>({
          success: false,
          error: 'Insufficient permissions. Only the author or teachers can edit this post.',
        }, { status: 403 })
      }
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      is_edited: true,
      edit_count: post.edit_count + 1,
      updated_at: new Date().toISOString(),
    }

    // Update the post
    const { data: updatedPost, error } = await supabase
      .from('discussion_posts')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating post:', error)
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Failed to update post',
        details: error.message,
      }, { status: 500 })
    }

    // Get reaction counts
    const { data: reactionCounts } = await supabase
      .from('discussion_posts')
      .select('like_count, dislike_count')
      .eq('id', id)
      .single()

    // Get user's current reaction
    const { data: userReaction } = await supabase
      .from('discussion_reactions')
      .select('reaction_type')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .single()

    const response: ApiResponse<PostWithMeta> = {
      success: true,
      data: {
        ...updatedPost,
        reactions: {
          like_count: reactionCounts?.like_count || 0,
          dislike_count: reactionCounts?.dislike_count || 0,
          user_reaction: userReaction?.reaction_type,
        },
      },
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Update post error:', error)

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

// DELETE /api/discussions/posts/[id] - Delete a post
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

    // Get the post
    const { data: post, error: fetchError } = await supabase
      .from('discussion_posts')
      .select(`
        *,
        thread:discussion_threads!discussion_posts_thread_id_fkey(
          id,
          class_id,
          is_locked,
          created_by,
          post_count
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !post) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Post not found',
      }, { status: 404 })
    }

    // Check permissions - only the author or teachers can delete
    const isAuthor = post.user_id === user.id
    const { data: classMember } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', post.thread.class_id)
      .eq('user_id', user.id)
      .single()

    const isTeacher = classMember?.role === 'teacher'
    const isThreadCreator = post.thread.created_by === user.id

    if (!isAuthor && !isTeacher && !isThreadCreator) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Insufficient permissions. Only the author, teachers, or thread creator can delete this post.',
      }, { status: 403 })
    }

    // Check if post has replies
    const { count: replyCount } = await supabase
      .from('discussion_posts')
      .select('*', { count: 'exact', head: true })
      .eq('parent_post_id', id)
      .eq('is_deleted', false)

    if (replyCount && replyCount > 0) {
      // If post has replies, just mark as deleted instead of hard delete
      // to maintain the thread structure
      const { error } = await supabase
        .from('discussion_posts')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
          content: '[This post has been deleted]',
          title: '[Deleted]',
        })
        .eq('id', id)

      if (error) {
        console.error('Error soft deleting post:', error)
        return NextResponse.json<ApiResponse<never>>({
          success: false,
          error: 'Failed to delete post',
          details: error.message,
        }, { status: 500 })
      }
    } else {
      // If no replies, we can do a hard delete
      const { error } = await supabase
        .from('discussion_posts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting post:', error)
        return NextResponse.json<ApiResponse<never>>({
          success: false,
          error: 'Failed to delete post',
          details: error.message,
        }, { status: 500 })
      }

      // Update parent post reply count if this was a reply
      if (post.parent_post_id) {
        await supabase
          .rpc('decrement_post_reply_count', {
            post_id: post.parent_post_id
          })
      }
    }

    // Update thread post count
    await supabase
      .from('discussion_threads')
      .update({
        post_count: Math.max(0, post.thread.post_count - 1),
      })
      .eq('id', post.thread_id)

    // Update participant post count if user is the author
    if (isAuthor) {
      await supabase
        .from('discussion_participants')
        .update({
          post_count: Math.max(0, (post.user_participation?.post_count || 1) - 1),
        })
        .eq('thread_id', post.thread_id)
        .eq('user_id', user.id)
    }

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Delete post error:', error)
    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 })
  }
}
