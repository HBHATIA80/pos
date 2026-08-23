import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,role,is_active,full_name,phone')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active || profile.role !== 'user') {
    return NextResponse.json({ error: 'Customer portal access is required.' }, { status: 403 })
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('customer_business_memberships')
    .select('business_id,party_id,is_primary,joined_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('is_primary', { ascending: false })
    .order('joined_at', { ascending: true })

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message || 'Unable to load your shops' }, { status: 400 })
  }

  const rows = memberships ?? []
  const businessIds = rows.map((row) => row.business_id)
  const partyIds = rows.map((row) => row.party_id)

  const [businessesResult, partiesResult] = await Promise.all([
    businessIds.length
      ? supabase.from('businesses').select('id,name,code,phone,address,status').in('id', businessIds)
      : Promise.resolve({ data: [], error: null }),
    partyIds.length
      ? supabase.from('parties').select('id,name,phone,email').in('id', partyIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (businessesResult.error) return NextResponse.json({ error: businessesResult.error.message }, { status: 400 })
  if (partiesResult.error) return NextResponse.json({ error: partiesResult.error.message }, { status: 400 })

  const businesses = businessesResult.data ?? []
  const parties = partiesResult.data ?? []

  return NextResponse.json({
    customer: { id: user.id, name: profile.full_name, phone: profile.phone },
    shops: rows.map((membership) => ({
      business_id: membership.business_id,
      party_id: membership.party_id,
      is_primary: membership.is_primary,
      joined_at: membership.joined_at,
      business: businesses.find((business) => business.id === membership.business_id) ?? null,
      party: parties.find((party) => party.id === membership.party_id) ?? null,
    })).filter((shop) => shop.business),
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { shop_code?: string }
  const shopCode = String(body.shop_code ?? '').trim().toUpperCase()
  if (!shopCode) return NextResponse.json({ error: 'Shop code is required.' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active || profile.role !== 'user') {
    return NextResponse.json({ error: 'Customer portal access is required.' }, { status: 403 })
  }

  const { data, error } = await supabase.rpc('join_customer_shop', { p_shop_code: shopCode })
  if (error) {
    return NextResponse.json({ error: error.message || 'Unable to join shop' }, { status: 400 })
  }

  return NextResponse.json({ shop: data?.[0] ?? null })
}
