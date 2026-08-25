import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

export async function GET() {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('purchase_invoices')
    .select('id,invoice_no,status,subtotal,discount_amount,grand_total,notes,purchased_at,created_at,party_id,party:parties!purchase_invoices_party_id_fkey(id,name,phone)')
    .eq('business_id', profile.business_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ purchases: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const { data, error } = await supabase.rpc('create_purchase_invoice', { payload: body })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ purchase: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'Purchase id is required' }, { status: 400 })
  if (body.action === 'complete') {
    const { data, error } = await supabase.rpc('complete_purchase_invoice', { p_invoice_id: body.id })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ purchase: data })
  }
  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
}
