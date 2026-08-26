import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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

const itemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().min(0),
  discount_amount: z.coerce.number().min(0).default(0),
})

const saleSchema = z.object({
  party_id: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'completed']).default('draft'),
  notes: z.string().trim().max(1500).optional().or(z.literal('')),
  items: z.array(itemSchema).min(1),
})

export async function GET() {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let query = supabase
    .from('sales_invoices')
    .select(`
      id,
      invoice_no,
      status,
      party_id,
      subtotal,
      discount_amount,
      grand_total,
      notes,
      sold_at,
      completed_at,
      created_at,
      created_by,
      parties(id,name,party_type),
      sales_invoice_items(id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total)
    `)
    .eq('business_id', profile.business_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (profile.role === 'user') query = query.eq('created_by', user.id)

  const { data, error } = await query
  if (error) {
    console.error('GET /api/sales error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load sales' }, { status: 400 })
  }

  return NextResponse.json({ invoices: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = saleSchema.safeParse(body?.data)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid sale' }, { status: 400 })
  }

  const payload = profile.role === 'user'
    ? { ...parsed.data, party_id: null, status: 'draft' as const }
    : parsed.data

  const { data, error } = await supabase.rpc('create_sales_invoice', { payload })
  if (error) {
    console.error('POST /api/sales RPC error:', error)
    return NextResponse.json({ error: error.message || 'Unable to save sale' }, { status: 400 })
  }

  return NextResponse.json({ invoice: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role === 'user') {
    return NextResponse.json({ error: 'Customer accounts cannot complete or void sales.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = z.string().uuid().safeParse(body?.id)
  const action = z.enum(['complete', 'void']).safeParse(body?.action)
  if (!id.success || !action.success) return NextResponse.json({ error: 'Invalid sales action' }, { status: 400 })

  const functionName = action.data === 'complete' ? 'complete_sales_invoice' : 'void_sales_invoice'
  const { data, error } = await supabase.rpc(functionName, { invoice_id: id.data })
  if (error) {
    console.error(`PATCH /api/sales ${action.data} RPC error:`, error)
    return NextResponse.json({ error: error.message || `Unable to ${action.data} sale` }, { status: 400 })
  }

  return NextResponse.json({ invoice: data })
}

export async function DELETE(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Select at least one valid sales invoice' }, { status: 400 })

  const ids = [...new Set(parsed.data.ids)]
  const { data: selected, error: lookupError } = await supabase
    .from('sales_invoices')
    .select('id,invoice_no,status')
    .eq('business_id', profile.business_id)
    .is('deleted_at', null)
    .in('id', ids)

  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 })
  if ((selected?.length ?? 0) !== ids.length) return NextResponse.json({ error: 'One or more selected sales invoices were not found' }, { status: 404 })

  const nonDraft = (selected ?? []).filter(invoice => invoice.status !== 'draft')
  if (nonDraft.length) {
    return NextResponse.json({
      error: `Only draft sales invoices can be deleted. Completed/void invoices are protected: ${nonDraft.map(invoice => invoice.invoice_no).join(', ')}`,
    }, { status: 409 })
  }

  for (const invoice of selected ?? []) {
    const { error } = await supabase.rpc('soft_delete_sale_invoice', {
      p_invoice_id: invoice.id,
      p_reason: 'Deleted by admin/staff from draft sales records',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ deleted: ids.length })
}
