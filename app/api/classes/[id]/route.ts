import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: classData, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Verify ownership
    if (classData.created_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(classData)
  } catch (error: any) {
    console.error('Get class error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get class' },
      { status: 500 }
    )
  }
}

