import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const iso = (v: string | null, end = false) => `${v || new Date().toISOString().slice(0, 10)}${end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`

async function attachPartyNames<T extends { party_id?: string | null; parties?: unknown }>(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string, rows: T[]) {
  const partyIds = [...new Set(rows.map(row => row.party_id).filter((id): id is string => Boolean(id)))]
  if (!partyIds.length) return rows

  const { data: parties } = await supabase.from('parties').select('id,name,phone,party_type').eq('business_id', businessId).in('id', partyIds)
  const partyMap = new Map((parties ?? []).map(party => [party.id, party]))

  return rows.map(row => ({
    ...row,
    party: row.parties || (row.party_id ? partyMap.get(row.party_id) ?? null : null),
  }))
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id || profile.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const url = new URL(request.url)
  const type = url.searchParams.get('type') || 'sales'
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  const businessId = profile.business_id

  if (type === 'sales') {
    const { data, error } = await supabase.from('sales_invoices').select('id,invoice_no,status,party_id,subtotal,discount_amount,grand_total,notes,sold_at,completed_at,created_at,parties(id,name,phone,party_type),sales_invoice_items(id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total)').eq('business_id', businessId).is('deleted_at', null).gte('created_at', iso(start)).lte('created_at', iso(end, true)).order('created_at', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ type, rows: await attachPartyNames(supabase, businessId, data ?? []) })
  }

  if (type === 'purchases') {
    const { data, error } = await supabase.from('purchase_invoices').select('id,invoice_no,status,party_id,subtotal,discount_amount,grand_total,notes,purchased_at,completed_at,created_at,parties(id,name,phone,party_type),purchase_invoice_items(id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total)').eq('business_id', businessId).is('deleted_at', null).gte('created_at', iso(start)).lte('created_at', iso(end, true)).order('created_at', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ type, rows: await attachPartyNames(supabase, businessId, data ?? []) })
  }

  if (type === 'expenses') {
    const { data, error } = await supabase.from('expenses').select('id,expense_no,category,description,amount,payment_method,reference_no,expense_date,notes,created_at').eq('business_id', businessId).gte('expense_date', iso(start)).lte('expense_date', iso(end, true)).order('expense_date', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ type, rows: data ?? [] })
  }

  if (type === 'payments') {
    const { data, error } = await supabase.from('sale_payments').select('id,receipt_no,payment_method,amount,reference_no,notes,paid_at,status,invoice_id,sales_invoices!inner(invoice_no,grand_total),parties(id,name,phone)').eq('business_id', businessId).gte('paid_at', iso(start)).lte('paid_at', iso(end, true)).order('paid_at', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ type, rows: data ?? [] })
  }

  if (type === 'stock') {
    const { data, error } = await supabase.from('stock_analysis').select('product_id,name,sku,current_stock,purchase_price,sale_price,stock_cost_value,stock_retail_value').eq('business_id', businessId).eq('is_active', true).order('stock_cost_value', { ascending: false }).limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ type, rows: data ?? [] })
  }

  if (type === 'cashbank') {
    const [{ data: accounts, error: accountsError }, { data: lines, error: linesError }] = await Promise.all([
      supabase.from('accounts').select('id,name,account_code').eq('business_id', businessId).eq('is_active', true).in('account_code', ['SYS_CASH','SYS_BANK']),
      supabase.from('accounting_posted_lines').select('id,entry_date,account_id,debit,credit,narration,reference_type,reference_id').eq('business_id', businessId).gte('entry_date', iso(start)).lte('entry_date', iso(end, true)).order('entry_date', { ascending: false }).limit(200),
    ])
    if (accountsError || linesError) return NextResponse.json({ error: accountsError?.message || linesError?.message }, { status: 400 })
    const map = new Map((accounts ?? []).map(a => [a.id, a]))
    return NextResponse.json({ type, rows: (lines ?? []).filter(r => map.has(r.account_id)).map(r => ({ ...r, account: map.get(r.account_id)?.name || map.get(r.account_id)?.account_code || 'Cash / Bank' })) })
  }

  return NextResponse.json({ error: 'Unsupported detail type' }, { status: 400 })
}
