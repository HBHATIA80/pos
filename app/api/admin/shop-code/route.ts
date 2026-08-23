import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('GET /api/admin/shop-code profile error:', profileError)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  if (!profile?.is_active || profile.role !== 'admin' || !profile.business_id) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, name, code')
    .eq('id', profile.business_id)
    .maybeSingle()

  if (businessError) {
    console.error('GET /api/admin/shop-code business error:', businessError)
    return NextResponse.json({ error: businessError.message }, { status: 400 })
  }

  if (!business) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }

  if (!business.code) {
    return NextResponse.json(
      { error: 'This shop does not have a customer shop code yet.' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    shop: {
      id: business.id,
      name: business.name,
      code: business.code,
    },
  })
}
