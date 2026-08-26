import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

const invoiceDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid invoice date')

export async function GET() {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('purchase_invoices')
    .select('id,invoice_no,status,subtotal,discount_amount,grand_total,notes,purchased_at,created_at,party_id,party:parties!purchase_invoices_party_id_fkey(id,name,phone)')
    .eq('business_id', profile.business_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ purchases: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)

  const cookieStore = await cookies()
  const selectedDate = cookieStore.get('bizbook_invoice_date')?.value || new Date().toISOString().slice(0, 10)
  const dateParsed = invoiceDateSchema.safeParse(selectedDate)
  if (!dateParsed.success) return NextResponse.json({ error: 'Invalid invoice date' }, { status: 400 })
  if (selectedDate > new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: 'Invoice date cannot be in the future' }, { status: 400 })

  const { data, error } = await supabase.rpc('create_purchase_invoice_with_date', {
    payload: body,
    invoice_date: selectedDate,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ purchase: data, invoice_date: selectedDate }, { status: 201 })
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

export async function DELETE(request: Request) {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Select at least one valid purchase' }, { status: 400 })

  const ids = [...new Set(parsed.data.ids)]
  const { data: selected, error: lookupError } = await supabase
    .from('purchase_invoices')
    .select('id,invoice_no,status')
    .eq('business_id', profile.business_id)
    .is('deleted_at', null)
    .in('id', ids)

  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 })
  if ((selected?.length ?? 0) !== ids.length) return NextResponse.json({ error: 'One or more selected purchases were not found' }, { status: 404 })

  const completed = (selected ?? []).filter((purchase) => purchase.status !== 'draft')
  if (completed.length) {
    return NextResponse.json({
      error: `Only draft purchases can be deleted safely. Completed/void purchases must be handled through the invoice controls: ${completed.map((purchase) => purchase.invoice_no).join(', ')}`,
    }, { status: 409 })
  }

  for (const purchase of selected ?? []) {
    const { error } = await supabase.rpc('soft_delete_purchase_invoice', {
      p_invoice_id: purchase.id,
      p_reason: 'Deleted by admin/staff from selected purchase records',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ deleted: ids.length })
}
