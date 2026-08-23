import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,is_active,full_name,phone')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
  if (!profile?.is_active || profile.role !== 'user') {
    return NextResponse.json({ error: 'Customer ledger is only available to customer portal users.' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const businessId = params.get('business_id')
  const fromValue = params.get('from')
  const toValue = params.get('to')
  const fromDate = parseDate(fromValue)
  const toDate = parseDate(toValue)

  if (!businessId) return NextResponse.json({ error: 'Select a shop to view its ledger.' }, { status: 400 })
  if (fromValue && !fromDate) return NextResponse.json({ error: 'Invalid From date. Use YYYY-MM-DD.' }, { status: 400 })
  if (toValue && !toDate) return NextResponse.json({ error: 'Invalid To date. Use YYYY-MM-DD.' }, { status: 400 })
  if (fromDate && toDate && fromDate > toDate) return NextResponse.json({ error: 'From date cannot be after To date.' }, { status: 400 })

  // The membership is the authorization boundary: the same Auth customer can
  // have a different Party and independent ledger in every shop.
  const { data: membership, error: membershipError } = await supabase
    .from('customer_business_memberships')
    .select('business_id,party_id,is_primary')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .maybeSingle()

  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 400 })
  if (!membership) return NextResponse.json({ error: 'You are not a customer of this shop.' }, { status: 403 })

  const [businessResult, partyResult] = await Promise.all([
    supabase.from('businesses').select('id,name,code,phone,address,status').eq('id', businessId).maybeSingle(),
    supabase.from('parties').select('id,name,phone,email,opening_balance,opening_balance_type').eq('id', membership.party_id).eq('business_id', businessId).maybeSingle(),
  ])

  if (businessResult.error) return NextResponse.json({ error: businessResult.error.message }, { status: 400 })
  if (partyResult.error) return NextResponse.json({ error: partyResult.error.message }, { status: 400 })
  if (!businessResult.data) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })

  let invoiceQuery = supabase
    .from('sales_invoices')
    .select(`
      id, invoice_no, status, order_channel, order_status, party_id,
      grand_total, created_at, sold_at, completed_at,
      sales_invoice_items(id, product_name, sku, unit_name, quantity, unit_price, line_total)
    `)
    .eq('business_id', businessId)
    .or('status.eq.completed,order_status.eq.delivered')
    .order('completed_at', { ascending: true, nullsFirst: false })

  // Include both shop-entered invoices linked to this shop-specific Party and
  // older customer-portal invoices created by this Auth user.
  invoiceQuery = invoiceQuery.or(`party_id.eq.${membership.party_id},created_by.eq.${user.id}`)

  const { data: invoices, error: invoiceError } = await invoiceQuery
  if (invoiceError) return NextResponse.json({ error: invoiceError.message || 'Unable to load invoices' }, { status: 400 })

  const invoiceRows = invoices ?? []
  const invoiceIds = invoiceRows.map((invoice) => invoice.id)

  const { data: payments, error: paymentsError } = invoiceIds.length
    ? await supabase
        .from('sale_payments')
        .select('id,invoice_id,party_id,payment_method,amount,reference_no,notes,paid_at,status,receipt_no')
        .in('invoice_id', invoiceIds)
        .eq('business_id', businessId)
        .eq('status', 'active')
        .order('paid_at', { ascending: true })
    : { data: [], error: null }

  if (paymentsError) return NextResponse.json({ error: paymentsError.message || 'Unable to load payments' }, { status: 400 })

  const paymentRows = payments ?? []
  const inRange = (value: string) => {
    const timestamp = new Date(value).getTime()
    if (Number.isNaN(timestamp)) return false
    if (fromDate && timestamp < fromDate.getTime()) return false
    if (toValue && timestamp >= new Date(`${toValue}T00:00:00.000Z`).getTime() + 86400000) return false
    return true
  }

  type Entry = {
    id: string
    type: 'purchase' | 'payment'
    date: string
    reference: string
    description: string
    debit: number
    credit: number
  }

  const rawEntries: Entry[] = invoiceRows.flatMap((invoice) => {
    const rows: Entry[] = [{
      id: invoice.id,
      type: 'purchase',
      date: invoice.completed_at ?? invoice.sold_at ?? invoice.created_at,
      reference: invoice.invoice_no,
      description: `Invoice ${invoice.invoice_no}`,
      debit: Number(invoice.grand_total ?? 0),
      credit: 0,
    }]

    for (const payment of paymentRows.filter((row) => row.invoice_id === invoice.id)) {
      rows.push({
        id: payment.id,
        type: 'payment',
        date: payment.paid_at,
        reference: payment.receipt_no || payment.reference_no || '',
        description: payment.payment_method === 'cash' ? 'Cash Payment' : 'Bank Payment',
        debit: 0,
        credit: Number(payment.amount ?? 0),
      })
    }
    return rows
  }).sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (diff !== 0) return diff
    if (a.type === b.type) return a.id.localeCompare(b.id)
    return a.type === 'purchase' ? -1 : 1
  })

  let runningBalance = 0
  if (fromDate) {
    for (const entry of rawEntries) {
      if (new Date(entry.date).getTime() < fromDate.getTime()) runningBalance += entry.debit - entry.credit
    }
  }

  const entries = rawEntries.filter((entry) => inRange(entry.date)).map((entry) => {
    runningBalance = Math.max(runningBalance + entry.debit - entry.credit, 0)
    return { ...entry, balance: Number(runningBalance.toFixed(2)) }
  })

  const invoicesForPeriod = invoiceRows.filter((invoice) => inRange(invoice.completed_at ?? invoice.sold_at ?? invoice.created_at))
  const purchases = invoicesForPeriod.map((invoice) => {
    const invoicePayments = paymentRows.filter((payment) => payment.invoice_id === invoice.id)
    const paidAmount = invoicePayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
    const grandTotal = Number(invoice.grand_total ?? 0)
    return {
      id: invoice.id,
      invoice_no: invoice.invoice_no,
      date: invoice.completed_at ?? invoice.sold_at ?? invoice.created_at,
      status: invoice.order_status ?? invoice.status,
      order_channel: invoice.order_channel,
      grand_total: grandTotal,
      items: invoice.sales_invoice_items ?? [],
      paid_amount: Number(paidAmount.toFixed(2)),
      balance_amount: Number(Math.max(grandTotal - paidAmount, 0).toFixed(2)),
    }
  }).reverse()

  const paymentsForPeriod = paymentRows
    .filter((payment) => inRange(payment.paid_at))
    .map((payment) => {
      const invoice = invoiceRows.find((row) => row.id === payment.invoice_id)
      return {
        ...payment,
        amount: Number(payment.amount ?? 0),
        invoice_no: invoice?.invoice_no ?? null,
      }
    }).reverse()

  const purchaseTotal = entries.filter((entry) => entry.type === 'purchase').reduce((sum, entry) => sum + entry.debit, 0)
  const paidTotal = entries.filter((entry) => entry.type === 'payment').reduce((sum, entry) => sum + entry.credit, 0)

  return NextResponse.json({
    customer: { id: user.id, name: partyResult.data?.name || profile.full_name || 'Customer', party_id: membership.party_id },
    shop: businessResult.data,
    party: partyResult.data,
    filters: { from: fromValue || null, to: toValue || null },
    summary: {
      purchase_count: purchases.length,
      purchase_total: Number(purchaseTotal.toFixed(2)),
      paid_total: Number(paidTotal.toFixed(2)),
      outstanding_total: Number(runningBalance.toFixed(2)),
    },
    purchases,
    invoices: purchases,
    payments: paymentsForPeriod,
    entries: entries.reverse(),
  })
}
