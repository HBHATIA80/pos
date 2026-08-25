import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  entity: z.enum(['purchase', 'sale', 'party', 'product']),
  ids: z.array(z.string().uuid()).min(1).max(50),
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
    const table = parsed.data.entity === 'purchase' ? 'purchase_invoices' : 'sales_invoices'
    const { data: rows, error } = await supabase
      .from(table)
      .select('id,status,invoice_no')
      .eq('business_id', profile.business_id)
      .is('deleted_at', null)
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if ((rows?.length ?? 0) !== ids.length) return NextResponse.json({ error: 'One or more selected records were not found' }, { status: 404 })
    const protectedRows = (rows ?? []).filter(row => row.status !== 'draft')
    if (protectedRows.length) return NextResponse.json({ error: `Only draft ${parsed.data.entity}s can be deleted safely. Protected: ${protectedRows.map(row => row.invoice_no).join(', ')}` }, { status: 409 })

    for (const id of ids) {
      const functionName = parsed.data.entity === 'purchase' ? 'soft_delete_purchase_invoice' : 'soft_delete_sale_invoice'
      const args = parsed.data.entity === 'purchase'
        ? { p_invoice_id: id, p_reason: 'Deleted from bulk delete' }
        : { p_invoice_id: id, p_reason: 'Deleted from bulk delete' }
      const { error: rpcError } = await supabase.rpc(functionName, args)
      if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }
    return NextResponse.json({ deleted: ids.length })
  }

  const { data, error } = await supabase.rpc('delete_master_records', {
    p_entity: parsed.data.entity,
    p_ids: ids,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deleted: Number(data ?? 0) })
}
