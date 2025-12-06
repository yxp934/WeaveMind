import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { compressionContextService } from '@/lib/compression-context'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params

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
      return NextResponse.json(
        { error: 'No compression context found for this class' },
        { status: 404 }
      )
    }

    // Refine context
    const refinedContext = await compressionContextService.refineContext(context.id!)

    return NextResponse.json({
      context: refinedContext,
      message: 'Compression context refined successfully'
    })
  } catch (error: any) {
    console.error('Error refining compression context:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refine compression context' },
      { status: 500 }
    )
  }
}
