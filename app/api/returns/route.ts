import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid return date')
const itemSchema = z.object({ product_id: z.string().uuid(), source_invoice_item_id: z.string().uuid().optional().nullable(), quantity: z.coerce.number().positive(), unit_price: z.coerce.number().min(0), discount_amount: z.coerce.number().min(0).default(0) })
const returnSchema = z.object({ return_type: z.enum(['sale_return', 'purchase_return']), party_id: z.string().uuid(), source_invoice_id: z.string().uuid().optional().nullable(), source_invoice_type: z.enum(['sale', 'purchase']).optional().nullable(), reason: z.string().trim().max(500).optional().or(z.literal('')), notes: z.string().trim().max(1500).optional().or(z.literal('')), items: z.array(itemSchema).min(1) })
type ReturnItemRow = { id: string; product_id: string; sku: string; product_name: string; unit_name: string; quantity: number; unit_price: number; discount_amount: number; line_total: number }
type ReturnQuantityRow = { source_invoice_item_id: string | null; quantity: number }

export async function GET(request: NextRequest) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const type = request.nextUrl.searchParams.get('type')
  const partyId = request.nextUrl.searchParams.get('party_id')
  const invoiceId = request.nextUrl.searchParams.get('invoice_id')

  if (invoiceId && type) {
    const table = type === 'sale_return' ? 'sales_invoices' : 'purchase_invoices'
    const itemsTable = type === 'sale_return' ? 'sales_invoice_items' : 'purchase_invoice_items'
    const dateColumn = type === 'sale_return' ? 'sold_at' : 'purchased_at'
    const { data, error } = await supabase.from(table).select(`id,invoice_no,party_id,grand_total,status,${dateColumn},items:${itemsTable}(id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total)`).eq('business_id', profile.business_id).eq('id', invoiceId).eq('status', 'completed').is('deleted_at', null).is('cancelled_at', null).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ invoice: null })
    const { data: returned, error: returnedError } = await supabase.from('return_voucher_items').select('source_invoice_item_id,quantity,return_vouchers!inner(source_invoice_id,return_type,status,business_id)').eq('return_vouchers.source_invoice_id', invoiceId).eq('return_vouchers.return_type', type).eq('return_vouchers.status', 'completed').eq('return_vouchers.business_id', profile.business_id)
    if (returnedError) return NextResponse.json({ error: returnedError.message }, { status: 400 })
    const totals = new Map<string, number>()
    for (const row of (returned ?? []) as unknown as ReturnQuantityRow[]) if (row.source_invoice_item_id) totals.set(row.source_invoice_item_id, (totals.get(row.source_invoice_item_id) ?? 0) + Number(row.quantity || 0))
    const rawItems = ((data as unknown as { items?: ReturnItemRow[] }).items ?? [])
    const items = rawItems.map(item => ({ ...item, returned_quantity: totals.get(item.id) ?? 0, remaining_quantity: Math.max(Number(item.quantity) - (totals.get(item.id) ?? 0), 0) }))
    return NextResponse.json({ invoice: { ...data, items } })
  }

  if (partyId && type) {
    const table = type === 'sale_return' ? 'sales_invoices' : 'purchase_invoices'
    const dateColumn = type === 'sale_return' ? 'sold_at' : 'purchased_at'
    const { data, error } = await supabase.from(table).select(`id,invoice_no,party_id,grand_total,status,${dateColumn}`).eq('business_id', profile.business_id).eq('party_id', partyId).eq('status', 'completed').is('deleted_at', null).is('cancelled_at', null).order(dateColumn, { ascending: false }).limit(50)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ invoices: data ?? [] })
  }

  const { data, error } = await supabase.from('return_vouchers').select('id,return_no,return_type,status,party_id,source_invoice_id,source_invoice_type,return_date,grand_total,reason,notes,created_at,party:parties!return_vouchers_party_id_fkey(id,name,party_code)').eq('business_id', profile.business_id).order('return_date', { ascending: false }).order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ returns: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id || profile.role === 'user') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const parsed = returnSchema.safeParse(body?.data)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid return voucher' }, { status: 400 })
  const cookieStore = await cookies()
  const selectedDate = typeof body?.return_date === 'string' ? body.return_date : cookieStore.get('bizbook_invoice_date')?.value || new Date().toISOString().slice(0, 10)
  if (!dateSchema.safeParse(selectedDate).success || selectedDate > new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: 'Return date must be a valid date up to today' }, { status: 400 })
  const { data, error } = await supabase.rpc('create_return_voucher', { payload: parsed.data, p_return_date: selectedDate, p_complete: true })
  if (error) return NextResponse.json({ error: error.message || 'Unable to save return' }, { status: 400 })
  return NextResponse.json({ return: data, return_date: selectedDate }, { status: 201 })
}

export async function PATCH(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id || profile.role === 'user') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const id = z.string().uuid().safeParse(body?.id)
  if (!id.success || body?.action !== 'void') return NextResponse.json({ error: 'Invalid return action' }, { status: 400 })
  const { data, error } = await supabase.rpc('void_return_voucher', { p_return_id: id.data })
  if (error) return NextResponse.json({ error: error.message || 'Unable to void return' }, { status: 400 })
  return NextResponse.json({ return: data })
}
