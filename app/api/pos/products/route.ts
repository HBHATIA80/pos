import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (profileError || !profile?.is_active) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const requestedBusinessId = params.get('business_id')
  const q = (params.get('q') || '').trim()
  const limit = Math.min(Math.max(Number(params.get('limit') || 30), 1), 50)
  const offset = Math.max(Number(params.get('offset') || 0), 0)
  const categoryId = params.get('category_id')
  const subcategoryId = params.get('subcategory_id')
  const brandId = params.get('brand_id')
  // Facets are lightweight and required by the customer catalog UI. Return them on every catalog request so a follow-up search/filter request cannot race the initial facet load and clear the dropdowns.
  const includeFacets = true

  let businessId = profile.business_id
  if (profile.role === 'user') {
    if (!requestedBusinessId) return NextResponse.json({ error: 'Shop selection is required.' }, { status: 400 })
    const { data: membership, error: membershipError } = await supabase.from('customer_business_memberships').select('business_id').eq('user_id', user.id).eq('business_id', requestedBusinessId).eq('is_active', true).maybeSingle()
    if (membershipError) return NextResponse.json({ error: membershipError.message || 'Unable to validate shop' }, { status: 400 })
    if (!membership) return NextResponse.json({ error: 'You are not connected to this shop.' }, { status: 403 })
    businessId = membership.business_id
  }
  if (!businessId) return NextResponse.json({ error: 'No active shop is connected to this account.' }, { status: 403 })

  let query = supabase.from('products').select('id,sku,barcode,name,purchase_price,sale_price,current_stock,reorder_level,category_id,subcategory_id,brand_id,unit_id,image_url', { count: 'exact' }).eq('business_id', businessId).eq('is_active', true).order('name', { ascending: true }).range(offset, offset + limit - 1)
  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')
    query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`)
  }
  if (categoryId) query = query.eq('category_id', categoryId)
  if (subcategoryId) query = query.eq('subcategory_id', subcategoryId)
  if (brandId) query = query.eq('brand_id', brandId)

  const [productsResult, categoriesResult, subcategoriesResult, brandsResult] = await Promise.all([
    query,
    includeFacets ? supabase.from('catalog_categories').select('id,name').eq('business_id', businessId).eq('is_active', true).order('name') : Promise.resolve({ data: null, error: null }),
    includeFacets ? supabase.from('catalog_subcategories').select('id,name,category_id').eq('business_id', businessId).eq('is_active', true).order('name') : Promise.resolve({ data: null, error: null }),
    includeFacets ? supabase.from('catalog_brands').select('id,name').eq('business_id', businessId).eq('is_active', true).order('name') : Promise.resolve({ data: null, error: null }),
  ])

  const { data, count, error } = productsResult
  if (error) {
    console.error('GET /api/pos/products catalog error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load products' }, { status: 400 })
  }
  if (categoriesResult.error || subcategoriesResult.error || brandsResult.error) {
    return NextResponse.json({ error: 'Unable to load product filters' }, { status: 400 })
  }

  const total = count ?? 0
  return NextResponse.json({
    products: data || [],
    total,
    offset,
    limit,
    hasMore: offset + (data?.length ?? 0) < total,
    facets: includeFacets ? {
      categories: categoriesResult.data || [],
      subcategories: subcategoriesResult.data || [],
      brands: brandsResult.data || [],
    } : undefined,
  })
}
