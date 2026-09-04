import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const paymentSchema = z.object({
  payment_method: z.enum(['cash', 'bank', 'party_transfer']),
  amount: z.coerce.number().positive(),
  destination_party_id: z.string().uuid().nullable().optional(),
  reference_no: z.string().trim().max(200).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
})

type RouteContext = { params: Promise<{ id: string }> }

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (profileError) console.error('Payment profile lookup error:', profileError)
  return { supabase, user, profile }
}

async function readSummary(supabase: Awaited<ReturnType<typeof createClient>>, invoiceId: string) {
  const { data, error } = await supabase.rpc('get_sales_invoice_payment_summary', { p_invoice_id: invoiceId })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { invoice_id: row.invoice_id, grand_total: Number(row.grand_total ?? 0), paid_amount: Number(row.paid_amount ?? 0), balance_amount: Number(row.balance_amount ?? 0), payment_status: row.payment_status }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user, profile } = await getContext()
    if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params
    const invoiceId = z.string().uuid().safeParse(id)
    if (!invoiceId.success) return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 })
    const summary = await readSummary(supabase, invoiceId.data)
    if (!summary) return NextResponse.json({ error: 'Payment summary not found' }, { status: 404 })
    const { data: invoice, error: invoiceError } = await supabase.from('sales_invoices').select('party_id,parties(id,name,phone,party_type)').eq('id', invoiceId.data).eq('business_id', profile.business_id).maybeSingle()
    if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 400 })
    const party = Array.isArray(invoice?.parties) ? invoice.parties[0] : invoice?.parties
    return NextResponse.json({ summary, customer: invoice?.party_id ? { id: invoice.party_id, name: party?.name ?? 'Customer' } : null })
  } catch (error) {
    console.error('GET payment route error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load payment information' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user, profile } = await getContext()
    if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params
    const invoiceId = z.string().uuid().safeParse(id)
    if (!invoiceId.success) return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 })
    const parsed = paymentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payment' }, { status: 400 })
    const { payment_method, amount, destination_party_id, reference_no, notes } = parsed.data
    let data
    if (payment_method === 'party_transfer') {
      if (!destination_party_id) return NextResponse.json({ error: 'Select the party receiving the direct transfer' }, { status: 400 })
      const result = await supabase.rpc('record_sale_payment_to_party', { p_invoice_id: invoiceId.data, p_destination_party_id: destination_party_id, p_amount: amount, p_reference_no: reference_no || null, p_notes: notes || null, p_paid_at: new Date().toISOString() })
      if (result.error) throw result.error
      data = result.data
    } else {
      const result = await supabase.rpc('record_sale_payment', { p_invoice_id: invoiceId.data, p_payment_method: payment_method, p_amount: amount, p_reference_no: reference_no || null, p_notes: notes || null, p_paid_at: new Date().toISOString() })
      if (result.error) throw result.error
      data = result.data
    }
    const summary = await readSummary(supabase, invoiceId.data)
    return NextResponse.json({ payment: data, summary }, { status: 201 })
  } catch (error) {
    console.error('POST payment route error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save payment' }, { status: 500 })
  }
}
