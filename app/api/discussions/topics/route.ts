import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: topics, error } = await supabase
      .from('discussion_topics')
      .select(`
        id,
        name,
        created_by,
        created_at,
        updated_at,
        profiles:created_by(full_name)
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discussion topics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch discussion topics' },
        { status: 500 }
      );
    }

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

    // Verify user is a teacher in the organization
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select(`
        organization_id,
        organization_members!inner(role)
      `)
      .eq('id', classId)
      .eq('organization_members.user_id', user.id)
      .eq('organization_members.role', 'teacher')
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Only teachers can create discussion topics' },
        { status: 403 }
      );
    }

    // Create the topic
    const { data: topic, error: createError } = await supabase
      .from('discussion_topics')
      .insert({
        name,
        class_id: classId,
        created_by: user.id
      })
      .select(`
        id,
        name,
        created_by,
        created_at,
        updated_at,
        profiles:created_by(full_name)
      `)
      .single();

    if (createError) {
      console.error('Error creating discussion topic:', createError);
      return NextResponse.json(
        { error: 'Failed to create discussion topic' },
        { status: 500 }
      );
    }

    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/discussions/topics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}