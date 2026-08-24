import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.role) return NextResponse.json({ error: 'Active account required.' }, { status: 403 })

  const params = request.nextUrl.searchParams
  const q = (params.get('q') || '').trim()
  const limit = Math.min(Math.max(Number(params.get('limit') || 40), 1), 100)
  const offset = Math.max(Number(params.get('offset') || 0), 0)
  const categoryId = params.get('category_id') || null
  const subcategoryId = params.get('subcategory_id') || null
  const brandId = params.get('brand_id') || null

  const [productsResult, facetsResult] = await Promise.all([
    supabase.rpc('marketplace_products', { p_q: q, p_limit: limit + 1, p_offset: offset, p_category_id: categoryId, p_subcategory_id: subcategoryId, p_brand_id: brandId }),
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
    sale_price: Number(row.sale_price || 0),
    image_url: row.image_url,
    category_id: row.category_id,
    subcategory_id: row.subcategory_id,
    brand_id: row.brand_id,
    category_name: row.category_name,
    subcategory_name: row.subcategory_name,
    brand_name: row.brand_name,
    current_stock: Number(row.current_stock || 0),
  }))

  return NextResponse.json({ products, facets: facetsResult.data || { categories: [], subcategories: [], brands: [] }, offset, limit, hasMore })
}
