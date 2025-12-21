import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function fetchLikeCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string
) {
  const { data, error } = await supabase
    .from('discussion_posts')
    .select('like_count')
    .eq('id', postId)
    .single();

  if (error) {
    console.error('Error fetching like count:', error);
    return 0;
  }

  return data?.like_count || 0;
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const targetId = searchParams.get('targetId');

    if (!targetId) {
      return NextResponse.json(
        { error: 'targetId parameter is required' },
        { status: 400 }
      );
    }

    // Check if user has liked this item
    const { data: existingLike, error: likeError } = await supabase
      .from('discussion_reactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', targetId)
      .eq('reaction_type', 'like')
      .maybeSingle();

    if (likeError) {
      console.error('Error checking like status:', likeError);
      return NextResponse.json(
        { error: 'Failed to check like status' },
        { status: 500 }
      );
    }

    const likeCount = await fetchLikeCount(supabase, targetId);

    return NextResponse.json({
      liked: !!existingLike,
      likeId: existingLike?.id || null,
      like_count: likeCount
    });
  } catch (error) {
    console.error('Error in GET /api/discussions/likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { targetId, action } = body;

    if (!targetId || !action) {
      return NextResponse.json(
        { error: 'targetId and action are required' },
        { status: 400 }
      );
    }

    if (!['like', 'unlike'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "like" or "unlike"' },
        { status: 400 }
      );
    }

    if (action === 'like') {
      // Try to create a like
      const { error: likeError } = await supabase
        .from('discussion_reactions')
        .insert({
          user_id: user.id,
          post_id: targetId,
          reaction_type: 'like'
        });

      if (likeError && !likeError.message.includes('duplicate key')) {
        console.error('Error creating like:', likeError);
        return NextResponse.json(
          { error: 'Failed to create like' },
          { status: 500 }
        );
      }
    } else {
      // Unlike - delete the like
      const { error: unlikeError } = await supabase
        .from('discussion_reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', targetId)
        .eq('reaction_type', 'like');

      if (unlikeError) {
        console.error('Error deleting like:', unlikeError);
        return NextResponse.json(
          { error: 'Failed to delete like' },
          { status: 500 }
        );
      }
    }

    const likeCount = await fetchLikeCount(supabase, targetId);

    return NextResponse.json({
      liked: action === 'like',
      like_count: likeCount
    });
  } catch (error) {
    console.error('Error in POST /api/discussions/likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
