import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  return { supabase, user, profile }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { supabase, user, profile } = await getContext()

  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const parsedId = z.string().uuid().safeParse(id)

  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 })
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('sales_invoices')
    .select(`
      id,
      invoice_no,
      status,
      party_id,
      subtotal,
      discount_amount,
      grand_total,
      notes,
      sold_at,
      completed_at,
      created_at,
      parties(id,name,phone,party_type)
    `)
    .eq('id', parsedId.data)
    .eq('business_id', profile.business_id)
    .maybeSingle()

  if (invoiceError) {
    console.error('Sales ledger invoice error:', invoiceError)
    return NextResponse.json({ error: invoiceError.message }, { status: 400 })
  }

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const { data: payments, error: paymentError } = await supabase
    .from('sale_payments')
    .select(`
      id,
      invoice_id,
      payment_method,
      amount,
      reference_no,
      notes,
      paid_at,
      status,
      created_at,
      created_by
    `)
    .eq('invoice_id', parsedId.data)
    .eq('business_id', profile.business_id)
    .order('paid_at', { ascending: true })

  if (paymentError) {
    console.error('Sales ledger payment error:', paymentError)
    return NextResponse.json({ error: paymentError.message }, { status: 400 })
  }

  const activePayments = (payments ?? []).filter((payment) => payment.status === 'active')
  const grandTotal = Number(invoice.grand_total ?? 0)
  const paidAmount = activePayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  const balanceAmount = Math.max(grandTotal - paidAmount, 0)

  const paymentStatus =
    paidAmount <= 0
      ? 'unpaid'
      : balanceAmount <= 0
        ? 'paid'
        : 'partial'

  let runningBalance = 0

  const ledger = [
    {
      id: invoice.id,
      type: 'invoice' as const,
      date: invoice.completed_at ?? invoice.sold_at ?? invoice.created_at,
      reference: invoice.invoice_no,
      description: `Sales Invoice ${invoice.invoice_no}`,
      debit: grandTotal,
      credit: 0,
    },
    ...activePayments.map((payment) => ({
      id: payment.id,
      type: 'payment' as const,
      date: payment.paid_at ?? payment.created_at,
      reference: payment.reference_no ?? '',
      description: payment.payment_method === 'cash' ? 'Cash Payment' : 'Bank Payment',
      debit: 0,
      credit: Number(payment.amount ?? 0),
      payment_method: payment.payment_method,
      notes: payment.notes ?? '',
    })),
  ].map((entry) => {
    runningBalance += entry.debit - entry.credit
    return { ...entry, balance: Math.max(runningBalance, 0) }
  })

  return NextResponse.json({
    invoice: {
      id: invoice.id,
      invoice_no: invoice.invoice_no,
      status: invoice.status,
      party_id: invoice.party_id,
      subtotal: Number(invoice.subtotal ?? 0),
      discount_amount: Number(invoice.discount_amount ?? 0),
      grand_total: grandTotal,
      paid_amount: paidAmount,
      balance_amount: balanceAmount,
      payment_status: paymentStatus,
      notes: invoice.notes,
      sold_at: invoice.sold_at,
      completed_at: invoice.completed_at,
      created_at: invoice.created_at,
    },
    party: invoice.parties ?? null,
    payments: payments ?? [],
    ledger,
  })
}
