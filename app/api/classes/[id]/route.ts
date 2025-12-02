import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: classData, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First verify the class exists and user owns it
    const { data: classData, error: fetchError } = await supabase
      .from('classes')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Verify ownership - only the creator can delete the class
    if (classData.created_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the class (cascade will handle related records based on DB constraints)
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete class error:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete class' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Class deleted successfully' })
  } catch (error: any) {
    console.error('Delete class error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete class' },
      { status: 500 }
    )
  }
}

