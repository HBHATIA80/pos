import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function createServerAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase service role configuration is missing.')
  }

  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const q = (params.get('q') || '').trim()
  const limit = Math.min(Math.max(Number(params.get('limit') || 30), 1), 50)
  const categoryId = params.get('category_id')
  const subcategoryId = params.get('subcategory_id')
  const brandId = params.get('brand_id')

  // This endpoint is used by both the POS workspace (admin/staff) and the
  // customer portal. Authentication and business scoping are enforced above.
  // Use the server-only admin client for the catalog read so catalog visibility
  // does not depend on role-specific RLS policies. The service-role key never
  // reaches the browser.
  const admin = createServerAdminClient()

  let query = admin
    .from('products')
    .select('id, sku, barcode, name, purchase_price, sale_price, current_stock, reorder_level, category_id, subcategory_id, brand_id, unit_id')
    .eq('business_id', profile.business_id)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(limit)

  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')
    query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`)
  }
  if (categoryId) query = query.eq('category_id', categoryId)
  if (subcategoryId) query = query.eq('subcategory_id', subcategoryId)
  if (brandId) query = query.eq('brand_id', brandId)

  const { data, error } = await query
  if (error) {
    console.error('GET /api/pos/products catalog error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load products' }, { status: 400 })
  }

  return NextResponse.json({ products: data || [] })
}
