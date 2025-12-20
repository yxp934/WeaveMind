import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: 'targetType and targetId parameters are required' },
        { status: 400 }
      );
    }

    // Check if user has liked this item
    const { data: existingLike, error: likeError } = await supabase
      .from('discussion_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();

    if (likeError) {
      console.error('Error checking like status:', likeError);
      return NextResponse.json(
        { error: 'Failed to check like status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      liked: !!existingLike,
      likeId: existingLike?.id || null
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
    const { targetType, targetId, action } = body;

    if (!targetType || !targetId || !action) {
      return NextResponse.json(
        { error: 'targetType, targetId, and action are required' },
        { status: 400 }
      );
    }

    if (!['like', 'unlike'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "like" or "unlike"' },
        { status: 400 }
      );
    }

    if (!['discussion', 'comment'].includes(targetType)) {
      return NextResponse.json(
        { error: 'targetType must be "discussion" or "comment"' },
        { status: 400 }
      );
    }

    if (action === 'like') {
      // Try to create a like
      const { data: like, error: likeError } = await supabase
        .from('discussion_likes')
        .insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId
        })
        .select('id')
        .single();

      // If like already exists (error), that's fine - user already liked it
      if (likeError && !likeError.message.includes('duplicate key')) {
        console.error('Error creating like:', likeError);
        return NextResponse.json(
          { error: 'Failed to create like' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        liked: true,
        likeId: like?.id || null
      });
    } else {
      // Unlike - delete the like
      const { error: unlikeError } = await supabase
        .from('discussion_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (unlikeError) {
        console.error('Error deleting like:', unlikeError);
        return NextResponse.json(
          { error: 'Failed to delete like' },
          { status: 500 }
        );
      }

      return NextResponse.json({ liked: false });
    }
  } catch (error) {
    console.error('Error in POST /api/discussions/likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}