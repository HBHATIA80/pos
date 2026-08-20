import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerId = request.nextUrl.searchParams.get('customer_id')
  const productId = request.nextUrl.searchParams.get('product_id')
  const quantity = Number(request.nextUrl.searchParams.get('quantity') || 1)

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'product_id and valid quantity are required' }, { status: 400 })
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, sale_price, business_id')
    .eq('id', productId)
    .eq('is_active', true)
    .single()

  if (productError || !product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  let priceListId: string | null = null
  if (customerId) {
    const { data: customerPriceList } = await supabase
      .from('customer_price_lists')
      .select('price_list_id')
      .eq('customer_id', customerId)
      .maybeSingle()
    priceListId = customerPriceList?.price_list_id ?? null
  }

  let finalPrice = Number(product.sale_price)
  let source: 'base' | 'price_list' = 'base'

  if (priceListId) {
    const today = new Date().toISOString().slice(0, 10)
    const { data: priceRows } = await supabase
      .from('price_list_items')
      .select('selling_price, min_quantity, valid_from, valid_to')
      .eq('price_list_id', priceListId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .lte('min_quantity', quantity)
      .or(`valid_from.is.null,valid_from.lte.${today}`)
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order('min_quantity', { ascending: false })
      .limit(1)

    if (priceRows?.[0]) {
      finalPrice = Number(priceRows[0].selling_price)
      source = 'price_list'
    }
  }

  return NextResponse.json({
    product_id: product.id,
    unit_price: finalPrice,
    source,
  })
}
