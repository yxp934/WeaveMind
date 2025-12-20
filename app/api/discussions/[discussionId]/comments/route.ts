import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { discussionId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: comments, error } = await supabase
      .from('discussion_comments')
      .select(`
        id,
        content,
        author_id,
        author_role,
        created_at,
        updated_at,
        profiles:author_id(full_name),
        discussion_likes(count)
      `)
      .eq('discussion_id', params.discussionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // Get like counts for each comment
    const commentsWithLikes = await Promise.all(
      comments.map(async (comment) => {
        const { count: likeCount } = await supabase
          .from('discussion_likes')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'comment')
          .eq('target_id', comment.id);

        return {
          ...comment,
          like_count: likeCount || 0
        };
      })
    );

    return NextResponse.json({ comments: commentsWithLikes });
  } catch (error) {
    console.error('Error in GET /api/discussions/[discussionId]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
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

    // Create the comment
    const { data: comment, error: createError } = await supabase
      .from('discussion_comments')
      .insert({
        discussion_id: params.discussionId,
        content,
        author_id: user.id,
        author_role: userRole
      })
      .select(`
        id,
        content,
        author_id,
        author_role,
        created_at,
        updated_at,
        profiles:author_id(full_name)
      `)
      .single();

    if (createError) {
      console.error('Error creating comment:', createError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/discussions/[discussionId]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}