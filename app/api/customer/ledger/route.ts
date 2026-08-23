import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizePhone(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function createServerAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase service role configuration is missing.')
  }

  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active,full_name,phone,party_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message || 'Unable to load customer profile' }, { status: 400 })
  }

  if (!profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'user') {
    return NextResponse.json({ error: 'Customer ledger is only available to customer portal users.' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const fromValue = params.get('from')
  const toValue = params.get('to')
  const fromDate = parseDate(fromValue)
  const toDate = parseDate(toValue)

  if (fromValue && !fromDate) {
    return NextResponse.json({ error: 'Invalid From date. Use YYYY-MM-DD.' }, { status: 400 })
  }
  if (toValue && !toDate) {
    return NextResponse.json({ error: 'Invalid To date. Use YYYY-MM-DD.' }, { status: 400 })
  }
  if (fromDate && toDate && fromDate > toDate) {
    return NextResponse.json({ error: 'From date cannot be after To date.' }, { status: 400 })
  }

  const admin = createServerAdminClient()

  // Resolve the customer's party inside the authenticated business. Prefer
  // the explicit profile link, then use phone/name as recovery for older data.
  const { data: parties, error: partyError } = await admin
    .from('parties')
    .select('id,name,phone,email,party_type,is_active')
    .eq('business_id', profile.business_id)
    .in('party_type', ['customer', 'both'])
    .eq('is_active', true)

  if (partyError) {
    return NextResponse.json({ error: partyError.message || 'Unable to load customer party' }, { status: 400 })
  }

  let partyId: string | null = null
  let partyName: string | null = null

  if (profile.party_id) {
    const linked = (parties ?? []).find((party) => party.id === profile.party_id)
    if (linked) {
      partyId = linked.id
      partyName = linked.name
    }
  }

  if (!partyId) {
    const phone = normalizePhone(profile.phone)
    const matches = phone
      ? (parties ?? []).filter((party) => normalizePhone(party.phone) === phone)
      : []
    if (matches.length === 1) {
      partyId = matches[0].id
      partyName = matches[0].name
    }
  }

  if (!partyId) {
    const name = normalizeName(profile.full_name)
    const matches = name
      ? (parties ?? []).filter((party) => normalizeName(party.name) === name)
      : []
    if (matches.length === 1) {
      partyId = matches[0].id
      partyName = matches[0].name
    }
  }

  // IMPORTANT: a customer's own portal orders historically have party_id = null.
  // Never replace the created_by condition with party_id. The ledger must include
  // BOTH the customer's own portal orders AND shop-entered sales linked to the
  // customer's party.
  let invoiceQuery = admin
    .from('sales_invoices')
    .select(`
      id, invoice_no, status, order_channel, order_status, party_id,
      grand_total, created_at, sold_at, completed_at,
      sales_invoice_items(id, product_name, sku, unit_name, quantity, unit_price, line_total)
    `)
    .eq('business_id', profile.business_id)
    .or('status.eq.completed,order_status.eq.delivered')

  if (partyId) {
    invoiceQuery = invoiceQuery.or(`created_by.eq.${user.id},party_id.eq.${partyId}`)
  } else {
    invoiceQuery = invoiceQuery.eq('created_by', user.id)
  }

  const { data: invoices, error: invoiceError } = await invoiceQuery
    .order('completed_at', { ascending: true, nullsFirst: false })

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message || 'Unable to load customer ledger' }, { status: 400 })
  }

  const invoiceRows = invoices ?? []
  const invoiceIds = invoiceRows.map((invoice) => invoice.id)

  const payments = invoiceIds.length
    ? await admin
        .from('sale_payments')
        .select('id,invoice_id,party_id,payment_method,amount,reference_no,notes,paid_at,status')
        .in('invoice_id', invoiceIds)
        .eq('business_id', profile.business_id)
        .eq('status', 'active')
        .order('paid_at', { ascending: true })
    : { data: [], error: null }

  if (payments.error) {
    return NextResponse.json({ error: payments.error.message || 'Unable to load customer ledger payments' }, { status: 400 })
  }

  const paymentRows = payments.data ?? []
  const rawEntries = invoiceRows.flatMap((invoice) => {
    const rows: Array<{
      id: string
      type: 'purchase' | 'payment'
      date: string
      reference: string
      description: string
      debit: number
      credit: number
    }> = [{
      id: invoice.id,
      type: 'purchase',
      date: invoice.completed_at ?? invoice.sold_at ?? invoice.created_at,
      reference: invoice.invoice_no,
      description: `Purchase ${invoice.invoice_no}`,
      debit: Number(invoice.grand_total ?? 0),
      credit: 0,
    }]

    for (const payment of paymentRows.filter((row) => row.invoice_id === invoice.id)) {
      rows.push({
        id: payment.id,
        type: 'payment',
        date: payment.paid_at,
        reference: payment.reference_no ?? '',
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

  const inRange = (value: string) => {
    const timestamp = new Date(value).getTime()
    if (Number.isNaN(timestamp)) return false
    if (fromDate && timestamp < fromDate.getTime()) return false
    if (toValue) {
      const endExclusive = new Date(`${toValue}T00:00:00.000Z`).getTime() + 86400000
      if (timestamp >= endExclusive) return false
    }
    return true
  }

  let runningBalance = 0
  if (fromDate) {
    for (const entry of rawEntries) {
      if (new Date(entry.date).getTime() < fromDate.getTime()) {
        runningBalance += entry.debit - entry.credit
      }
    }
  }

  const entries = rawEntries
    .filter((entry) => inRange(entry.date))
    .map((entry) => {
      runningBalance = Math.max(runningBalance + entry.debit - entry.credit, 0)
      return { ...entry, balance: Number(runningBalance.toFixed(2)) }
    })

  const purchases = invoiceRows
    .filter((invoice) => inRange(invoice.completed_at ?? invoice.sold_at ?? invoice.created_at))
    .map((invoice) => {
      const paidAmount = paymentRows
        .filter((payment) => payment.invoice_id === invoice.id && inRange(payment.paid_at))
        .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
      const grandTotal = Number(invoice.grand_total ?? 0)

      return {
        id: invoice.id,
        invoice_no: invoice.invoice_no,
        date: invoice.completed_at ?? invoice.sold_at ?? invoice.created_at,
        status: invoice.order_status ?? invoice.status,
        grand_total: grandTotal,
        items: invoice.sales_invoice_items ?? [],
        paid_amount: Number(paidAmount.toFixed(2)),
        balance_amount: Number(Math.max(grandTotal - paidAmount, 0).toFixed(2)),
      }
    })
    .reverse()

  const purchaseTotal = entries
    .filter((entry) => entry.type === 'purchase')
    .reduce((sum, entry) => sum + entry.debit, 0)
  const paidTotal = entries
    .filter((entry) => entry.type === 'payment')
    .reduce((sum, entry) => sum + entry.credit, 0)

  return NextResponse.json({
    customer: {
      id: user.id,
      name: partyName || profile.full_name || 'Customer',
      party_id: partyId,
    },
    filters: { from: fromValue || null, to: toValue || null },
    summary: {
      purchase_count: purchases.length,
      purchase_total: Number(purchaseTotal.toFixed(2)),
      paid_total: Number(paidTotal.toFixed(2)),
      outstanding_total: Number(runningBalance.toFixed(2)),
    },
    purchases,
    entries: entries.reverse(),
  })
}
