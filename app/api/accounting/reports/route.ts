import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const n = (v: unknown) => Number(v ?? 0)
const iso = (v: string | null, end = false) => `${v || new Date().toISOString().slice(0, 10)}${end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`

function signedOpening(amount: number, type: string | null) {
  if (type === 'payable') return -Math.abs(amount)
  if (type === 'receivable') return Math.abs(amount)
  return 0
}

function salesDate(invoice: { sold_at?: string | null; completed_at?: string | null; created_at?: string | null }) {
  return invoice.sold_at ?? invoice.completed_at ?? invoice.created_at ?? ''
}

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

  const [{ data: lines, error: linesError }, { data: accounts, error: accountsError }, { data: groups, error: groupsError }, { data: products, error: productsError }, { data: salesRows, error: salesError }] = await Promise.all([
    supabase.from('accounting_posted_lines').select('*').eq('business_id', businessId).gte('entry_date', iso(start)).lte('entry_date', iso(end, true)).order('entry_date'),
    supabase.from('accounts').select('id,name,account_code,account_nature,account_group_id,party_id,opening_balance,opening_balance_type,is_party_account,is_active').eq('business_id', businessId).eq('is_active', true).order('name'),
    supabase.from('account_groups').select('id,name,code,nature,parent_id').eq('business_id', businessId).eq('is_active', true),
    supabase.from('stock_analysis').select('product_id,name,sku,current_stock,purchase_price,sale_price,stock_cost_value,stock_retail_value').eq('business_id', businessId).eq('is_active', true),
    supabase.from('sales_invoices').select('sold_at,sales_invoice_items(product_id,quantity,cost_unit_price)').eq('business_id', businessId).eq('status', 'completed').is('deleted_at', null).is('cancelled_at', null).gte('sold_at', iso(start)).lte('sold_at', iso(end, true)).order('sold_at'),
  ])
  for (const e of [linesError, accountsError, groupsError, productsError, salesError]) if (e) return NextResponse.json({ error: e.message }, { status: 400 })

  const rows = lines ?? []
  const acc = accounts ?? []
  const groupRows = groups ?? []
  const productCost = new Map((products ?? []).map(p => [p.product_id, n(p.purchase_price)]))
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
  const allPnlAccounts = trialBalance.filter(x => x.nature === 'income' || x.nature === 'expense')
  const purchaseAccounts = allPnlAccounts.filter(x => x.nature === 'expense' && x.group.toLowerCase().includes('purchase'))
  const pnlAccounts = allPnlAccounts.filter(x => !(x.nature === 'expense' && x.group.toLowerCase().includes('purchase')))
  const income = allPnlAccounts.filter(x => x.nature === 'income').reduce((s, x) => s + x.credit - x.debit, 0)
  const totalLedgerExpense = allPnlAccounts.filter(x => x.nature === 'expense').reduce((s, x) => s + x.debit - x.credit, 0)
  const sales = allPnlAccounts.filter(x => x.group.toLowerCase().includes('sales')).reduce((s, x) => s + x.credit - x.debit, 0)
  const purchases = purchaseAccounts.reduce((s, x) => s + x.debit - x.credit, 0)
  const operatingExpense = Math.max(totalLedgerExpense - purchases, 0)
  const otherIncome = Math.max(income - sales, 0)

  // Purchases increase inventory; they are not an immediate P&L expense. P&L recognizes only the cost of goods actually sold.
  const cogs = (salesRows ?? []).reduce((total, invoice) => {
    const items = (invoice.sales_invoice_items ?? []) as Array<{ product_id: string; quantity: number; cost_unit_price: number | null }>
    return total + items.reduce((sum, item) => sum + n(item.quantity) * (item.cost_unit_price == null ? (productCost.get(item.product_id) ?? 0) : n(item.cost_unit_price)), 0)
  }, 0)
  const grossProfit = sales - cogs
  const netProfit = grossProfit + otherIncome - operatingExpense

  const bsAccounts = trialBalance.filter(x => ['asset','liability','equity'].includes(x.nature))
  const assets = bsAccounts.filter(x => x.nature === 'asset').reduce((s, x) => s + x.debit - x.credit, 0)
  const liabilities = bsAccounts.filter(x => x.nature === 'liability').reduce((s, x) => s + x.credit - x.debit, 0)
  const equity = bsAccounts.filter(x => x.nature === 'equity').reduce((s, x) => s + x.credit - x.debit, 0) + netProfit
  const cash = trialBalance.filter(x => x.code === 'SYS_CASH').reduce((s, x) => s + x.debit - x.credit, 0)
  const bank = trialBalance.filter(x => x.code === 'SYS_BANK').reduce((s, x) => s + x.debit - x.credit, 0)
  const stock = (products ?? []).reduce((s, p) => s + n(p.stock_cost_value || n(p.current_stock) * n(p.purchase_price)), 0)

  // Party receivables/payables must use the same source-of-truth calculation as the Party Ledger.
  // Use the transaction/business date (sold_at), not completed_at, because a voucher can be
  // entered later than the date selected by the user.
  const [{ data: parties, error: partiesError }, { data: partySales, error: partySalesError }, { data: partyPurchases, error: partyPurchasesError }, { data: partyPayments, error: partyPaymentsError }, { data: partyVouchers, error: partyVouchersError }] = await Promise.all([
    supabase.from('parties').select('id,name,party_type,opening_balance,opening_balance_type,is_active').eq('business_id', businessId),
    supabase.from('sales_invoices').select('id,party_id,grand_total,status,completed_at,sold_at,created_at').eq('business_id', businessId).eq('status', 'completed').order('sold_at', { ascending: true }),
    supabase.from('purchase_invoices').select('id,party_id,grand_total,status,purchased_at,created_at').eq('business_id', businessId).eq('status', 'completed').order('purchased_at', { ascending: true }),
    supabase.from('sale_payments').select('id,party_id,amount,paid_at,status').eq('business_id', businessId).eq('status', 'active').order('paid_at', { ascending: true }),
    supabase.from('account_vouchers').select('id,party_id,voucher_type,amount,paid_at,status').eq('business_id', businessId).eq('status', 'active').order('paid_at', { ascending: true }),
  ])
  for (const e of [partiesError, partySalesError, partyPurchasesError, partyPaymentsError, partyVouchersError]) if (e) return NextResponse.json({ error: e.message }, { status: 400 })

  const endExclusive = new Date(`${end}T00:00:00`)
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
  const endAt = endExclusive.toISOString()
  const partyBalances = new Map<string, number>()
  for (const party of parties ?? []) partyBalances.set(party.id, signedOpening(n(party.opening_balance), party.opening_balance_type))

  for (const invoice of partySales ?? []) {
    const date = salesDate(invoice)
    if (!invoice.party_id || date >= endAt) continue
    partyBalances.set(invoice.party_id, (partyBalances.get(invoice.party_id) ?? 0) + n(invoice.grand_total))
  }
  for (const purchase of partyPurchases ?? []) {
    const date = purchase.purchased_at ?? purchase.created_at
    if (!purchase.party_id || date >= endAt) continue
    partyBalances.set(purchase.party_id, (partyBalances.get(purchase.party_id) ?? 0) - n(purchase.grand_total))
  }
  for (const payment of partyPayments ?? []) {
    if (!payment.party_id || payment.paid_at >= endAt) continue
    partyBalances.set(payment.party_id, (partyBalances.get(payment.party_id) ?? 0) - n(payment.amount))
  }
  for (const voucher of partyVouchers ?? []) {
    if (!voucher.party_id || voucher.paid_at >= endAt) continue
    const amount = n(voucher.amount)
    partyBalances.set(voucher.party_id, (partyBalances.get(voucher.party_id) ?? 0) + (voucher.voucher_type === 'payment' ? amount : -amount))
  }

  const partyRows = (parties ?? []).map(party => ({
    name: party.name,
    party_id: party.id,
    type: (partyBalances.get(party.id) ?? 0) >= 0 ? 'receivable' : 'payable',
    amount: Math.abs(Number((partyBalances.get(party.id) ?? 0).toFixed(2))),
  })).filter(x => x.amount > 0.005)
  const debtors = partyRows.filter(x => x.type === 'receivable').reduce((s, x) => s + x.amount, 0)
  const creditors = partyRows.filter(x => x.type === 'payable').reduce((s, x) => s + x.amount, 0)

  const byGroup = new Map<string, { nature: string; debit: number; credit: number }>()
  for (const x of trialBalance) {
    const key = x.group || 'Ungrouped'
    const old = byGroup.get(key) || { nature: x.nature, debit: 0, credit: 0 }
    old.debit += x.debit; old.credit += x.credit; byGroup.set(key, old)
  }
  const topExpenses = pnlAccounts.filter(x => x.nature === 'expense').sort((a,b) => (b.debit-b.credit)-(a.debit-a.credit)).slice(0, 10).map(x => ({ name: x.name, amount: x.debit-x.credit }))

  const dailyMap = new Map<string, { sales:number; purchases:number; cogs:number; expenses:number; otherIncome:number; entries:number }>()
  for (const r of rows) {
    const date = String(r.entry_date).slice(0, 10)
    const m = dailyMap.get(date) || { sales:0, purchases:0, cogs:0, expenses:0, otherIncome:0, entries:0 }
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
  for (const invoice of salesRows ?? []) {
    const date = String(invoice.sold_at).slice(0, 10)
    const m = dailyMap.get(date) || { sales:0, purchases:0, cogs:0, expenses:0, otherIncome:0, entries:0 }
    const items = (invoice.sales_invoice_items ?? []) as Array<{ product_id: string; quantity: number; cost_unit_price: number | null }>
    m.cogs += items.reduce((sum, item) => sum + n(item.quantity) * (item.cost_unit_price == null ? (productCost.get(item.product_id) ?? 0) : n(item.cost_unit_price)), 0)
    dailyMap.set(date, m)
  }
  const daily = [...dailyMap.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([date,m]) => ({ ...m, date, grossProfit: m.sales-m.cogs, netProfit: m.sales-m.cogs+m.otherIncome-m.expenses }))

  return NextResponse.json({
    period: { start, end },
    summary: { income, expense: operatingExpense, totalExpense: totalLedgerExpense, operatingExpense, sales, purchases, costOfGoodsSold: cogs, grossProfit, netProfit, otherIncome, assets, liabilities, equity, debtors, creditors, cash, bank, stock, trialDebit: trialBalance.reduce((s,x)=>s+x.debit,0), trialCredit: trialBalance.reduce((s,x)=>s+x.credit,0) },
    trialBalance, pnlAccounts, balanceSheet: bsAccounts, groups: [...byGroup.entries()].map(([name,v])=>({name,...v})), aging: partyRows, topExpenses, daily, stock: products ?? []
  })
}
