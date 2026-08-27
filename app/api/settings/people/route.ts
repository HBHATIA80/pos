import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerClient } from '@/lib/supabase/server'

const updateSchema = z.object({
  profileId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid mobile number in international format.'),
  address: z.string().trim().max(500).optional().default(''),
})

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

  return { user, profile, supabase }
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { data, error } = await auth.supabase.rpc('admin_list_people', {
    p_target_business_id: auth.profile.business_id,
  })

  if (error) return NextResponse.json({ error: error.message || 'Unable to load people.' }, { status: 500 })

  return NextResponse.json({ people: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 })

  const { profileId, fullName, phone, address } = parsed.data
  const { data: target, error: targetError } = await auth.supabase
    .from('profiles')
    .select('id, business_id, role, party_id, full_name, phone, address')
    .eq('id', profileId)
    .eq('business_id', auth.profile.business_id)
    .maybeSingle()

  if (targetError || !target) return NextResponse.json({ error: 'Person not found.' }, { status: 404 })

  const { error: profileError } = await auth.supabase
    .from('profiles')
    .update({ full_name: fullName, phone, address: address || null })
    .eq('id', profileId)
    .eq('business_id', auth.profile.business_id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  if (target.party_id) {
    const { error: partyError } = await auth.supabase
      .from('parties')
      .update({ name: fullName, phone, address: address || null })
      .eq('id', target.party_id)
      .eq('business_id', auth.profile.business_id)

    if (partyError) return NextResponse.json({ error: partyError.message }, { status: 400 })
  }

  await auth.supabase.from('audit_logs').insert({
    business_id: auth.profile.business_id,
    actor_id: auth.user.id,
    action: 'settings.person_updated',
    entity_type: 'profile',
    entity_id: profileId,
    metadata: { role: target.role },
  })

  return NextResponse.json({ message: 'Person details updated.' })
}
