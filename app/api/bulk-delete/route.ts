import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  entity: z.enum(['purchase', 'sale', 'party', 'product']),
  ids: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().trim().max(500).optional().or(z.literal('')),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,business_id,role,is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Select valid records' }, { status: 400 })
  const ids = [...new Set(parsed.data.ids)]

  if (parsed.data.entity === 'purchase' || parsed.data.entity === 'sale') {
    if (profile.role !== 'admin' && profile.role !== 'staff') {
      return NextResponse.json({ error: 'Only admin or staff can delete draft vouchers' }, { status: 403 })
    }

    const { data, error } = await supabase.rpc('bulk_soft_delete_draft_invoices', {
      p_kind: parsed.data.entity,
      p_invoice_ids: ids,
      p_reason: parsed.data.reason || 'Deleted from bulk delete',
    })
    if (error) {
      const message = error.message || 'Unable to delete selected vouchers'
      const status = /only active draft|draft vouchers|completed|void/i.test(message) ? 409 : /unauthorized/i.test(message) ? 401 : 400
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ deleted: Number(data?.deleted ?? ids.length), kind: parsed.data.entity })
  }

  const { data, error } = await supabase.rpc('delete_master_records', {
    p_entity: parsed.data.entity,
    p_ids: ids,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deleted: Number(data ?? 0) })
}
