import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient as createServerClient } from '@/lib/supabase/server'

const updateSchema = z.object({
  profileId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid mobile number in international format.'),
  address: z.string().trim().max(500).optional().default(''),
})

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Supabase service role configuration is missing.')
  return createSupabaseAdmin(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, business_id, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile || profile.role !== 'admin' || !profile.is_active || !profile.business_id) {
    return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }
  }

  return { user, profile }
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, phone, address, role, is_active, party_id, created_at, updated_at')
    .eq('business_id', auth.profile.business_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const partyIds = (data ?? []).map((profile) => profile.party_id).filter(Boolean) as string[]
  let parties: Record<string, { name: string; phone: string | null; address: string | null }> = {}

  if (partyIds.length) {
    const { data: partyRows, error: partyError } = await admin
      .from('parties')
      .select('id, name, phone, address')
      .in('id', partyIds)
      .eq('business_id', auth.profile.business_id)

    if (partyError) return NextResponse.json({ error: partyError.message }, { status: 500 })
    parties = Object.fromEntries((partyRows ?? []).map((party) => [party.id, party]))
  }

  const people = (data ?? []).map((profile) => {
    const party = profile.party_id ? parties[profile.party_id] : null
    return {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      address: party?.address ?? profile.address ?? '',
      role: profile.role,
      is_active: profile.is_active,
      party_id: profile.party_id,
      created_at: profile.created_at,
    }
  })

  return NextResponse.json({ people })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 })

  const { profileId, fullName, phone, address } = parsed.data
  const admin = createAdminClient()

  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, business_id, role, party_id, full_name, phone, address')
    .eq('id', profileId)
    .eq('business_id', auth.profile.business_id)
    .maybeSingle()

  if (targetError || !target) return NextResponse.json({ error: 'Person not found.' }, { status: 404 })

  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: fullName, phone, address: address || null })
    .eq('id', profileId)
    .eq('business_id', auth.profile.business_id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  const { error: authError } = await admin.auth.admin.updateUserById(profileId, {
    phone,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (authError) {
    await admin.from('profiles').update({ full_name: target.full_name, phone: target.phone, address: target.address }).eq('id', profileId)
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  if (target.party_id) {
    const { error: partyError } = await admin
      .from('parties')
      .update({ name: fullName, phone, address: address || null })
      .eq('id', target.party_id)
      .eq('business_id', auth.profile.business_id)

    if (partyError) return NextResponse.json({ error: partyError.message }, { status: 400 })
  }

  await admin.from('audit_logs').insert({
    business_id: auth.profile.business_id,
    actor_id: auth.user.id,
    action: 'settings.person_updated',
    entity_type: 'profile',
    entity_id: profileId,
    metadata: { role: target.role },
  })

  return NextResponse.json({ message: 'Person details updated.' })
}
