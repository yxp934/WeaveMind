import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function recalcParentReplyCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentPostId: string
) {
  const { count } = await supabase
    .from('discussion_posts')
    .select('*', { count: 'exact', head: true })
    .eq('parent_post_id', parentPostId)
    .eq('is_deleted', false);

  await supabase
    .from('discussion_posts')
    .update({ reply_count: count || 0 })
    .eq('id', parentPostId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the comment exists and belongs to the user
    const { data: comment, error: fetchError } = await supabase
      .from('discussion_posts')
      .select('user_id, parent_post_id, thread_id')
      .eq('id', params.commentId)
      .maybeSingle();

    if (fetchError || !comment || !comment.parent_post_id) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete the comment (RLS policies will handle authorization)
    const { error: deleteError } = await supabase
      .from('discussion_posts')
      .delete()
      .eq('id', params.commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    await recalcParentReplyCount(supabase, comment.parent_post_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/discussions/comments/[commentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
