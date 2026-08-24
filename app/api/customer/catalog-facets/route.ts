import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = request.nextUrl.searchParams.get('business_id')
  if (!businessId) return NextResponse.json({ error: 'Shop selection is required.' }, { status: 400 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile?.is_active) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== 'user') return NextResponse.json({ error: 'This endpoint is for customer accounts.' }, { status: 403 })

  // The database function uses p_business_uuid; keep this endpoint aligned
  // with the actual RPC signature so it cannot silently fail on a typo.
  const { data, error } = await supabase.rpc('get_customer_catalog_facets', { p_business_uuid: businessId })
  if (error) {
    console.error('GET /api/customer/catalog-facets error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load product filters' }, { status: 400 })
  }

  return NextResponse.json(data ?? { categories: [], subcategories: [], brands: [] }, { headers: { 'Cache-Control': 'no-store' } })
}
