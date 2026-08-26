import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Marketplace browsing is public. Product/shop metadata is intentionally
  // available to guests, while price is returned only for authenticated users.
  let canViewPrices = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .maybeSingle()
    canViewPrices = Boolean(profile?.is_active)
  }

  const params = request.nextUrl.searchParams
  const q = (params.get('q') || '').trim()
  const limit = Math.min(Math.max(Number(params.get('limit') || 40), 1), 100)
  const offset = Math.max(Number(params.get('offset') || 0), 0)
  const categoryId = params.get('category_id') || null
  const subcategoryId = params.get('subcategory_id') || null
  const brandId = params.get('brand_id') || null

  const [productsResult, facetsResult] = await Promise.all([
    supabase.rpc('marketplace_products', {
      p_q: q,
      p_limit: limit + 1,
      p_offset: offset,
      p_category_id: categoryId,
      p_subcategory_id: subcategoryId,
      p_brand_id: brandId,
    }),
    supabase.rpc('marketplace_facets'),
  ])

  if (productsResult.error) return NextResponse.json({ error: productsResult.error.message || 'Unable to load marketplace' }, { status: 400 })
  if (facetsResult.error) return NextResponse.json({ error: facetsResult.error.message || 'Unable to load marketplace filters' }, { status: 400 })

  const rows = (productsResult.data || []) as Array<Record<string, unknown>>
  const hasMore = rows.length > limit
  const products = (hasMore ? rows.slice(0, limit) : rows).map(row => ({
    id: row.product_id,
    business_id: row.business_id,
    shop_name: row.shop_name,
    shop_code: row.shop_code,
    name: row.product_name,
    sku: row.sku,
    barcode: row.barcode,
    // Never send the real price to a guest. The UI blur is only presentation;
    // the API response itself is also protected from price disclosure.
    sale_price: canViewPrices ? Number(row.sale_price || 0) : null,
    image_url: row.image_url,
    category_id: row.category_id,
    subcategory_id: row.subcategory_id,
    brand_id: row.brand_id,
    category_name: row.category_name,
    subcategory_name: row.subcategory_name,
    brand_name: row.brand_name,
    current_stock: Number(row.current_stock || 0),
  }))

  return NextResponse.json({
    products,
    facets: facetsResult.data || { categories: [], subcategories: [], brands: [] },
    offset,
    limit,
    hasMore,
    canViewPrices,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
