import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: discussions, error } = await supabase
      .from('discussions')
      .select(`
        id,
        title,
        content,
        author_id,
        author_role,
        created_at,
        updated_at,
        profiles:author_id(full_name),
        discussion_likes(count),
        discussion_comments(count)
      `)
      .eq('topic_id', params.topicId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discussions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch discussions' },
        { status: 500 }
      );
    }

    // Get like counts for each discussion
    const discussionsWithLikes = await Promise.all(
      discussions.map(async (discussion) => {
        const { count: likeCount } = await supabase
          .from('discussion_likes')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'discussion')
          .eq('target_id', discussion.id);

        return {
          ...discussion,
          like_count: likeCount || 0
        };
      })
    );

    return NextResponse.json({ discussions: discussionsWithLikes });
  } catch (error) {
    console.error('Error in GET /api/discussions/topics/[topicId]/discussions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { topicId: string } }
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

    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      );
    }

    // Get user's role from organization_members
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'User not found in organization' },
        { status: 403 }
      );
    }

    const userRole = memberData.role === 'teacher' ? 'teacher' : 'student';

    // Create the discussion
    const { data: discussion, error: createError } = await supabase
      .from('discussions')
      .insert({
        topic_id: params.topicId,
        title,
        content,
        author_id: user.id,
        author_role: userRole
      })
      .select(`
        id,
        title,
        content,
        author_id,
        author_role,
        created_at,
        updated_at,
        profiles:author_id(full_name)
      `)
      .single();

    if (createError) {
      console.error('Error creating discussion:', createError);
      return NextResponse.json(
        { error: 'Failed to create discussion' },
        { status: 500 }
      );
    }

    return NextResponse.json({ discussion }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/discussions/topics/[topicId]/discussions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}