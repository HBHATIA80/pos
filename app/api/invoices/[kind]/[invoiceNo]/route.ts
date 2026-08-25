import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ kind: string; invoiceNo: string }> }

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

export async function GET(_request: Request, { params }: Params) {
  const { kind, invoiceNo } = await params
  const { supabase, user, profile } = await getContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'staff'].includes(profile.role)) return NextResponse.json({ error: 'Only admin or staff can view invoices' }, { status: 403 })
  if (!['purchase', 'sale'].includes(kind)) return NextResponse.json({ error: 'Invalid invoice type' }, { status: 400 })

  const table = kind === 'purchase' ? 'purchase_invoices' : 'sales_invoices'
  const itemsTable = kind === 'purchase' ? 'purchase_invoice_items' : 'sales_invoice_items'
  const dateColumn = kind === 'purchase' ? 'purchased_at' : 'sold_at'

  const { data: invoice, error } = await supabase
    .from(table)
    .select(`id,invoice_no,status,party_id,subtotal,discount_amount,grand_total,notes,created_at,${dateColumn},parties(id,name,phone,party_type),${itemsTable}(id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total)`)
    .eq('business_id', profile.business_id)
    .eq('invoice_no', invoiceNo)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message || 'Unable to load invoice' }, { status: 400 })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const raw = invoice as unknown as Record<string, unknown>
  return NextResponse.json({
    invoice: {
      ...raw,
      kind,
      date: raw[dateColumn] ?? null,
      party: raw.parties ?? null,
      items: raw[itemsTable] ?? [],
      parties: undefined,
      [itemsTable]: undefined,
    },
  })
}

export async function PATCH(request: Request, { params }: Params) {
  const { kind, invoiceNo } = await params
  const { supabase, user, profile } = await getContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'staff'].includes(profile.role)) return NextResponse.json({ error: 'Only admin or staff can edit invoices' }, { status: 403 })
  if (!['purchase', 'sale'].includes(kind)) return NextResponse.json({ error: 'Invalid invoice type' }, { status: 400 })

  const table = kind === 'purchase' ? 'purchase_invoices' : 'sales_invoices'
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'At least one product is required' }, { status: 400 })
  }

  const { data: invoice, error: findError } = await supabase
    .from(table)
    .select('id')
    .eq('business_id', profile.business_id)
    .eq('invoice_no', invoiceNo)
    .is('deleted_at', null)
    .maybeSingle()

  if (findError) return NextResponse.json({ error: findError.message }, { status: 400 })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data, error } = await supabase.rpc('edit_transaction_invoice', {
    p_kind: kind,
    p_invoice_id: invoice.id,
    p_payload: {
      party_id: body.party_id ?? null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      date: typeof body.date === 'string' ? body.date : null,
      items: body.items,
    },
  })

  if (error) return NextResponse.json({ error: error.message || 'Unable to edit invoice' }, { status: 400 })
  return NextResponse.json({ invoice: data })
}
