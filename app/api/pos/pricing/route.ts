import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

export async function GET(request: NextRequest) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const productId = request.nextUrl.searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id is required' }, { status: 400 })

  const customerId = request.nextUrl.searchParams.get('customer_id')
  const quantity = Number(request.nextUrl.searchParams.get('quantity') || 1)
  if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id,sku,name,purchase_price,sale_price,current_stock,business_id')
    .eq('id', productId)
    .eq('business_id', profile.business_id)
    .eq('is_active', true)
    .single()
  if (productError || !product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  let priceListId: string | null = null
  if (customerId) {
    const { data: customerPriceList } = await supabase.from('customer_price_lists').select('price_list_id').eq('customer_id', customerId).maybeSingle()
    priceListId = customerPriceList?.price_list_id ?? null
  }

  let finalPrice = Number(product.sale_price) || 0
  let source: 'base' | 'price_list' = 'base'
  let customerUnitPrice: number | null = null
  if (priceListId) {
    const today = new Date().toISOString().slice(0, 10)
    const { data: priceRows } = await supabase
      .from('price_list_items')
      .select('selling_price,min_quantity,valid_from,valid_to')
      .eq('price_list_id', priceListId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .lte('min_quantity', quantity)
      .or(`valid_from.is.null,valid_from.lte.${today}`)
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order('min_quantity', { ascending: false })
      .limit(1)
    if (priceRows?.[0]) {
      customerUnitPrice = Number(priceRows[0].selling_price)
      finalPrice = customerUnitPrice
      source = 'price_list'
    }
  }

  const { data: history, error: historyError } = await supabase
    .from('purchase_invoice_items')
    .select('id,unit_price,quantity,created_at,purchase_invoices!inner(invoice_no,purchased_at,status,business_id)')
    .eq('product_id', productId)
    .eq('purchase_invoices.business_id', profile.business_id)
    .eq('purchase_invoices.status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)
  if (historyError) return NextResponse.json({ error: historyError.message }, { status: 400 })

  return NextResponse.json({
    product: { id: product.id, sku: product.sku, name: product.name, purchase_price: Number(product.purchase_price) || 0, sale_price: Number(product.sale_price) || 0, current_stock: Number(product.current_stock) || 0 },
    base_unit_price: Number(product.sale_price) || 0,
    customer_unit_price: customerUnitPrice,
    unit_price: finalPrice,
    source,
    last_purchase_prices: (history ?? []).map(row => {
      const invoice = Array.isArray(row.purchase_invoices) ? row.purchase_invoices[0] : row.purchase_invoices
      return { id: row.id, invoice_no: invoice?.invoice_no ?? '—', unit_price: Number(row.unit_price) || 0, quantity: Number(row.quantity) || 0, purchased_at: invoice?.purchased_at || row.created_at }
    }),
  })
}
