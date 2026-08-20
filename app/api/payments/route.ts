import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id,is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 50), 1), 100)

  const { data, error } = await supabase
    .from('sale_payments')
    .select(`
      id, receipt_no, payment_method, amount, reference_no, notes, paid_at, status, invoice_id,
      sales_invoices!inner(invoice_no, grand_total),
      parties(id, name, phone)
    `)
    .eq('business_id', profile.business_id)
    .order('paid_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('GET /api/payments error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load payments' }, { status: 400 })
  }

  return NextResponse.json({ payments: data ?? [] })
}
