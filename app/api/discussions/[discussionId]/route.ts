import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { discussionId: string } }
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

    // Check if the discussion exists and belongs to the user
    const { data: discussion, error: fetchError } = await supabase
      .from('discussions')
      .select('author_id')
      .eq('id', params.discussionId)
      .single();

    if (fetchError || !discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    if (discussion.author_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own discussions' },
        { status: 403 }
      );
    }

    // Delete the discussion (RLS policies will handle authorization)
    const { error: deleteError } = await supabase
      .from('discussions')
      .delete()
      .eq('id', params.discussionId);

    if (deleteError) {
      console.error('Error deleting discussion:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete discussion' },
        { status: 500 }
      );
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