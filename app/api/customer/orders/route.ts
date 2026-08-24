import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const itemSchema = z.object({ product_id: z.string().uuid(), quantity: z.coerce.number().positive().max(10000) })
const orderSchema = z.object({ business_id: z.string().uuid(), notes: z.string().trim().max(1500).optional().or(z.literal('')), items: z.array(itemSchema).min(1).max(200) })

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

async function validateShop(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, businessId: string) {
  const { data, error } = await supabase.from('customer_business_memberships').select('business_id,party_id').eq('user_id', userId).eq('business_id', businessId).eq('is_active', true).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('You are not connected to this shop.')
  return data
}

export async function GET(request: NextRequest) {
  const { supabase, user, profile } = await getContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!profile?.is_active || profile.role !== 'user') return NextResponse.json({ error: 'Customer portal access is required.' }, { status: 403 })

  const parsedBusiness = z.string().uuid().safeParse(request.nextUrl.searchParams.get('business_id'))
  if (!parsedBusiness.success) return NextResponse.json({ error: 'Shop selection is required.' }, { status: 400 })

  try {
    await validateShop(supabase, user.id, parsedBusiness.data)
    const { data, error } = await supabase.from('sales_invoices').select(`id,invoice_no,status,order_channel,order_status,grand_total,created_at,sold_at,completed_at,sales_invoice_items(id,product_id,product_name,sku,unit_name,quantity,unit_price,line_total),sales_order_events(id,status,note,acted_by,created_at)`).eq('business_id', parsedBusiness.data).eq('created_by', user.id).eq('order_channel', 'customer_portal').order('created_at', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ error: error.message || 'Unable to load orders' }, { status: 400 })
    return NextResponse.json({ orders: data ?? [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to validate shop' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  const { supabase, user, profile } = await getContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!profile?.is_active || profile.role !== 'user') return NextResponse.json({ error: 'Customer portal access is required.' }, { status: 403 })

  const parsed = orderSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid order' }, { status: 400 })

  try {
    await validateShop(supabase, user.id, parsed.data.business_id)
    const { business_id, notes, items } = parsed.data
    const { data, error } = await supabase.rpc('create_sales_invoice', { payload: { business_id, status: 'draft', party_id: null, notes: notes || 'Customer portal order', items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity, unit_price: 0, discount_amount: 0 })) } })
    if (error) return NextResponse.json({ error: error.message || 'Unable to place order' }, { status: 400 })
    return NextResponse.json({ order: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to place order' }, { status: 400 })
  }
}
