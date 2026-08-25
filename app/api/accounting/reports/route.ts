import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const n = (v: unknown) => Number(v ?? 0)
const iso = (v: string | null, end = false) => `${v || new Date().toISOString().slice(0, 10)}${end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id || profile.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const url = new URL(request.url)
  const start = url.searchParams.get('start') || new Date(new Date().getFullYear(), 3, 1).toISOString().slice(0, 10)
  const end = url.searchParams.get('end') || new Date().toISOString().slice(0, 10)
  const businessId = profile.business_id

  const [{ data: lines, error: linesError }, { data: accounts, error: accountsError }, { data: groups, error: groupsError }, { data: products, error: productsError }] = await Promise.all([
    supabase.from('accounting_posted_lines').select('*').eq('business_id', businessId).gte('entry_date', iso(start)).lte('entry_date', iso(end, true)).order('entry_date'),
    supabase.from('accounts').select('id,name,account_code,account_nature,account_group_id,party_id,opening_balance,opening_balance_type,is_party_account,is_active').eq('business_id', businessId).eq('is_active', true).order('name'),
    supabase.from('account_groups').select('id,name,code,nature,parent_id').eq('business_id', businessId).eq('is_active', true),
    supabase.from('stock_analysis').select('product_id,name,sku,current_stock,purchase_price,sale_price,stock_cost_value,stock_retail_value').eq('business_id', businessId).eq('is_active', true),
  ])
  for (const e of [linesError, accountsError, groupsError, productsError]) if (e) return NextResponse.json({ error: e.message }, { status: 400 })

  const rows = lines ?? []
  const acc = accounts ?? []
  const groupRows = groups ?? []
  const accountMeta = new Map(acc.map(a => [a.id, { ...a, group: groupRows.find(g => g.id === a.account_group_id)?.name || '' }]))
  const balance = new Map<string, { debit: number; credit: number; name: string; code: string | null; nature: string; group: string; party_id: string | null }>()
  for (const a of acc) balance.set(a.id, { debit: n(a.opening_balance_type === 'debit' ? a.opening_balance : 0), credit: n(a.opening_balance_type === 'credit' ? a.opening_balance : 0), name: a.name, code: a.account_code, nature: a.account_nature, group: groupRows.find(g => g.id === a.account_group_id)?.name || '', party_id: a.party_id })
  for (const r of rows) {
    const x = balance.get(r.account_id)
    if (!x) continue
    x.debit += n(r.debit); x.credit += n(r.credit)
  }

  const trialBalance = [...balance.entries()].map(([id, x]) => {
    const net = x.debit - x.credit
    return { id, ...x, debit: net > 0 ? net : 0, credit: net < 0 ? Math.abs(net) : 0, balance: Math.abs(net), balance_type: net > 0 ? 'debit' : net < 0 ? 'credit' : 'zero' }
  }).filter(x => x.balance > 0.005)
  const pnlAccounts = trialBalance.filter(x => x.nature === 'income' || x.nature === 'expense')
  const income = pnlAccounts.filter(x => x.nature === 'income').reduce((s, x) => s + x.credit - x.debit, 0)
  const expense = pnlAccounts.filter(x => x.nature === 'expense').reduce((s, x) => s + x.debit - x.credit, 0)
  const sales = pnlAccounts.filter(x => x.group.toLowerCase().includes('sales')).reduce((s, x) => s + x.credit - x.debit, 0)
  const purchases = pnlAccounts.filter(x => x.group.toLowerCase().includes('purchase')).reduce((s, x) => s + x.debit - x.credit, 0)
  const grossProfit = sales - purchases
  const netProfit = income - expense

  const bsAccounts = trialBalance.filter(x => ['asset','liability','equity'].includes(x.nature))
  const assets = bsAccounts.filter(x => x.nature === 'asset').reduce((s, x) => s + x.debit - x.credit, 0)
  const liabilities = bsAccounts.filter(x => x.nature === 'liability').reduce((s, x) => s + x.credit - x.debit, 0)
  const equity = bsAccounts.filter(x => x.nature === 'equity').reduce((s, x) => s + x.credit - x.debit, 0) + netProfit
  const debtors = trialBalance.filter(x => x.party_id && x.nature === 'asset').reduce((s, x) => s + x.debit - x.credit, 0)
  const creditors = trialBalance.filter(x => x.party_id && x.nature === 'liability').reduce((s, x) => s + x.credit - x.debit, 0)
  const cash = trialBalance.filter(x => x.code === 'SYS_CASH').reduce((s, x) => s + x.debit - x.credit, 0)
  const bank = trialBalance.filter(x => x.code === 'SYS_BANK').reduce((s, x) => s + x.debit - x.credit, 0)
  const stock = (products ?? []).reduce((s, p) => s + n(p.stock_cost_value || n(p.current_stock) * n(p.purchase_price)), 0)

  const byGroup = new Map<string, { nature: string; debit: number; credit: number }>()
  for (const x of trialBalance) {
    const key = x.group || 'Ungrouped'
    const old = byGroup.get(key) || { nature: x.nature, debit: 0, credit: 0 }
    old.debit += x.debit; old.credit += x.credit; byGroup.set(key, old)
  }
  const aging = trialBalance.filter(x => x.party_id && (x.nature === 'asset' || x.nature === 'liability')).map(x => ({ name: x.name, party_id: x.party_id, type: x.nature === 'asset' ? 'receivable' : 'payable', amount: x.balance }))
  const topExpenses = pnlAccounts.filter(x => x.nature === 'expense').sort((a,b) => (b.debit-b.credit)-(a.debit-a.credit)).slice(0, 10).map(x => ({ name: x.name, amount: x.debit-x.credit }))

  const dailyMap = new Map<string, { sales:number; purchases:number; expenses:number; otherIncome:number; entries:number }>()
  for (const r of rows) {
    const date = String(r.entry_date).slice(0, 10)
    const m = dailyMap.get(date) || { sales:0, purchases:0, expenses:0, otherIncome:0, entries:0 }
    const meta = accountMeta.get(r.account_id)
    const debit = n(r.debit), credit = n(r.credit)
    const group = (meta?.group || '').toLowerCase()
    const nature = meta?.account_nature || ''
    m.entries += 1
    if (nature === 'income') {
      const amount = credit - debit
      if (group.includes('sales')) m.sales += amount
      else m.otherIncome += amount
    } else if (nature === 'expense') {
      const amount = debit - credit
      if (group.includes('purchase')) m.purchases += amount
      else m.expenses += amount
    }
    dailyMap.set(date, m)
  }
  const daily = [...dailyMap.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([date,m]) => ({ ...m, date, grossProfit: m.sales-m.purchases, netProfit: m.sales-m.purchases+m.otherIncome-m.expenses }))

  return NextResponse.json({ period: { start, end }, summary: { income, expense, sales, purchases, grossProfit, netProfit, assets, liabilities, equity, debtors, creditors, cash, bank, stock, trialDebit: trialBalance.reduce((s,x)=>s+x.debit,0), trialCredit: trialBalance.reduce((s,x)=>s+x.credit,0) }, trialBalance, pnlAccounts, balanceSheet: bsAccounts, groups: [...byGroup.entries()].map(([name,v])=>({name,...v})), aging, topExpenses, daily, stock: products ?? [] })
}
