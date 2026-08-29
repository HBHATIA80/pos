import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const itemSchema = z.object({
  purchase_invoice_item_id: z.string().uuid(),
  received_quantity: z.coerce.number().min(0),
  notes: z.string().max(500).optional().nullable(),
})

const saveSchema = z.object({
  invoice_id: z.string().uuid(),
  items: z.array(itemSchema).min(1),
  notes: z.string().max(1000).optional().nullable(),
})

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

export async function GET() {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: purchases, error } = await supabase
    .from('purchase_invoices')
    .select(`
      id, invoice_no, status, grand_total, purchased_at, created_at, party_id,
      party:parties!purchase_invoices_party_id_fkey(id,name,phone),
      items:purchase_invoice_items(id,product_id,product_name,sku,unit_name,quantity,unit_price,line_total),
      receipt:purchase_receipts(id,status,received_by,received_at,notes,updated_at,items:purchase_receipt_items(id,purchase_invoice_item_id,expected_quantity,received_quantity,notes))
    `)
    .eq('business_id', profile.business_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ purchases: purchases ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = saveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid receiving data' }, { status: 400 })

  const { invoice_id, items, notes } = parsed.data
  const { data: invoice, error: invoiceError } = await supabase
    .from('purchase_invoices')
    .select('id,business_id,invoice_no,grand_total,purchase_invoice_items(id,quantity)')
    .eq('id', invoice_id)
    .eq('business_id', profile.business_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 400 })
  if (!invoice) return NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 })

  const expectedItems = (invoice.purchase_invoice_items ?? []) as Array<{ id: string; quantity: number }>
  const expectedById = new Map(expectedItems.map(item => [item.id, Number(item.quantity)]))
  if (items.some(item => !expectedById.has(item.purchase_invoice_item_id))) {
    return NextResponse.json({ error: 'One or more receiving items do not belong to this invoice' }, { status: 400 })
  }

  const receivedById = new Map(items.map(item => [item.purchase_invoice_item_id, Number(item.received_quantity)]))
  const complete = expectedItems.length > 0 && expectedItems.every(item => receivedById.has(item.id) && receivedById.get(item.id) === Number(item.quantity))
  const hasMismatch = expectedItems.some(item => !receivedById.has(item.id) || receivedById.get(item.id) !== Number(item.quantity))
  const hasAnyReceived = expectedItems.some(item => Number(receivedById.get(item.id) ?? 0) > 0)
  const status = complete ? 'verified' : hasAnyReceived && hasMismatch ? 'partial' : 'pending'

  const { data: receipt, error: receiptError } = await supabase
    .from('purchase_receipts')
    .upsert({
      business_id: profile.business_id,
      purchase_invoice_id: invoice.id,
      status,
      received_by: user.id,
      received_at: status === 'verified' ? new Date().toISOString() : null,
      notes: notes ?? null,
    }, { onConflict: 'purchase_invoice_id' })
    .select('id,status,received_by,received_at,notes,updated_at')
    .single()

  if (receiptError || !receipt) return NextResponse.json({ error: receiptError?.message || 'Unable to save receiving record' }, { status: 400 })

  const rows = expectedItems.map(item => {
    const submitted = items.find(value => value.purchase_invoice_item_id === item.id)
    return {
      receipt_id: receipt.id,
      purchase_invoice_item_id: item.id,
      expected_quantity: Number(item.quantity),
      received_quantity: Number(submitted?.received_quantity ?? 0),
      notes: submitted?.notes ?? null,
    }
  })

  const { error: itemsError } = await supabase
    .from('purchase_receipt_items')
    .upsert(rows, { onConflict: 'purchase_invoice_item_id' })

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 })
  return NextResponse.json({ receipt })
}
