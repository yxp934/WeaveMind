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

async function getThread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string
) {
  const { data: thread, error } = await supabase
    .from('discussion_threads')
    .select('id, class_id, is_locked')
    .eq('id', threadId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching thread info:', error);
  }

  return thread;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thread = await getThread(supabase, params.topicId);
    if (!thread) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const { data: posts, error } = await supabase
      .from('discussion_posts')
      .select('id, title, content, user_id, created_at, like_count, reply_count, is_deleted')
      .eq('thread_id', params.topicId)
      .is('parent_post_id', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discussions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch discussions' },
        { status: 500 }
      );
    }

    const authorIds = (posts || []).map((post) => post.user_id);
    const profileMap = await fetchProfiles(supabase, authorIds);
    const { data: classMembers } = authorIds.length > 0 ? await supabase
      .from('class_members')
      .select('user_id, role')
      .eq('class_id', thread.class_id)
      .in('user_id', authorIds) : { data: [] };

    const roleMap = (classMembers || []).reduce<Record<string, string>>((acc, member) => {
      acc[member.user_id] = member.role;
      return acc;
    }, {});

    // Fetch comment counts to avoid stale reply_count caused by deletes
    const { data: commentCounts } = await supabase
      .from('discussion_posts')
      .select('parent_post_id, count:count()')
      .eq('thread_id', params.topicId)
      .not('parent_post_id', 'is', null)
      .eq('is_deleted', false)
      .group('parent_post_id');

    const commentCountMap = (commentCounts || []).reduce<Record<string, number>>((acc, row: any) => {
      acc[row.parent_post_id] = row.count as number;
      return acc;
    }, {});

    const discussions = (posts || []).map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      author_id: post.user_id,
      author_role: roleMap[post.user_id] === 'teacher' ? 'teacher' : 'student',
      created_at: post.created_at,
      like_count: post.like_count || 0,
      comment_count: commentCountMap[post.id] ?? post.reply_count ?? 0,
      profiles: profileMap[post.user_id] || null
    }));

    return NextResponse.json({ discussions });
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

    const thread = await getThread(supabase, params.topicId);
    if (!thread) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    if (thread.is_locked) {
      return NextResponse.json(
        { error: 'Topic is locked' },
        { status: 403 }
      );
    }

    // Validate class membership
    const { data: classMember, error: memberError } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', thread.class_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !classMember) {
      return NextResponse.json(
        { error: 'You are not part of this class' },
        { status: 403 }
      );
    }

    const authorRole = classMember.role === 'teacher' ? 'teacher' : 'student';

    // Create the discussion (root post)
    const { data: post, error: createError } = await supabase
      .from('discussion_posts')
      .insert({
        thread_id: params.topicId,
        title,
        content,
        user_id: user.id,
        depth: 0
      })
      .select('id, title, content, user_id, created_at, like_count, reply_count')
      .single();

    if (createError) {
      console.error('Error creating discussion:', createError);
      return NextResponse.json(
        { error: 'Failed to create discussion' },
        { status: 500 }
      );
    }

    const profileMap = await fetchProfiles(supabase, [user.id]);

    return NextResponse.json({
      discussion: {
        id: post.id,
        title: post.title,
        content: post.content,
        author_id: post.user_id,
        author_role: authorRole,
        created_at: post.created_at,
        like_count: post.like_count || 0,
        comment_count: post.reply_count || 0,
        profiles: profileMap[user.id] || null
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/discussions/topics/[topicId]/discussions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
