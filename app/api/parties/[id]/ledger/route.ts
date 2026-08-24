import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}
function signedOpening(amount: number, type: string) { if (type === 'payable') return -Math.abs(amount); if (type === 'receivable') return Math.abs(amount); return 0 }
function dateOnly(value: string) { return new Date(`${value}T00:00:00`).toISOString() }

export async function GET(request: NextRequest, context: RouteContext) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params
  const partyId = z.string().uuid().safeParse(id)
  if (!partyId.success) return NextResponse.json({ error: 'Invalid party id' }, { status: 400 })

  const params = request.nextUrl.searchParams
  const rawStart = params.get('start_date') ?? new Date().toISOString().slice(0, 10)
  const rawEnd = params.get('end_date') ?? ''
  const start = dateSchema.safeParse(rawStart)
  const end = rawEnd ? dateSchema.safeParse(rawEnd) : null
  if (!start.success || (end && !end.success)) return NextResponse.json({ error: 'Dates must use YYYY-MM-DD format' }, { status: 400 })
  if (rawEnd && rawEnd < rawStart) return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 })

  const { data: party, error: partyError } = await supabase.from('parties').select('id,party_code,party_type,name,phone,opening_balance,opening_balance_type,is_active').eq('id', partyId.data).eq('business_id', profile.business_id).maybeSingle()
  if (partyError) return NextResponse.json({ error: partyError.message }, { status: 400 })
  if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

  const startAt = dateOnly(rawStart)
  const endExclusive = rawEnd ? new Date(`${rawEnd}T00:00:00`) : null
  if (endExclusive) endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)

  const { data: invoices, error: invoiceError } = await supabase.from('sales_invoices').select('id,invoice_no,grand_total,status,completed_at,sold_at,created_at').eq('business_id', profile.business_id).eq('party_id', party.id).eq('status', 'completed').order('completed_at', { ascending: true })
  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 400 })

  const { data: purchases, error: purchaseError } = await supabase.from('purchase_invoices').select('id,invoice_no,grand_total,status,purchased_at,created_at').eq('business_id', profile.business_id).eq('party_id', party.id).eq('status', 'completed').order('purchased_at', { ascending: true })
  if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 400 })

  const { data: payments, error: paymentError } = await supabase.from('sale_payments').select('id,invoice_id,payment_method,amount,reference_no,notes,paid_at,status,created_at').eq('business_id', profile.business_id).eq('party_id', party.id).eq('status', 'active').order('paid_at', { ascending: true })
  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 })

  const { data: vouchers, error: voucherError } = await supabase.from('account_vouchers').select('id,voucher_no,voucher_type,payment_method,account_name,amount,reference_no,notes,paid_at,status').eq('business_id', profile.business_id).eq('party_id', party.id).eq('status', 'active').order('paid_at', { ascending: true })
  if (voucherError) return NextResponse.json({ error: voucherError.message }, { status: 400 })

  const openingMaster = signedOpening(Number(party.opening_balance ?? 0), party.opening_balance_type)
  let openingBalance = openingMaster
  for (const invoice of invoices ?? []) { const date = invoice.completed_at ?? invoice.sold_at ?? invoice.created_at; if (date < startAt) openingBalance += Number(invoice.grand_total ?? 0) }
  for (const purchase of purchases ?? []) { const date = purchase.purchased_at ?? purchase.created_at; if (date < startAt) openingBalance -= Number(purchase.grand_total ?? 0) }
  for (const payment of payments ?? []) { if (payment.paid_at < startAt) openingBalance -= Number(payment.amount ?? 0) }
  for (const voucher of vouchers ?? []) { if (voucher.paid_at < startAt) openingBalance += voucher.voucher_type === 'payment' ? Number(voucher.amount ?? 0) : -Number(voucher.amount ?? 0) }

  const entries: Array<{ id: string; date: string; type: 'opening' | 'invoice' | 'purchase' | 'payment' | 'receipt_voucher' | 'payment_voucher'; description: string; reference: string; debit: number; credit: number; balance: number; payment_method?: string; notes?: string }> = []
  entries.push({ id: `opening-${party.id}-${rawStart}`, date: startAt, type: 'opening', description: 'Opening Balance', reference: '', debit: openingBalance > 0 ? openingBalance : 0, credit: openingBalance < 0 ? Math.abs(openingBalance) : 0, balance: openingBalance })

  for (const invoice of invoices ?? []) {
    const date = invoice.completed_at ?? invoice.sold_at ?? invoice.created_at
    if (date < startAt || (endExclusive && date >= endExclusive.toISOString())) continue
    entries.push({ id: invoice.id, date, type: 'invoice', description: `Sales Invoice ${invoice.invoice_no}`, reference: invoice.invoice_no, debit: Number(invoice.grand_total ?? 0), credit: 0, balance: 0 })
  }
  for (const purchase of purchases ?? []) {
    const date = purchase.purchased_at ?? purchase.created_at
    if (date < startAt || (endExclusive && date >= endExclusive.toISOString())) continue
    entries.push({ id: purchase.id, date, type: 'purchase', description: `Purchase Invoice ${purchase.invoice_no}`, reference: purchase.invoice_no, debit: 0, credit: Number(purchase.grand_total ?? 0), balance: 0 })
  }
  for (const payment of payments ?? []) {
    if (payment.paid_at < startAt || (endExclusive && payment.paid_at >= endExclusive.toISOString())) continue
    entries.push({ id: payment.id, date: payment.paid_at, type: 'payment', description: payment.payment_method === 'cash' ? 'Cash Receipt Against Invoice' : 'Bank Receipt Against Invoice', reference: payment.reference_no ?? '', debit: 0, credit: Number(payment.amount ?? 0), balance: 0, payment_method: payment.payment_method, notes: payment.notes ?? '' })
  }
  for (const voucher of vouchers ?? []) {
    if (voucher.paid_at < startAt || (endExclusive && voucher.paid_at >= endExclusive.toISOString())) continue
    const isReceipt = voucher.voucher_type === 'receipt'
    entries.push({ id: voucher.id, date: voucher.paid_at, type: isReceipt ? 'receipt_voucher' : 'payment_voucher', description: isReceipt ? `Receipt Voucher ${voucher.voucher_no}` : `Payment Voucher ${voucher.voucher_no}`, reference: voucher.reference_no || voucher.voucher_no, debit: isReceipt ? 0 : Number(voucher.amount ?? 0), credit: isReceipt ? Number(voucher.amount ?? 0) : 0, balance: 0, payment_method: voucher.payment_method, notes: [voucher.account_name, voucher.notes].filter(Boolean).join(' · ') })
  }

  entries.sort((a, b) => { if (a.type === 'opening') return -1; if (b.type === 'opening') return 1; return new Date(a.date).getTime() - new Date(b.date).getTime() })
  let running = 0
  const ledger = entries.map(entry => { running += entry.debit - entry.credit; return { ...entry, balance: Number(running.toFixed(2)) } })
  const debitTotal = ledger.reduce((sum, e) => sum + e.debit, 0)
  const creditTotal = ledger.reduce((sum, e) => sum + e.credit, 0)
  const finalBalance = Number((debitTotal - creditTotal).toFixed(2))

  return NextResponse.json({ party: { id: party.id, party_code: party.party_code, party_type: party.party_type, name: party.name, phone: party.phone, opening_balance: Number(party.opening_balance ?? 0), opening_balance_type: party.opening_balance_type }, period: { start_date: rawStart, end_date: rawEnd || null }, opening_balance: Number(openingBalance.toFixed(2)), debit_total: Number(debitTotal.toFixed(2)), credit_total: Number(creditTotal.toFixed(2)), final_balance: finalBalance, balance_type: finalBalance > 0 ? 'receivable' : finalBalance < 0 ? 'payable' : 'settled', entries: ledger })
}
