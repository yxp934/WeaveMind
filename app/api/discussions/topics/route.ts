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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json(
        { error: 'classId parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: threads, error } = await supabase
      .from('discussion_threads')
      .select('id, title, description, created_by, created_at, class_id')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discussion topics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch discussion topics' },
        { status: 500 }
      );
    }

    const profileMap = await fetchProfiles(
      supabase,
      (threads || []).map((thread) => thread.created_by)
    );

    const topics = (threads || []).map((thread) => ({
      ...thread,
      name: thread.title,
      profiles: profileMap[thread.created_by] || null
    }));

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Error in GET /api/discussions/topics:', error);
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
    const { name, classId } = body;

    if (!name || !classId) {
      return NextResponse.json(
        { error: 'name and classId are required' },
        { status: 400 }
      );
    }

    // Verify user is a teacher for the class
    const { data: classMember, error: memberError } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !classMember || classMember.role !== 'teacher') {
      console.error('Class member check error:', memberError);
      return NextResponse.json(
        { error: 'Only teachers can create discussion topics' },
        { status: 403 }
      );
    }

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('organization_id')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Create the topic (discussion thread)
    const { data: thread, error: createError } = await supabase
      .from('discussion_threads')
      .insert({
        title: name,
        description: name,
        class_id: classId,
        organization_id: classData.organization_id,
        type: 'general',
        created_by: user.id
      })
      .select('id, title, description, created_by, created_at, class_id')
      .single();

    if (createError) {
      console.error('Error creating discussion topic:', createError);
      return NextResponse.json(
        { error: 'Failed to create discussion topic: ' + createError.message },
        { status: 500 }
      );
    }

    const profileMap = await fetchProfiles(supabase, [user.id]);

    return NextResponse.json({
      topic: {
        ...thread,
        name: thread.title,
        profiles: profileMap[user.id] || null
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/discussions/topics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
