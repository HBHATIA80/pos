import { NextRequest, NextResponse } from '@/lib/next/server'
import { createClient } from '@/lib/supabase/server'

type MarketplaceRow = { product_id: string; business_id: string; shop_name: string; shop_code: string | null; product_name: string; sku: string | null; barcode: string | null; sale_price: number; image_url: string | null; category_id: string | null; current_stock: number }

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
  const { data, error } = await supabase.rpc('marketplace_products', { p_q: q, p_limit: limit + 1, p_offset: offset })
  if (error) return NextResponse.json({ error: error.message || 'Unable to load marketplace' }, { status: 400 })
  const rows = (data || []) as MarketplaceRow[]
  const hasMore = rows.length > limit
  const products = (hasMore ? rows.slice(0, limit) : rows).map(row => ({ id: row.product_id, business_id: row.business_id, shop_name: row.shop_name, shop_code: row.shop_code, name: row.product_name, sku: row.sku, barcode: row.barcode, sale_price: Number(row.sale_price || 0), image_url: row.image_url, category_id: row.category_id, current_stock: Number(row.current_stock || 0) }))
  return NextResponse.json({ products, offset, limit, hasMore })
}
