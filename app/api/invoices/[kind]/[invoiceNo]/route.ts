import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ kind: string; invoiceNo: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { kind, invoiceNo } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'staff'].includes(profile.role)) return NextResponse.json({ error: 'Only admin or staff can view invoices' }, { status: 403 })
  if (!['purchase', 'sale'].includes(kind)) return NextResponse.json({ error: 'Invalid invoice type' }, { status: 400 })

  const table = kind === 'purchase' ? 'purchase_invoices' : 'sales_invoices'
  const itemsTable = kind === 'purchase' ? 'purchase_invoice_items' : 'sales_invoice_items'
  const dateColumn = kind === 'purchase' ? 'purchased_at' : 'sold_at'

  const { data: invoice, error } = await supabase
    .from(table)
    .select(`id,invoice_no,status,party_id,subtotal,discount_amount,grand_total,notes,created_at,${dateColumn},parties(id,name,phone,party_type),${itemsTable}(id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total)`)
    .eq('business_id', profile.business_id)
    .eq('invoice_no', invoiceNo)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message || 'Unable to load invoice' }, { status: 400 })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const raw = invoice as any
  return NextResponse.json({ invoice: { ...raw, kind, date: raw[dateColumn] ?? null, party: raw.parties ?? null, items: raw[itemsTable] ?? [], parties: undefined, [itemsTable]: undefined } })
}
