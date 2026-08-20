import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active || !profile.business_id || profile.role !== 'user') {
    return NextResponse.json({ error: 'Customer portal access required' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('sales_invoices')
    .select(`
      id,
      invoice_no,
      status,
      order_channel,
      order_status,
      grand_total,
      created_at,
      sold_at,
      completed_at,
      sales_invoice_items(
        id,
        product_id,
        product_name,
        sku,
        unit_name,
        quantity,
        unit_price,
        line_total
      ),
      sales_order_events(
        id,
        status,
        note,
        acted_by,
        created_at
      )
    `)
    .eq('business_id', profile.business_id)
    .eq('created_by', user.id)
    .eq('order_channel', 'customer_portal')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Customer order history error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load orders' }, { status: 400 })
  }

  return NextResponse.json({ orders: data ?? [] })
}
