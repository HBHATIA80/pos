import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const paymentSchema = z.object({
  payment_method: z.enum(['cash', 'bank']),
  amount: z.coerce.number().positive(),
  reference_no: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal('')),
})

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

async function getContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null,
    }
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select(
        'id,business_id,role,is_active'
      )
      .eq('id', user.id)
      .maybeSingle()

  if (profileError) {
    console.error(
      'Payment profile lookup error:',
      profileError
    )
  }

  return {
    supabase,
    user,
    profile,
  }
}

/**
 * GET /api/sales/[id]/payment
 *
 * Returns payment summary for one invoice.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      supabase,
      user,
      profile,
    } = await getContext()

    if (
      !user ||
      !profile?.is_active ||
      !profile.business_id
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await context.params

    const invoiceId = z
      .string()
      .uuid()
      .safeParse(id)

    if (!invoiceId.success) {
      return NextResponse.json(
        { error: 'Invalid invoice id' },
        { status: 400 }
      )
    }

    const { data, error } =
      await supabase.rpc(
        'get_sales_invoice_payment_summary',
        {
          p_invoice_id: invoiceId.data,
        }
      )

    if (error) {
      console.error(
        'GET payment summary RPC error:',
        error
      )

      return NextResponse.json(
        {
          error:
            error.message ||
            'Unable to load payment information',
        },
        { status: 400 }
      )
    }

    const row = Array.isArray(data)
      ? data[0]
      : data

    if (!row) {
      return NextResponse.json(
        {
          error:
            'Payment summary not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      summary: {
        invoice_id: row.invoice_id,
        grand_total: Number(
          row.grand_total ?? 0
        ),
        paid_amount: Number(
          row.paid_amount ?? 0
        ),
        balance_amount: Number(
          row.balance_amount ?? 0
        ),
        payment_status:
          row.payment_status,
      },
    })
  } catch (error) {
    console.error(
      'GET payment route error:',
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load payment information',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sales/[id]/payment
 *
 * Records a payment against a completed invoice.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      supabase,
      user,
      profile,
    } = await getContext()

    if (
      !user ||
      !profile?.is_active ||
      !profile.business_id
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await context.params

    const invoiceId = z
      .string()
      .uuid()
      .safeParse(id)

    if (!invoiceId.success) {
      return NextResponse.json(
        { error: 'Invalid invoice id' },
        { status: 400 }
      )
    }

    const body = await request
      .json()
      .catch(() => null)

    const parsed =
      paymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            'Invalid payment',
        },
        { status: 400 }
      )
    }

    const {
      payment_method,
      amount,
      reference_no,
      notes,
    } = parsed.data

    const { data, error } =
      await supabase.rpc(
        'record_sale_payment',
        {
          p_invoice_id:
            invoiceId.data,

          p_payment_method:
            payment_method,

          p_amount:
            amount,

          p_reference_no:
            reference_no || null,

          p_notes:
            notes || null,

          p_paid_at:
            new Date().toISOString(),
        }
      )

    if (error) {
      console.error(
        'POST payment RPC error:',
        error
      )

      return NextResponse.json(
        {
          error:
            error.message ||
            'Unable to save payment',
        },
        { status: 400 }
      )
    }

    /*
     * Refresh payment summary after payment.
     */
    const {
      data: summaryData,
      error: summaryError,
    } = await supabase.rpc(
      'get_sales_invoice_payment_summary',
      {
        p_invoice_id:
          invoiceId.data,
      }
    )

    if (summaryError) {
      console.error(
        'POST payment summary RPC error:',
        summaryError
      )

      return NextResponse.json(
        {
          payment: data,
          summary: null,
        },
        { status: 201 }
      )
    }

    const row = Array.isArray(
      summaryData
    )
      ? summaryData[0]
      : summaryData

    const summary = row
      ? {
          invoice_id:
            row.invoice_id,

          grand_total:
            Number(
              row.grand_total ?? 0
            ),

          paid_amount:
            Number(
              row.paid_amount ?? 0
            ),

          balance_amount:
            Number(
              row.balance_amount ?? 0
            ),

          payment_status:
            row.payment_status,
        }
      : null

    return NextResponse.json(
      {
        payment: data,
        summary,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      'POST payment route error:',
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save payment',
      },
      { status: 500 }
    )
  }
}