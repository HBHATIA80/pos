import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedTypes = ['all', 'sales', 'purchases', 'payments', 'receipts', 'expenses', 'parties'] as const
type RecordType = typeof allowedTypes[number]

type RecordRow = { id: string; type: Exclude<RecordType, 'all'>; number: string; party: string; date: string; amount: number; status: string; method: string; description: string }

function inDateRange(value: string, from: string | null, to: string | null) {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return false
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false
  return true
}

function inAmountRange(value: number, min: number | null, max: number | null) {
  if (min !== null && value < min) return false
  if (max !== null && value > max) return false
  return true
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin or staff access required.' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const requestedType = params.get('type') || 'all'
  const type: RecordType = (allowedTypes as readonly string[]).includes(requestedType) ? requestedType as RecordType : 'all'
  const from = params.get('from') || null
  const to = params.get('to') || null
  const minAmountRaw = params.get('min_amount')
  const maxAmountRaw = params.get('max_amount')
  const minAmount = minAmountRaw && Number.isFinite(Number(minAmountRaw)) ? Number(minAmountRaw) : null
  const maxAmount = maxAmountRaw && Number.isFinite(Number(maxAmountRaw)) ? Number(maxAmountRaw) : null
  const search = (params.get('q') || '').trim().toLowerCase()
  const limit = Math.min(Math.max(Number(params.get('limit') || 500), 1), 1000)

  const should = (name: Exclude<RecordType, 'all'>) => type === 'all' || type === name
  const rows: RecordRow[] = []

  if (should('sales')) {
    const { data, error } = await supabase.from('sales_invoices').select('id,invoice_no,status,grand_total,sold_at,created_at,parties(name),notes').eq('business_id', profile.business_id).is('deleted_at', null).order('created_at', { ascending: false }).limit(limit)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    for (const row of data ?? []) {
      const date = row.sold_at || row.created_at
      rows.push({ id: `sale-${row.id}`, type: 'sales', number: row.invoice_no, party: row.parties?.name || 'Walk-in customer', date, amount: Number(row.grand_total) || 0, status: row.status, method: 'Invoice', description: row.notes || 'Sales invoice' })
    }
  }

  if (should('purchases')) {
    const { data, error } = await supabase.from('purchase_invoices').select('id,invoice_no,status,grand_total,purchased_at,created_at,party:parties(name),notes').eq('business_id', profile.business_id).is('deleted_at', null).order('created_at', { ascending: false }).limit(limit)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    for (const row of data ?? []) {
      const date = row.purchased_at || row.created_at
      rows.push({ id: `purchase-${row.id}`, type: 'purchases', number: row.invoice_no, party: row.party?.name || 'Cash purchase', date, amount: Number(row.grand_total) || 0, status: row.status, method: 'Invoice', description: row.notes || 'Purchase invoice' })
    }
  }

  if (should('payments') || should('receipts')) {
    const voucherTypes = should('payments') && should('receipts') ? null : should('payments') ? 'payment' : 'receipt'
    let query = supabase.from('account_vouchers').select('id,voucher_no,voucher_type,payment_method,account_name,amount,reference_no,notes,paid_at,status,parties(name)').eq('business_id', profile.business_id).eq('status', 'active').order('paid_at', { ascending: false }).limit(limit)
    if (voucherTypes) query = query.eq('voucher_type', voucherTypes)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    for (const row of data ?? []) {
      const rowType = row.voucher_type === 'receipt' ? 'receipts' : 'payments'
      rows.push({ id: `voucher-${row.id}`, type: rowType, number: row.voucher_no, party: row.parties?.name || row.account_name || 'General', date: row.paid_at, amount: Number(row.amount) || 0, status: row.status, method: row.payment_method, description: row.notes || row.reference_no || `${row.voucher_type} voucher` })
    }

    if (should('receipts')) {
      const { data: salePayments, error: salePaymentError } = await supabase.from('sale_payments').select('id,receipt_no,payment_method,amount,reference_no,notes,paid_at,status,parties(name),sales_invoices!inner(invoice_no)').eq('business_id', profile.business_id).eq('status', 'active').order('paid_at', { ascending: false }).limit(limit)
      if (salePaymentError) return NextResponse.json({ error: salePaymentError.message }, { status: 400 })
      for (const row of salePayments ?? []) rows.push({ id: `sale-payment-${row.id}`, type: 'receipts', number: row.receipt_no, party: row.parties?.name || 'Walk-in customer', date: row.paid_at, amount: Number(row.amount) || 0, status: row.status, method: row.payment_method, description: row.notes || `Receipt against ${row.sales_invoices?.invoice_no || 'invoice'}` })
    }
  }

  if (should('expenses')) {
    const { data, error } = await supabase.from('expenses').select('id,expense_no,category,description,amount,payment_method,expense_date,notes').eq('business_id', profile.business_id).order('expense_date', { ascending: false }).limit(limit)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    for (const row of data ?? []) rows.push({ id: `expense-${row.id}`, type: 'expenses', number: row.expense_no, party: row.category, date: row.expense_date, amount: Number(row.amount) || 0, status: 'active', method: row.payment_method, description: row.notes || row.description })
  }

  if (should('parties')) {
    const { data, error } = await supabase.from('parties').select('id,name,party_code,party_type,phone,created_at,is_active').eq('business_id', profile.business_id).order('created_at', { ascending: false }).limit(limit)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    for (const row of data ?? []) rows.push({ id: `party-${row.id}`, type: 'parties', number: row.party_code || '—', party: row.name, date: row.created_at, amount: 0, status: row.is_active ? 'active' : 'inactive', method: row.party_type, description: row.phone || 'Party master' })
  }

  const filtered = rows.filter(row => inDateRange(row.date, from, to) && inAmountRange(row.amount, minAmount, maxAmount) && (!search || `${row.number} ${row.party} ${row.description} ${row.method} ${row.type}`.toLowerCase().includes(search)))
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalAmount = filtered.reduce((sum, row) => sum + row.amount, 0)
  const counts = filtered.reduce<Record<string, number>>((acc, row) => { acc[row.type] = (acc[row.type] || 0) + 1; return acc }, {})
  return NextResponse.json({ records: filtered, total: filtered.length, totalAmount, counts }, { headers: { 'Cache-Control': 'no-store' } })
}
