import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

async function fetchProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Record<string, Profile>> {
  if (userIds.length === 0) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .in('id', userIds);

  if (error) {
    console.error('Error fetching profiles:', error);
    return {};
  }

  return (data || []).reduce<Record<string, Profile>>((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});
}

async function getDiscussionWithThread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  discussionId: string
) {
  const { data, error } = await supabase
    .from('discussion_posts')
    .select('id, thread_id, user_id, is_deleted')
    .eq('id', discussionId)
    .is('parent_post_id', null)
    .maybeSingle();

  if (error) {
    console.error('Error fetching discussion:', error);
  }

  return data;
}

function isValidUUID(value: string | undefined) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { discussionId: string } }
) {
  try {
    const discussionId =
      params?.discussionId || request.nextUrl.pathname.split('/')?.[3];

    if (!isValidUUID(discussionId)) {
      console.error('Invalid discussionId for comments GET', {
        discussionId,
        pathname: request.nextUrl.pathname
      });
      return NextResponse.json({ error: 'discussionId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parentPost = await getDiscussionWithThread(supabase, discussionId);
    if (!parentPost || parentPost.is_deleted) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }

    const { data: comments, error } = await supabase
      .from('discussion_posts')
      .select('id, content, user_id, created_at, like_count, is_deleted')
      .eq('thread_id', parentPost.thread_id)
      .eq('parent_post_id', discussionId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    const authorIds = (comments || []).map((comment) => comment.user_id);
    const profileMap = await fetchProfiles(supabase, authorIds);

    const { data: thread } = await supabase
      .from('discussion_threads')
      .select('class_id')
      .eq('id', parentPost.thread_id)
      .maybeSingle();

    if (!thread) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const { data: classMembers } = authorIds.length > 0 ? await supabase
      .from('class_members')
      .select('user_id, role')
      .eq('class_id', thread.class_id)
      .in('user_id', authorIds) : { data: [] };

    const roleMap = (classMembers || []).reduce<Record<string, string>>((acc, member) => {
      acc[member.user_id] = member.role;
      return acc;
    }, {});

    const commentsWithRole = (comments || []).map((comment) => {
      const profile = profileMap[comment.user_id];
      const authorRole = roleMap[comment.user_id] === 'teacher' ? 'teacher' : 'student';
      return {
        id: comment.id,
        content: comment.content,
        author_id: comment.user_id,
        author_role: authorRole,
        created_at: comment.created_at,
        like_count: comment.like_count || 0,
        profiles: profile || null
      };
    });

    return NextResponse.json({ comments: commentsWithRole });
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
    const discussionId =
      params?.discussionId || request.nextUrl.pathname.split('/')?.[3];

    if (!isValidUUID(discussionId)) {
      console.error('Invalid discussionId for comments POST', {
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

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    const parentPost = await getDiscussionWithThread(supabase, discussionId);
    if (!parentPost || parentPost.is_deleted) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }

    const { data: thread } = await supabase
      .from('discussion_threads')
      .select('class_id, is_locked')
      .eq('id', parentPost.thread_id)
      .maybeSingle();

    if (!thread) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    if (thread.is_locked) {
      return NextResponse.json({ error: 'Topic is locked' }, { status: 403 });
    }

    const { data: classMember, error: memberError } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', thread.class_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !classMember) {
      return NextResponse.json(
        { error: 'You are not part of this class' },
        { status: 403 }
      );
    }

    const authorRole = classMember.role === 'teacher' ? 'teacher' : 'student';

    // Create the comment
    const { data: comment, error: createError } = await supabase
      .from('discussion_posts')
      .insert({
        thread_id: parentPost.thread_id,
        parent_post_id: discussionId,
        content,
        user_id: user.id,
        depth: 1
      })
      .select('id, content, user_id, created_at, like_count')
      .single();

    if (createError) {
      console.error('Error creating comment:', createError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    const profileMap = await fetchProfiles(supabase, [user.id]);

    return NextResponse.json({
      comment: {
        id: comment.id,
        content: comment.content,
        author_id: comment.user_id,
        author_role: authorRole,
        created_at: comment.created_at,
        like_count: comment.like_count || 0,
        profiles: profileMap[user.id] || null
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/discussions/[discussionId]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
