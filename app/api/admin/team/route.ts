import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerClient } from '@/lib/supabase/server'

const createMemberSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid mobile number in international format.'),
  password: z.string().min(6).max(72),
  role: z.enum(['staff', 'user']),
  permissions: z.array(z.string().min(2).max(80)).max(50).default([]),
})

const updateMemberSchema = z.object({
  profileId: z.string().uuid(),
  action: z.enum(['activate', 'deactivate', 'name', 'role', 'permissions']),
  fullName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['staff', 'user']).optional(),
  permissions: z.array(z.string().min(2).max(80)).max(50).optional(),
})

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sgymvcjvbmtgodzinxdz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_GIYTy0RkTg24mMx4PmswCw_e1n8fVEh'
const TEAM_CREATE_FUNCTION = `${SUPABASE_URL}/functions/v1/admin-create-member`
const TEAM_DELETE_FUNCTION = `${SUPABASE_URL}/functions/v1/admin-delete-member`

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim()
    if (message) return message
  }
  return fallback
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required.', status: 401 as const }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, business_id, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile || profile.role !== 'admin' || !profile.is_active || !profile.business_id) {
    return { error: 'Admin access required.', status: 403 as const }
  }

  return { user, profile, supabase }
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('id, full_name, phone, role, is_active, created_at, updated_at')
    .eq('business_id', auth.profile.business_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const members = data ?? []
  const profileIds = members.filter((member) => member.role !== 'admin').map((member) => member.id)
  let permissionCodesByProfile: Record<string, string[]> = {}

  if (profileIds.length > 0) {
    const { data: grants, error: grantsError } = await auth.supabase
      .from('profile_permissions')
      .select('profile_id, permissions(code)')
      .in('profile_id', profileIds)

    if (grantsError) return NextResponse.json({ error: grantsError.message }, { status: 500 })

    permissionCodesByProfile = (grants ?? []).reduce<Record<string, string[]>>((result, grant) => {
      const permission = Array.isArray(grant.permissions) ? grant.permissions[0] : grant.permissions
      const code = permission?.code
      if (typeof code === 'string') result[grant.profile_id] = [...(result[grant.profile_id] ?? []), code]
      return result
    }, {})
  }

  return NextResponse.json({
    members: members.map((member) => ({
      ...member,
      permission_codes: permissionCodesByProfile[member.id] ?? [],
    })),
  })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const parsed = createMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 })
  }

  try {
    const { data: { session } } = await auth.supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'Your admin session has expired. Please sign in again.' }, { status: 401 })
    }

    const response = await fetch(TEAM_CREATE_FUNCTION, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { error: typeof data?.error === 'string' ? data.error : 'Unable to create account. Please try again.' },
        { status: response.status },
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('team member creation proxy failed', error)
    return NextResponse.json({ error: errorMessage(error, 'Unable to create account. Please try again.') }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const parsed = updateMemberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 })

  const { profileId, action, role, fullName, permissions = [] } = parsed.data
  if (profileId === auth.user.id) return NextResponse.json({ error: 'You cannot change your own admin account here.' }, { status: 400 })

  const { data: target, error: targetError } = await auth.supabase
    .from('profiles')
    .select('id, business_id, role, is_active, full_name, party_id')
    .eq('id', profileId)
    .eq('business_id', auth.profile.business_id)
    .maybeSingle()

  if (targetError || !target) return NextResponse.json({ error: 'Team member not found.' }, { status: 404 })
  if (target.role === 'admin') return NextResponse.json({ error: 'The primary admin account cannot be changed here.' }, { status: 400 })

  if (action === 'name') {
    if (!fullName) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    const { error: profileError } = await auth.supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profileId)
      .eq('business_id', auth.profile.business_id)
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    if (target.party_id) {
      const { error: partyError } = await auth.supabase
        .from('parties')
        .update({ name: fullName })
        .eq('id', target.party_id)
        .eq('business_id', auth.profile.business_id)
      if (partyError) return NextResponse.json({ error: partyError.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Account name updated.' })
  }

  if (action === 'permissions') {
    const { data: permissionRows, error: permissionError } = await auth.supabase
      .from('permissions')
      .select('id, code')
      .in('code', permissions)

    if (permissionError) return NextResponse.json({ error: permissionError.message }, { status: 500 })

    const validCodes = new Set((permissionRows ?? []).map((permission) => permission.code))
    if (validCodes.size !== permissions.length) {
      return NextResponse.json({ error: 'One or more selected permissions are invalid.' }, { status: 400 })
    }

    const { error: revokeError } = await auth.supabase
      .from('profile_permissions')
      .delete()
      .eq('profile_id', profileId)
    if (revokeError) return NextResponse.json({ error: revokeError.message }, { status: 500 })

    if (permissionRows && permissionRows.length > 0) {
      const { error: grantError } = await auth.supabase
        .from('profile_permissions')
        .insert(permissionRows.map((permission) => ({
          profile_id: profileId,
          permission_id: permission.id,
          granted_by: auth.user.id,
        })))
      if (grantError) return NextResponse.json({ error: grantError.message }, { status: 500 })
    }

    const { error: auditError } = await auth.supabase.from('audit_logs').insert({
      business_id: auth.profile.business_id,
      actor_id: auth.user.id,
      action: 'team.member_permissions_updated',
      entity_type: 'profile',
      entity_id: profileId,
      metadata: { permissions },
    })
    if (auditError) console.warn('team permission audit log failed', auditError.message)

    return NextResponse.json({ message: 'Access rights updated.' })
  }

  let update: Record<string, unknown> = {}
  if (action === 'activate') update = { is_active: true }
  if (action === 'deactivate') update = { is_active: false }
  if (action === 'role') {
    if (!role) return NextResponse.json({ error: 'Role is required.' }, { status: 400 })
    update = { role }
  }

  const { error: updateError } = await auth.supabase
    .from('profiles')
    .update(update)
    .eq('id', profileId)
    .eq('business_id', auth.profile.business_id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await auth.supabase.from('audit_logs').insert({
    business_id: auth.profile.business_id,
    actor_id: auth.user.id,
    action: `team.member_${action}`,
    entity_type: 'profile',
    entity_id: profileId,
    metadata: { previous_role: target.role, previous_active: target.is_active, role },
  })

  return NextResponse.json({ message: action === 'deactivate' ? 'Account deactivated; login access is disabled.' : 'Team member updated.' })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const profileId = typeof body?.profileId === 'string' ? body.profileId : ''
  if (!z.string().uuid().safeParse(profileId).success) {
    return NextResponse.json({ error: 'Invalid team member.' }, { status: 400 })
  }
  if (profileId === auth.user.id) return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 })

  const { data: target, error: targetError } = await auth.supabase
    .from('profiles')
    .select('id, business_id, role')
    .eq('id', profileId)
    .eq('business_id', auth.profile.business_id)
    .maybeSingle()

  if (targetError || !target) return NextResponse.json({ error: 'Team member not found.' }, { status: 404 })
  if (target.role === 'admin') return NextResponse.json({ error: 'The primary admin account cannot be deleted here.' }, { status: 400 })

  try {
    const { data: { session } } = await auth.supabase.auth.getSession()
    if (!session?.access_token) return NextResponse.json({ error: 'Your admin session has expired. Please sign in again.' }, { status: 401 })

    const response = await fetch(TEAM_DELETE_FUNCTION, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profileId }),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { error: typeof data?.error === 'string' ? data.error : 'Unable to delete account. Please try again.' },
        { status: response.status },
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('team member deletion proxy failed', error)
    return NextResponse.json({ error: errorMessage(error, 'Unable to delete account. Please try again.') }, { status: 500 })
  }
}
