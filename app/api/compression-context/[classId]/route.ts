import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { compressionContextService } from '@/lib/compression-context'

export async function GET(
  req: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const classId = params.classId

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to the class
    const { data: classData } = await supabase
      .from('classes')
      .select('id, organization_id, created_by')
      .eq('id', classId)
      .single()

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Get compression context
    const context = await compressionContextService.getCompressionContext(classId)

    if (!context) {
      return NextResponse.json({
        context: null,
        message: 'No compression context found for this class'
      })
    }

    return NextResponse.json({ context })
  } catch (error: any) {
    console.error('Error fetching compression context:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch compression context' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const classId = params.classId
    const updates = await req.json()

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to the class
    const { data: classData } = await supabase
      .from('classes')
      .select('id, organization_id, created_by')
      .eq('id', classId)
      .single()

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Get or create compression context
    let context = await compressionContextService.getCompressionContext(classId)

    if (!context) {
      context = await compressionContextService.createInitialContext(
        classId,
        classData.organization_id
      )
    }

    if (!context) {
      return NextResponse.json(
        { error: 'Failed to create compression context' },
        { status: 500 }
      )
    }

    // Update context
    const updatedContext = await compressionContextService.updateContext(
      context.id!,
      updates
    )

    return NextResponse.json({
      context: updatedContext,
      message: 'Compression context updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating compression context:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update compression context' },
      { status: 500 }
    )
  }
}
