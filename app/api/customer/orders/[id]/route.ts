import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

async function getContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  return { supabase, user, profile }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { supabase, user, profile } = await getContext()

  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = z.string().uuid().safeParse((await context.params).id)
  if (!id.success) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 })
  }

  const { data: invoice, error } = await supabase
    .from('sales_invoices')
    .select(`
      id,
      invoice_no,
      status,
      order_channel,
      order_status,
      grand_total,
      subtotal,
      discount_amount,
      notes,
      created_at,
      sold_at,
      completed_at,
      created_by,
      sales_invoice_items(
        id,
        product_id,
        product_name,
        sku,
        unit_name,
        quantity,
        unit_price,
        discount_amount,
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
    .eq('id', id.data)
    .eq('business_id', profile.business_id)
    .eq('order_channel', 'customer_portal')
    .maybeSingle()

  if (error) {
    console.error('Customer order lookup error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load order' }, { status: 400 })
  }

  if (!invoice) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const canManage = profile.role === 'admin' || profile.role === 'staff' || profile.role === 'user' && invoice.created_by === user.id
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ order: invoice })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { supabase, user, profile } = await getContext()

  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'admin' && profile.role !== 'staff' && !profile.role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = z.string().uuid().safeParse((await context.params).id)
  const body = await request.json().catch(() => null)
  const status = z.enum(['accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled']).safeParse(body?.status)
  const note = z.string().trim().max(1000).optional().or(z.literal('')).safeParse(body?.note ?? '')

  if (!id.success || !status.success || !note.success) {
    return NextResponse.json({ error: 'Invalid order action' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('update_customer_order_status', {
    p_invoice_id: id.data,
    p_status: status.data,
    p_note: note.data || null,
  })

  if (error) {
    console.error('Customer order status RPC error:', error)
    return NextResponse.json({ error: error.message || 'Unable to update order' }, { status: 400 })
  }

  return NextResponse.json({ order: data })
}
