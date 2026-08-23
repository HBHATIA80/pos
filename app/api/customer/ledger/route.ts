import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active,full_name,phone,party_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Customer ledger profile error:', profileError)
    return NextResponse.json(
      { error: profileError.message || 'Unable to load customer profile' },
      { status: 400 },
    )
  }

  if (!profile?.is_active || !profile.business_id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    )
  }

  if (profile.role !== 'user') {
    return NextResponse.json(
      {
        error:
          'Customer ledger is only available to customer portal users.',
      },
      { status: 403 },
    )
  }

  // The ledger belongs to the customer party, not to the auth user who
  // happened to create the invoice. The migration permanently links portal
  // users to a party; the phone/name lookup is only a compatibility fallback
  // for accounts created before that link existed.
  let partyId: string | null = profile.party_id ?? null

  if (!partyId && profile.phone) {
    const { data: partyByPhone, error: partyPhoneError } = await supabase
      .from('parties')
      .select('id')
      .eq('business_id', profile.business_id)
      .in('party_type', ['customer', 'both'])
      .eq('is_active', true)
      .eq('phone', profile.phone)
      .limit(1)
      .maybeSingle()

    if (partyPhoneError) {
      console.error('Customer ledger party lookup error:', partyPhoneError)
    } else {
      partyId = partyByPhone?.id ?? null
    }
  }

  if (!partyId && profile.full_name) {
    const { data: partyByName, error: partyNameError } = await supabase
      .from('parties')
      .select('id')
      .eq('business_id', profile.business_id)
      .in('party_type', ['customer', 'both'])
      .eq('is_active', true)
      .ilike('name', profile.full_name)
      .limit(1)
      .maybeSingle()

    if (partyNameError) {
      console.error('Customer ledger party name lookup error:', partyNameError)
    } else {
      partyId = partyByName?.id ?? null
    }
  }

  let invoiceQuery = supabase
    .from('sales_invoices')
    .select(`
      id,
      invoice_no,
      status,
      order_channel,
      order_status,
      party_id,
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
    .eq('status', 'completed')

  if (partyId) {
    invoiceQuery = invoiceQuery.eq('party_id', partyId)
  } else {
    // Compatibility fallback for an account that predates the party-link
    // migration. This still prevents the customer from seeing another user's
    // invoices, but new records will be party-linked by the database trigger.
    invoiceQuery = invoiceQuery.eq('created_by', user.id)
  }

  const { data: invoices, error: invoiceError } = await invoiceQuery.order(
    'completed_at',
    { ascending: true, nullsFirst: false },
  )

  if (invoiceError) {
    console.error('Customer ledger invoice error:', invoiceError)
    return NextResponse.json(
      {
        error:
          invoiceError.message ||
          'Unable to load customer ledger',
      },
      { status: 400 },
    )
  }

  const invoiceRows = invoices ?? []
  const invoiceIds = invoiceRows.map((invoice) => invoice.id)

  const payments = invoiceIds.length
    ? await supabase
        .from('sale_payments')
        .select(
          'id,invoice_id,party_id,payment_method,amount,reference_no,notes,paid_at,status',
        )
        .in('invoice_id', invoiceIds)
        .eq('business_id', profile.business_id)
        .eq('status', 'active')
        .order('paid_at', { ascending: true })
    : { data: [], error: null }

  if (payments.error) {
    console.error('Customer ledger payment error:', payments.error)
    return NextResponse.json(
      {
        error:
          payments.error.message ||
          'Unable to load customer ledger payments',
      },
      { status: 400 },
    )
  }

  const paymentRows = payments.data ?? []

  const paymentByInvoice = new Map<string, number>()

  for (const payment of paymentRows) {
    paymentByInvoice.set(
      payment.invoice_id,
      (paymentByInvoice.get(payment.invoice_id) ?? 0) +
        Number(payment.amount ?? 0),
    )
  }

  const rawEntries = invoiceRows
    .flatMap((invoice) => {
      const invoiceAmount = Number(invoice.grand_total ?? 0)

      const invoiceEntries: Array<{
        id: string
        type: 'purchase' | 'payment'
        date: string
        reference: string
        description: string
        debit: number
        credit: number
      }> = [
        {
          id: invoice.id,
          type: 'purchase',
          date:
            invoice.completed_at ??
            invoice.sold_at ??
            invoice.created_at,
          reference: invoice.invoice_no,
          description: `Purchase ${invoice.invoice_no}`,
          debit: invoiceAmount,
          credit: 0,
        },
      ]

      const invoicePayments = paymentRows.filter(
        (payment) => payment.invoice_id === invoice.id,
      )

      for (const payment of invoicePayments) {
        invoiceEntries.push({
          id: payment.id,
          type: 'payment',
          date: payment.paid_at,
          reference: payment.reference_no ?? '',
          description:
            payment.payment_method === 'cash'
              ? 'Cash Payment'
              : 'Bank Payment',
          debit: 0,
          credit: Number(payment.amount ?? 0),
        })
      }

      return invoiceEntries
    })
    .sort((a, b) => {
      const dateDifference =
        new Date(a.date).getTime() -
        new Date(b.date).getTime()

      if (dateDifference !== 0) {
        return dateDifference
      }

      if (a.type === b.type) {
        return a.id.localeCompare(b.id)
      }

      return a.type === 'purchase' ? -1 : 1
    })

  let runningBalance = 0

  const entries = rawEntries.map((entry) => {
    runningBalance = Math.max(
      runningBalance + entry.debit - entry.credit,
      0,
    )

    return {
      ...entry,
      balance: Number(
        runningBalance.toFixed(2),
      ),
    }
  })

  const purchases = invoiceRows
    .map((invoice) => {
      const paidAmount =
        paymentByInvoice.get(invoice.id) ?? 0

      const grandTotal = Number(
        invoice.grand_total ?? 0,
      )

      return {
        id: invoice.id,
        invoice_no: invoice.invoice_no,
        date:
          invoice.completed_at ??
          invoice.sold_at ??
          invoice.created_at,
        status:
          invoice.order_status ??
          invoice.status,
        grand_total: grandTotal,
        items: invoice.sales_invoice_items ?? [],
        paid_amount: Number(
          paidAmount.toFixed(2),
        ),
        balance_amount: Number(
          Math.max(
            grandTotal - paidAmount,
            0,
          ).toFixed(2),
        ),
      }
    })
    .reverse()

  const purchaseTotal = invoiceRows.reduce(
    (sum, invoice) =>
      sum + Number(invoice.grand_total ?? 0),
    0,
  )

  const paidTotal = paymentRows.reduce(
    (sum, payment) =>
      sum + Number(payment.amount ?? 0),
    0,
  )

  return NextResponse.json({
    customer: {
      id: user.id,
      name: profile.full_name,
      party_id: partyId,
    },
    summary: {
      purchase_count: purchases.length,
      purchase_total: Number(
        purchaseTotal.toFixed(2),
      ),
      paid_total: Number(
        paidTotal.toFixed(2),
      ),
      outstanding_total: Number(
        runningBalance.toFixed(2),
      ),
    },
    purchases,
    entries: entries.reverse(),
  })
}
