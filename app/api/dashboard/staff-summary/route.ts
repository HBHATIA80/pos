import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const n = (v: unknown) => Number(v ?? 0)
const day = (v: unknown) => String(v ?? '').slice(0, 10)
const iso = (v: string, end = false) => `${v}${end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('business_id,full_name,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const end = url.searchParams.get('end') || new Date().toISOString().slice(0, 10)
  const startDate = new Date(`${end}T12:00:00Z`)
  startDate.setUTCDate(startDate.getUTCDate() - 29)
  const start = startDate.toISOString().slice(0, 10)
  const businessId = profile.business_id

  const [{ data: lines, error: linesError }, { data: payments, error: paymentsError }, { data: accounts, error: accountsError }, { data: groups, error: groupsError }] = await Promise.all([
    supabase.from('accounting_posted_lines').select('account_id,entry_date,debit,credit').eq('business_id', businessId).gte('entry_date', iso(start)).lte('entry_date', iso(end, true)).order('entry_date'),
    supabase.from('sale_payments').select('id,receipt_no,payment_method,amount,reference_no,notes,paid_at,status,invoice_id,parties(name)').eq('business_id', businessId).gte('paid_at', iso(start)).lte('paid_at', iso(end, true)).order('paid_at', { ascending: false }),
    supabase.from('accounts').select('id,account_nature,account_group_id').eq('business_id', businessId).eq('is_active', true),
    supabase.from('account_groups').select('id,name').eq('business_id', businessId).eq('is_active', true),
  ])
  for (const e of [linesError, paymentsError, accountsError, groupsError]) if (e) return NextResponse.json({ error: e.message }, { status: 400 })

  const accountMeta = new Map((accounts ?? []).map(a => [a.id, { nature: a.account_nature, group: (groups ?? []).find(g => g.id === a.account_group_id)?.name || '' }]))
  const daily = new Map<string, { date:string; sales:number; cashCollections:number; bankCollections:number; totalCollections:number }>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(`${end}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    daily.set(key, { date:key, sales:0, cashCollections:0, bankCollections:0, totalCollections:0 })
  }

  for (const r of lines ?? []) {
    const meta = accountMeta.get(r.account_id)
    if (meta?.nature !== 'income' || !meta.group.toLowerCase().includes('sales')) continue
    const amount = n(r.credit) - n(r.debit)
    const row = daily.get(day(r.entry_date))
    if (row) row.sales += amount
  }

  for (const p of payments ?? []) {
    const amount = n(p.amount)
    const row = daily.get(day(p.paid_at))
    if (!row) continue
    row.totalCollections += amount
    if (p.payment_method === 'cash') row.cashCollections += amount
    if (p.payment_method === 'bank') row.bankCollections += amount
  }

  const today = daily.get(end) || { date:end, sales:0, cashCollections:0, bankCollections:0, totalCollections:0 }
  const totals = [...daily.values()].reduce((a, x) => ({ sales:a.sales+x.sales, cash:a.cash+x.cashCollections, bank:a.bank+x.bankCollections, collections:a.collections+x.totalCollections }), { sales:0, cash:0, bank:0, collections:0 })
  const recentPayments = (payments ?? []).slice(0, 8).map(p => ({ id:p.id, receipt_no:p.receipt_no, payment_method:p.payment_method, amount:n(p.amount), reference_no:p.reference_no, paid_at:p.paid_at, status:p.status, invoice_id:p.invoice_id, party_name:Array.isArray(p.parties) ? p.parties[0]?.name ?? 'Walk-in customer' : (p.parties as {name?:string}|null)?.name ?? 'Walk-in customer' }))

  return NextResponse.json({ staff: { name: profile.full_name, role: profile.role }, period:{ start, end }, today, totals, daily:[...daily.values()], recentPayments })
}
