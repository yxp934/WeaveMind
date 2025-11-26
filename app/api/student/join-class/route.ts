import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { code } = await req.json().catch(() => ({ code: '' }))
    const joinCode = (code || '').trim()

    if (!joinCode || joinCode.length < 6 || joinCode.length > 16) {
      return NextResponse.json({ error: 'Invalid join code.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Enforce that only student accounts can join classes via code
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Only student accounts can join classes.' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Look up class by join_code (case-sensitive hex string by design)
    const { data: klass, error: classError } = await admin
      .from('classes')
      .select('id, name, organization_id, join_code, organizations ( name )')
      .eq('join_code', joinCode)
      .single()

    if (classError || !klass) {
      return NextResponse.json({ error: 'Invalid or expired join code.' }, { status: 400 })
    }

    // Idempotent: if the user is already a member, just return success
    const { data: existingMembership } = await admin
      .from('class_members')
      .select('id, role')
      .eq('class_id', klass.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingMembership) {
      const { error: insertMemberError } = await admin
        .from('class_members')
        .insert({
          class_id: klass.id,
          user_id: user.id,
          role: 'student',
        })

      if (insertMemberError) {
        console.error('Failed to add class_members row via join code:', insertMemberError)
        return NextResponse.json({ error: 'Failed to join class.' }, { status: 500 })
      }
    }

    // Ensure the user is an organization member as a student so they can see org-scoped data
    const { data: existingOrgMember } = await admin
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', klass.organization_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingOrgMember) {
      const { error: insertOrgError } = await admin
        .from('organization_members')
        .insert({
          organization_id: klass.organization_id,
          user_id: user.id,
          role: 'student',
        })

      if (insertOrgError) {
        console.error('Failed to add organization_members row via join code:', insertOrgError)
        // Do not leak org details; surface generic error
        return NextResponse.json({ error: 'Failed to join class.' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      class: {
        id: klass.id,
        name: klass.name,
        organizationName: (klass as any).organizations?.name ?? null,
      },
    })
  } catch (error: any) {
    console.error('Error in /api/student/join-class:', error)
    return NextResponse.json(
      { error: 'Failed to join class.' },
      { status: 500 },
    )
  }
}
