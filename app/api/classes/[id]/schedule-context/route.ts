import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify class ownership
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, created_by')
      .eq('id', classId)
      .single()

    if (classError || !classData || classData.created_by !== user.id) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 403 })
    }

    // Fetch schedule context
    const { data: scheduleContext, error: contextError } = await supabase
      .from('schedule_generation_context')
      .select('*')
      .eq('class_id', classId)
      .single()

    if (contextError || !scheduleContext) {
      return NextResponse.json(null, { status: 200 })
    }

    return NextResponse.json(scheduleContext)

  } catch (error: any) {
    console.error('Failed to fetch schedule context:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch schedule context' },
      { status: 500 }
    )
  }
}
