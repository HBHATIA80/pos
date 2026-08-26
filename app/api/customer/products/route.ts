import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || profile.role !== 'user') return NextResponse.json({ error: 'Customer access required' }, { status: 403 })

  const params = request.nextUrl.searchParams
  const businessId = params.get('business_id')
  const q = (params.get('q') || '').trim()
  const limit = Math.min(Math.max(Number(params.get('limit') || 30), 1), 50)
  const offset = Math.max(Number(params.get('offset') || 0), 0)
  const categoryId = params.get('category_id')
  const subcategoryId = params.get('subcategory_id')
  const brandId = params.get('brand_id')

  if (!businessId) return NextResponse.json({ error: 'Shop selection is required.' }, { status: 400 })
  const { data: membership, error: membershipError } = await supabase
    .from('customer_business_memberships')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .maybeSingle()
  if (membershipError) return NextResponse.json({ error: membershipError.message || 'Unable to validate shop' }, { status: 400 })
  if (!membership) return NextResponse.json({ error: 'You are not connected to this shop.' }, { status: 403 })

  let query = supabase
    .from('products')
    .select('id,sku,barcode,name,sale_price,category_id,subcategory_id,brand_id,unit_id,image_url,current_stock', { count: 'exact' })
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)
  if (q) { const escaped = q.replace(/[%_]/g, '\\$&'); query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`) }
  if (categoryId) query = query.eq('category_id', categoryId)
  if (subcategoryId) query = query.eq('subcategory_id', subcategoryId)
  if (brandId) query = query.eq('brand_id', brandId)

  // Customer catalog facets are loaded through the membership-aware SECURITY DEFINER
  // function because catalog master tables intentionally remain manager-only in RLS.
  // The RPC validates that this customer is connected to the selected shop.
  const [productsResult, facetsResult] = await Promise.all([
    query,
    supabase.rpc('get_customer_catalog_facets', { p_business_uuid: businessId }),
  ])

  const { data, count, error } = productsResult
  if (error) return NextResponse.json({ error: error.message || 'Unable to load products' }, { status: 400 })

  const products = (data || []).map((product) => {
    const stock = Number(product.current_stock || 0)
    const { current_stock: _currentStock, ...safeProduct } = product
    return { ...safeProduct, availability: stock > 0 ? 'available' : 'out_of_stock' }
  })
  const total = count ?? 0
  const facets = !facetsResult.error && facetsResult.data ? facetsResult.data : { categories: [], subcategories: [], brands: [] }

  return NextResponse.json({
    products,
    total,
    offset,
    limit,
    hasMore: offset + products.length < total,
    facets,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
