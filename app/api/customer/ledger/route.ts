import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active,full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'user') {
    return NextResponse.json({ error: 'Customer ledger is only available to customer portal users.' }, { status: 403 })
  }

  const { data: invoices, error: invoiceError } = await supabase
    .from('sales_invoices')
    .select(`
      id,
      invoice_no,
      status,
      order_channel,
      order_status,
      grand_total,
      created_at,
      sold_at,
      completed_at,
      sales_invoice_items(
        id,
        product_name,
        sku,
        unit_name,
        quantity,
        unit_price,
        line_total
      )
    `)
    .eq('business_id', profile.business_id)
    .eq('created_by', user.id)
    .eq('order_channel', 'customer_portal')
    .eq('order_status', 'delivered')
    .eq('status', 'completed')
    .order('completed_at', { ascending: true })

  if (invoiceError) {
    console.error('Customer ledger invoice error:', invoiceError)
    return NextResponse.json({ error: invoiceError.message || 'Unable to load ledger' }, { status: 400 })
  }

  const invoiceIds = (invoices ?? []).map((invoice) => invoice.id)
  const payments = invoiceIds.length
    ? await supabase
        .from('sale_payments')
        .select('id,invoice_id,payment_method,amount,reference_no,notes,paid_at,status')
        .in('invoice_id', invoiceIds)
        .eq('business_id', profile.business_id)
        .order('paid_at', { ascending: true })
    : { data: [], error: null }

  if (payments.error) {
    console.error('Customer ledger payment error:', payments.error)
    return NextResponse.json({ error: payments.error.message || 'Unable to load ledger payments' }, { status: 400 })
  }

  const paymentByInvoice = new Map<string, number>()
  for (const payment of payments.data ?? []) {
    if (payment.status !== 'active') continue
    paymentByInvoice.set(payment.invoice_id, (paymentByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount ?? 0))
  }

  const rawEntries = (invoices ?? []).flatMap((invoice) => {
    const invoiceAmount = Number(invoice.grand_total ?? 0)
    const invoiceEntries = [{
      id: invoice.id,
      type: 'purchase' as const,
      date: invoice.completed_at ?? invoice.sold_at ?? invoice.created_at,
      reference: invoice.invoice_no,
      description: `Purchase ${invoice.invoice_no}`,
      debit: invoiceAmount,
      credit: 0,
    }]

    const invoicePayments = (payments.data ?? []).filter(
      (payment) => payment.invoice_id === invoice.id && payment.status === 'active',
    )

    for (const payment of invoicePayments) {
      invoiceEntries.push({
        id: payment.id,
        type: 'payment' as const,
        date: payment.paid_at,
        reference: payment.reference_no ?? '',
        description: payment.payment_method === 'cash' ? 'Cash Payment' : 'Bank Payment',
        debit: 0,
        credit: Number(payment.amount ?? 0),
      })
    }

    return invoiceEntries
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let runningBalance = 0
  const entries = rawEntries.map((entry) => {
    runningBalance = Math.max(runningBalance + entry.debit - entry.credit, 0)
    return { ...entry, balance: Number(runningBalance.toFixed(2)) }
  })

  const purchases = (invoices ?? []).map((invoice) => ({
    id: invoice.id,
    invoice_no: invoice.invoice_no,
    date: invoice.completed_at ?? invoice.sold_at ?? invoice.created_at,
    status: invoice.order_status,
    grand_total: Number(invoice.grand_total ?? 0),
    items: invoice.sales_invoice_items ?? [],
    paid_amount: paymentByInvoice.get(invoice.id) ?? 0,
    balance_amount: Math.max(Number(invoice.grand_total ?? 0) - (paymentByInvoice.get(invoice.id) ?? 0), 0),
  })).reverse()

  return NextResponse.json({
    customer: { id: user.id, name: profile.full_name },
    summary: {
      purchase_count: purchases.length,
      purchase_total: purchases.reduce((sum, purchase) => sum + purchase.grand_total, 0),
      paid_total: purchases.reduce((sum, purchase) => sum + purchase.paid_amount, 0),
      outstanding_total: runningBalance,
    },
    purchases,
    entries: entries.reverse(),
  })
}
