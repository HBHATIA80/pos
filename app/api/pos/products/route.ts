import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError || !profile?.is_active) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const requestedBusinessId = params.get('business_id')
  const q = (params.get('q') || '').trim()
  const limit = Math.min(Math.max(Number(params.get('limit') || 30), 1), 50)
  const offset = Math.max(Number(params.get('offset') || 0), 0)
  const categoryId = params.get('category_id')
  const subcategoryId = params.get('subcategory_id')
  const brandId = params.get('brand_id')

  let businessId = profile.business_id
  if (profile.role === 'user') {
    if (!requestedBusinessId) return NextResponse.json({ error: 'Shop selection is required.' }, { status: 400 })
    const { data: membership, error: membershipError } = await supabase
      .from('customer_business_memberships')
      .select('business_id')
      .eq('user_id', user.id)
      .eq('business_id', requestedBusinessId)
      .eq('is_active', true)
      .maybeSingle()
    if (membershipError) return NextResponse.json({ error: membershipError.message || 'Unable to validate shop' }, { status: 400 })
    if (!membership) return NextResponse.json({ error: 'You are not connected to this shop.' }, { status: 403 })
    businessId = membership.business_id
  }
  if (!businessId) return NextResponse.json({ error: 'No active shop is connected to this account.' }, { status: 403 })

  let query = supabase
    .from('products')
    .select('id,sku,barcode,name,purchase_price,sale_price,current_stock,reorder_level,category_id,subcategory_id,brand_id,unit_id,image_url', { count: 'exact' })
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')
    query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`)
  }
  if (categoryId) query = query.eq('category_id', categoryId)
  if (subcategoryId) query = query.eq('subcategory_id', subcategoryId)
  if (brandId) query = query.eq('brand_id', brandId)

  // Read catalog masters through the same authenticated client as products.
  // Customer-specific RLS policies authorize only connected shops, so the
  // shopping page does not depend on a second service-role client or secret.
  const [productsResult, categoriesResult, subcategoriesResult, brandsResult] = await Promise.all([
    query,
    supabase
      .from('catalog_categories')
      .select('id,name')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('catalog_subcategories')
      .select('id,name,category_id')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('catalog_brands')
      .select('id,name')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  const { data, count, error } = productsResult
  if (error) {
    console.error('GET /api/pos/products catalog error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load products' }, { status: 400 })
  }

  let categories = categoriesResult.data ?? []
  let subcategories = subcategoriesResult.data ?? []
  let brands = brandsResult.data ?? []

  // Safe database-side fallback if a deployment has stale catalog RLS
  // metadata. The RPC independently validates the authenticated membership.
  if (categoriesResult.error || subcategoriesResult.error || brandsResult.error || (!categories.length && !subcategories.length && !brands.length)) {
    const facetsResult = await supabase.rpc('get_customer_catalog_facets', { p_business_uuid: businessId })
    if (!facetsResult.error && facetsResult.data) {
      categories = Array.isArray(facetsResult.data.categories) ? facetsResult.data.categories : categories
      subcategories = Array.isArray(facetsResult.data.subcategories) ? facetsResult.data.subcategories : subcategories
      brands = Array.isArray(facetsResult.data.brands) ? facetsResult.data.brands : brands
    }
  }

  if (categoriesResult.error && !categories.length) console.error('Customer category facet query failed:', categoriesResult.error.message)
  if (subcategoriesResult.error && !subcategories.length) console.error('Customer subcategory facet query failed:', subcategoriesResult.error.message)
  if (brandsResult.error && !brands.length) console.error('Customer brand facet query failed:', brandsResult.error.message)

  const total = count ?? 0
  return NextResponse.json({
    products: data || [],
    total,
    offset,
    limit,
    hasMore: offset + (data?.length ?? 0) < total,
    facets: {
      categories,
      subcategories,
      brands,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
