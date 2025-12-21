import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function recalcThreadCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string
) {
  const { count } = await supabase
    .from('discussion_posts')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', threadId)
    .is('parent_post_id', null)
    .eq('is_deleted', false);

  await supabase
    .from('discussion_threads')
    .update({ post_count: count || 0 })
    .eq('id', threadId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { discussionId: string } }
) {
  try {
    const discussionId =
      params?.discussionId || request.nextUrl.pathname.split('/')?.[3];

    if (!discussionId || discussionId === 'undefined') {
      console.error('Invalid discussionId for DELETE', {
        discussionId,
        pathname: request.nextUrl.pathname
      });
      return NextResponse.json({ error: 'discussionId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the discussion exists and belongs to the user
    const { data: discussion, error: fetchError } = await supabase
      .from('discussion_posts')
      .select('user_id, thread_id')
      .eq('id', discussionId)
      .is('parent_post_id', null)
      .maybeSingle();

    if (fetchError || !discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    if (discussion.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own discussions' },
        { status: 403 }
      );
    }

    // Delete the discussion (RLS policies will handle authorization and cascade replies)
    const { error: deleteError } = await supabase
      .from('discussion_posts')
      .delete()
      .eq('id', discussionId);

    if (deleteError) {
      console.error('Error deleting discussion:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete discussion' },
        { status: 500 }
      );
    }

    if (discussion.thread_id) {
      await recalcThreadCounts(supabase, discussion.thread_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/discussions/[discussionId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
