import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type ThreadAccess = {
  thread: { id: string; class_id: string; is_locked: boolean } | null;
  memberRole?: string | null;
  forbidden?: boolean;
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

async function getThreadWithAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string,
  userId: string
): Promise<ThreadAccess> {
  const { data: thread, error: threadError } = await supabase
    .from('discussion_threads')
    .select('id, class_id, is_locked')
    .eq('id', threadId)
    .maybeSingle();

  if (thread) {
    const { data: membership, error: membershipError } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', thread.class_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError) {
      console.error('Error fetching class membership:', membershipError);
    }

    return {
      thread,
      memberRole: membership?.role ?? null,
      forbidden: !membership
    };
  }

  if (threadError) {
    console.error('Error fetching thread info:', threadError);
  }

  // Fallback to admin client to avoid false 404s when RLS blocks the initial fetch.
  const admin = createAdminClient();
  const { data: adminThread, error: adminThreadError } = await admin
    .from('discussion_threads')
    .select('id, class_id, is_locked')
    .eq('id', threadId)
    .maybeSingle();

  if (adminThreadError) {
    console.error('Admin fetch thread error:', adminThreadError);
  }

  if (!adminThread) {
    return { thread: null };
  }

  const { data: adminMembership, error: adminMembershipError } = await admin
    .from('class_members')
    .select('role')
    .eq('class_id', adminThread.class_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (adminMembershipError) {
    console.error('Admin fetch membership error:', adminMembershipError);
  }

  return {
    thread: adminThread,
    memberRole: adminMembership?.role ?? null,
    forbidden: !adminMembership
  };
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

    const access = await getThreadWithAccess(supabase, params.topicId, user.id);
    if (!access.thread) {
      return NextResponse.json(
        { error: access.forbidden ? 'You are not part of this class' : 'Topic not found' },
        { status: access.forbidden ? 403 : 404 }
      );
    }

    if (access.forbidden) {
      return NextResponse.json({ error: 'You are not part of this class' }, { status: 403 });
    }

    const thread = access.thread;

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

    const access = await getThreadWithAccess(supabase, params.topicId, user.id);
    if (!access.thread) {
      return NextResponse.json(
        { error: access.forbidden ? 'You are not part of this class' : 'Topic not found' },
        { status: access.forbidden ? 403 : 404 }
      );
    }

    if (access.forbidden || !access.memberRole) {
      return NextResponse.json(
        { error: 'You are not part of this class' },
        { status: 403 }
      );
    }

    if (access.thread.is_locked) {
      return NextResponse.json(
        { error: 'Topic is locked' },
        { status: 403 }
      );
    }

    const authorRole = access.memberRole === 'teacher' ? 'teacher' : 'student';

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
