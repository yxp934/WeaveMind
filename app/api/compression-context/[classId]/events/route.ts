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
        events: [],
        message: 'No compression context found for this class'
      })
    }

    // Get context with all extraction events
    const { events } = await compressionContextService.getContextWithEvents(context.id!)

    return NextResponse.json({ events })
  } catch (error: any) {
    console.error('Error fetching extraction events:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch extraction events' },
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
    const {
      extraction_type,
      source_type,
      source_id,
      extracted_content,
      metadata
    } = await req.json()

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    if (!extraction_type || !source_type || !extracted_content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
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

    // Add extraction event
    const event = await compressionContextService.addExtractionEvent(context.id!, {
      extraction_type,
      source_type,
      source_id,
      extracted_content,
      metadata
    })

    return NextResponse.json({
      event,
      message: 'Extraction event added successfully'
    })
  } catch (error: any) {
    console.error('Error adding extraction event:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add extraction event' },
      { status: 500 }
    )
  }
}
