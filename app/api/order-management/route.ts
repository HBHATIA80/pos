import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const statusSchema = z.object({
  invoice_id: z.string().uuid(),
  status: z.enum(['accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled']),
  note: z.string().trim().max(500).optional().or(z.literal('')),
})

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  return { supabase, user, profile }
}

export async function GET(request: NextRequest) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'admin' && profile.role !== 'staff') {
    return NextResponse.json({ error: 'Order management access required' }, { status: 403 })
  }

  const status = request.nextUrl.searchParams.get('status')
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  let builder = supabase
    .from('sales_invoices')
    .select(`
      id,
      invoice_no,
      status,
      order_channel,
      order_status,
      party_id,
      subtotal,
      discount_amount,
      grand_total,
      notes,
      created_by,
      created_at,
      sold_at,
      completed_at,
      parties(id,name,party_type,phone),
      sales_invoice_items(
        id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total
      ),
      sales_order_events(
        id,status,note,acted_by,created_at
      )
    `)
    .eq('business_id', profile.business_id)
    .eq('order_channel', 'customer_portal')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && ['placed', 'accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
    builder = builder.eq('order_status', status)
  }

  if (query) {
    builder = builder.or(`invoice_no.ilike.%${query}%,notes.ilike.%${query}%`)
  }

  const { data, error } = await builder

  if (error) {
    console.error('Order management GET error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load orders' }, { status: 400 })
  }

  return NextResponse.json({ orders: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'admin' && profile.role !== 'staff') {
    return NextResponse.json({ error: 'Order management access required' }, { status: 403 })
  }

  const parsed = statusSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid order status' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('update_customer_order_status', {
    p_invoice_id: parsed.data.invoice_id,
    p_status: parsed.data.status,
    p_note: parsed.data.note || null,
  })

  if (error) {
    console.error('Order management status RPC error:', error)
    return NextResponse.json({ error: error.message || 'Unable to update order' }, { status: 400 })
  }

  return NextResponse.json({ order: data })
}
