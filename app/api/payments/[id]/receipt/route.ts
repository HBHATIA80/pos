import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

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
  const paymentId = z.string().uuid().safeParse(id)
  if (!paymentId.success) {
    return NextResponse.json({ error: 'Invalid payment id' }, { status: 400 })
  }

  const { data: payment, error } = await supabase
    .from('sale_payments')
    .select(`
      id, receipt_no, payment_method, amount, reference_no, notes, paid_at, status,
      invoice_id,
      sales_invoices!inner(invoice_no, grand_total, party_id),
      parties(id, name, phone)
    `)
    .eq('id', paymentId.data)
    .eq('business_id', profile.business_id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.status !== 'active') return NextResponse.json({ error: 'Receipt is void' }, { status: 410 })

  return NextResponse.json({ receipt: payment })
}
