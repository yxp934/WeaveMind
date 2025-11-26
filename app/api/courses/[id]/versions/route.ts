import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/courses/[id]/versions
 * Get all versions of a course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this course
    const { data: course } = await supabase
      .from('courses')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (!course || course.created_by !== user.id) {
      return NextResponse.json({ error: 'Course not found or access denied' }, { status: 404 })
    }

    // Get all versions
    const { data: versions, error } = await supabase
      .from('course_versions')
      .select('id, version_number, description, created_at, created_by')
      .eq('course_id', id)
      .order('version_number', { ascending: false })

    if (error) {
      console.error('Error fetching versions:', error)
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
    }

    return NextResponse.json({ success: true, versions })
  } catch (error: any) {
    console.error('Error in GET /api/courses/[id]/versions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/courses/[id]/versions
 * Create a new version snapshot of the course
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { description } = await request.json()

    // Verify user has access to this course
    const { data: course } = await supabase
      .from('courses')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (!course || course.created_by !== user.id) {
      return NextResponse.json({ error: 'Course not found or access denied' }, { status: 404 })
    }

    // Call the database function to create snapshot
    const { data, error } = await supabase.rpc('create_course_version_snapshot', {
      p_course_id: id,
      p_created_by: user.id,
      p_description: description || null,
    })

    if (error) {
      console.error('Error creating version snapshot:', error)
      return NextResponse.json({ error: 'Failed to create version snapshot' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Version snapshot created successfully',
      versionId: data,
    })
  } catch (error: any) {
    console.error('Error in POST /api/courses/[id]/versions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

