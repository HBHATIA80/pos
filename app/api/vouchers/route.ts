import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  voucher_type: z.enum(['receipt', 'payment']),
  party_id: z.string().uuid().nullable().optional(),
  invoice_id: z.string().uuid().nullable().optional(),
  payment_method: z.enum(['cash', 'bank', 'upi', 'card', 'cheque', 'other']),
  account_name: z.string().trim().max(120).optional().or(z.literal('')),
  amount: z.coerce.number().positive(),
  reference_no: z.string().trim().max(200).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  paid_at: z.string().datetime().optional(),
})

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,business_id,is_active')
    .eq('id', user.id)
    .maybeSingle()
  return { supabase, user, profile }
}

export async function GET(request: NextRequest) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = request.nextUrl.searchParams.get('type')
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 100), 1), 200)

  const { data: vouchers, error } = await supabase
    .from('account_vouchers')
    .select('id,voucher_no,voucher_type,party_id,payment_method,account_name,amount,reference_no,notes,paid_at,status,parties(id,name,party_type)')
    .eq('business_id', profile.business_id)
    .eq('status', 'active')
    .eq(type === 'receipt' || type === 'payment' ? 'voucher_type' : 'voucher_type', type === 'receipt' || type === 'payment' ? type : 'receipt')
    .order('paid_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message || 'Unable to load vouchers' }, { status: 400 })

  const { data: salePayments, error: paymentError } = await supabase
    .from('sale_payments')
    .select('id,receipt_no,payment_method,amount,reference_no,notes,paid_at,status,invoice_id,parties(id,name,party_type),sales_invoices!inner(invoice_no,grand_total)')
    .eq('business_id', profile.business_id)
    .eq('status', 'active')
    .order('paid_at', { ascending: false })
    .limit(limit)

  if (paymentError) return NextResponse.json({ error: paymentError.message || 'Unable to load invoice payments' }, { status: 400 })

  return NextResponse.json({ vouchers: vouchers ?? [], salePayments: salePayments ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid voucher' }, { status: 400 })

  const value = parsed.data

  if (value.voucher_type === 'receipt' && value.invoice_id) {
    const { data, error } = await supabase.rpc('record_sale_payment', {
      p_invoice_id: value.invoice_id,
      p_payment_method: value.payment_method === 'cash' ? 'cash' : 'bank',
      p_amount: value.amount,
      p_reference_no: value.reference_no || null,
      p_notes: value.notes || null,
      p_paid_at: value.paid_at || new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message || 'Unable to record invoice receipt' }, { status: 400 })
    return NextResponse.json({ salePayment: data, voucher: null }, { status: 201 })
  }

  if (value.party_id) {
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('id')
      .eq('id', value.party_id)
      .eq('business_id', profile.business_id)
      .maybeSingle()
    if (partyError) return NextResponse.json({ error: partyError.message }, { status: 400 })
    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('account_vouchers')
    .insert({
      business_id: profile.business_id,
      voucher_type: value.voucher_type,
      party_id: value.party_id || null,
      payment_method: value.payment_method,
      account_name: value.account_name || null,
      amount: value.amount,
      reference_no: value.reference_no || null,
      notes: value.notes || null,
      paid_at: value.paid_at || new Date().toISOString(),
      created_by: user.id,
    })
    .select('id,voucher_no,voucher_type,party_id,payment_method,account_name,amount,reference_no,notes,paid_at,status,parties(id,name,party_type)')
    .single()

  if (error) return NextResponse.json({ error: error.message || 'Unable to save voucher' }, { status: 400 })
  return NextResponse.json({ voucher: data }, { status: 201 })
}
