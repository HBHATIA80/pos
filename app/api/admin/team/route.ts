import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
  action: z.enum(['activate', 'deactivate', 'name', 'role']),
  fullName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['staff', 'user']).optional(),
})

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Supabase service role configuration is missing.')
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

function normalizePhone(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
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
  return NextResponse.json({ members: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const parsed = createMemberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 })

  const admin = createAdminClient()
  const { fullName, phone, password, role, permissions } = parsed.data

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
    user_metadata: { full_name: fullName, business_id: auth.profile.business_id, role },
  })

  if (createError || !created.user) return NextResponse.json({ error: createError?.message ?? 'Unable to create account.' }, { status: 400 })

  if (role === 'user') {
    const { data: parties, error: partyLookupError } = await admin
      .from('parties')
      .select('id,name,phone,party_type,is_active')
      .eq('business_id', auth.profile.business_id)
      .in('party_type', ['customer', 'both'])
      .eq('is_active', true)

    if (partyLookupError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: partyLookupError.message }, { status: 500 })
    }

    const phoneMatches = (parties ?? []).filter((party) => normalizePhone(party.phone) === normalizePhone(phone) && normalizePhone(phone) !== '')
    const nameMatches = (parties ?? []).filter((party) => normalizeName(party.name) === normalizeName(fullName))

    let partyId: string | null = null
    if (phoneMatches.length === 1) partyId = phoneMatches[0].id
    else if (nameMatches.length === 1) partyId = nameMatches[0].id
    else if (phoneMatches.length === 0 && nameMatches.length === 0) {
      const { data: createdParty, error: partyCreateError } = await admin
        .from('parties')
        .insert({ business_id: auth.profile.business_id, party_type: 'customer', name: fullName, phone, created_by: auth.user.id })
        .select('id')
        .single()
      if (partyCreateError) {
        await admin.auth.admin.deleteUser(created.user.id)
        return NextResponse.json({ error: partyCreateError.message }, { status: 500 })
      }
      partyId = createdParty.id
    }

    if (partyId) {
      const { error: profileLinkError } = await admin.from('profiles').update({ party_id: partyId }).eq('id', created.user.id).eq('business_id', auth.profile.business_id)
      if (profileLinkError) {
        await admin.auth.admin.deleteUser(created.user.id)
        return NextResponse.json({ error: profileLinkError.message }, { status: 500 })
      }
    }
  }

  if (permissions.length > 0) {
    const { data: permissionRows, error: permissionError } = await admin.from('permissions').select('id, code').in('code', permissions)
    if (permissionError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: permissionError.message }, { status: 500 })
    }
    const rows = (permissionRows ?? []).map((permission) => ({ profile_id: created.user!.id, permission_id: permission.id, granted_by: auth.user.id }))
    if (rows.length > 0) {
      const { error: grantError } = await admin.from('profile_permissions').insert(rows)
      if (grantError) {
        await admin.auth.admin.deleteUser(created.user.id)
        return NextResponse.json({ error: grantError.message }, { status: 500 })
      }
    }
  }

  await admin.from('audit_logs').insert({ business_id: auth.profile.business_id, actor_id: auth.user.id, action: 'team.member_created', entity_type: 'profile', entity_id: created.user.id, metadata: { role, permissions } })
  return NextResponse.json({ message: `${role === 'staff' ? 'Staff' : 'User'} account created.`, memberId: created.user.id }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const parsed = updateMemberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 })

  const { profileId, action, role, fullName } = parsed.data
  if (profileId === auth.user.id) return NextResponse.json({ error: 'You cannot change your own admin account here.' }, { status: 400 })

  const { data: target, error: targetError } = await auth.supabase
    .from('profiles')
    .select('id, business_id, role, is_active, full_name, party_id')
    .eq('id', profileId)
    .eq('business_id', auth.profile.business_id)
    .maybeSingle()

  if (targetError || !target) return NextResponse.json({ error: 'Team member not found.' }, { status: 404 })

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
