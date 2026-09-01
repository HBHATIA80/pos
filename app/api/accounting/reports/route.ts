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

type PurchaseItem = { product_id: string; quantity: number; unit_price: number; discount_amount?: number | null; line_total?: number | null }
type PurchaseInvoice = { purchased_at?: string | null; completed_at?: string | null; created_at?: string | null; purchase_invoice_items?: PurchaseItem[] }
type SaleItem = { product_id: string; quantity: number; unit_price?: number | null; discount_amount?: number | null; line_total?: number | null; product_name?: string | null; sku?: string | null }

type ProfitProduct = {
  product_id: string
  name: string
  sku: string | null
  quantity: number
  sales: number
  cogs: number
  profit: number
  margin: number
  average_purchase_cost: number
}
type ProfitCategory = { category_id: string | null; name: string; sales: number; cogs: number; profit: number; margin: number }
type ProfitInvoice = { invoice_id: string; invoice_no: string; date: string; party_id: string | null; party_name: string; sales: number; cogs: number; profit: number; margin: number }
type ProfitParty = { party_id: string | null; name: string; invoices: number; sales: number; cogs: number; profit: number; margin: number }

/**
 * Moving weighted-average cost. Purchases are accumulated in chronological order.
 * A sale consumes quantity but does not change the average cost per unit.
 */
function buildWeightedAverageLookup(purchases: PurchaseInvoice[], fallbackCosts: Map<string, number>) {
  const events = [...purchases].sort((a, b) => {
    const ad = a.purchased_at ?? a.completed_at ?? a.created_at ?? ''
    const bd = b.purchased_at ?? b.completed_at ?? b.created_at ?? ''
    return ad.localeCompare(bd)
  })
  const state = new Map<string, { qty: number; value: number }>()
  const snapshots: Array<{ date: string; costs: Map<string, number> }> = []

  for (const invoice of events) {
    const date = invoice.purchased_at ?? invoice.completed_at ?? invoice.created_at ?? ''
    for (const item of invoice.purchase_invoice_items ?? []) {
      const qty = n(item.quantity)
      if (qty <= 0) continue
      const lineTotal = item.line_total == null ? n(item.unit_price) * qty - n(item.discount_amount) : n(item.line_total)
      const value = lineTotal >= 0 ? lineTotal : n(item.unit_price) * qty
      const old = state.get(item.product_id) ?? { qty: 0, value: 0 }
      old.qty += qty
      old.value += value
      state.set(item.product_id, old)
    }
    snapshots.push({
      date,
      costs: new Map([...state.entries()].map(([productId, x]) => [productId, x.qty > 0 ? x.value / x.qty : (fallbackCosts.get(productId) ?? 0)])),
    })
  }

  return (productId: string, atDate: string) => {
    let best: Map<string, number> | null = null
    for (const snapshot of snapshots) {
      if (snapshot.date <= atDate) best = snapshot.costs
      else break
    }
    return best?.get(productId) ?? fallbackCosts.get(productId) ?? 0
  }
}

function round2(value: number) { return Number(value.toFixed(2)) }
function marginOf(sales: number, profit: number) { return sales ? round2((profit / sales) * 100) : 0 }

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id || profile.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const url = new URL(request.url)
  const start = url.searchParams.get('start') || new Date(new Date().getFullYear(), 3, 1).toISOString().slice(0, 10)
  const end = url.searchParams.get('end') || new Date().toISOString().slice(0, 10)
  if (start > end) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  const businessId = profile.business_id

  const [{ data: lines, error: linesError }, { data: accounts, error: accountsError }, { data: groups, error: groupsError }, { data: products, error: productsError }, { data: salesRows, error: salesError }, { data: purchaseRows, error: purchaseRowsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from('accounting_posted_lines').select('*').eq('business_id', businessId).gte('entry_date', iso(start)).lte('entry_date', iso(end, true)).order('entry_date'),
    supabase.from('accounts').select('id,name,account_code,account_nature,account_group_id,party_id,opening_balance,opening_balance_type,is_party_account,is_active').eq('business_id', businessId).eq('is_active', true).order('name'),
    supabase.from('account_groups').select('id,name,code,nature,parent_id').eq('business_id', businessId).eq('is_active', true),
    supabase.from('stock_analysis').select('product_id,name,sku,current_stock,purchase_price,sale_price,stock_cost_value,stock_retail_value').eq('business_id', businessId).eq('is_active', true),
    supabase.from('sales_invoices').select('id,invoice_no,party_id,grand_total,sold_at,completed_at,created_at,sales_invoice_items(product_id,product_name,sku,quantity,unit_price,discount_amount,line_total)').eq('business_id', businessId).eq('status', 'completed').is('deleted_at', null).is('cancelled_at', null).gte('sold_at', iso(start)).lte('sold_at', iso(end, true)).order('sold_at'),
    supabase.from('purchase_invoices').select('purchased_at,completed_at,created_at,purchase_invoice_items(product_id,quantity,unit_price,discount_amount,line_total)').eq('business_id', businessId).eq('status', 'completed').is('deleted_at', null).lte('purchased_at', iso(end, true)).order('purchased_at'),
    supabase.from('catalog_categories').select('id,name').eq('business_id', businessId).eq('is_active', true).order('name'),
  ])
  for (const e of [linesError, accountsError, groupsError, productsError, salesError, purchaseRowsError, categoriesError]) if (e) return NextResponse.json({ error: e.message }, { status: 400 })

  const rows = lines ?? []
  const acc = accounts ?? []
  const groupRows = groups ?? []
  const productCost = new Map((products ?? []).map(p => [p.product_id, n(p.purchase_price)]))
  const weightedCostAt = buildWeightedAverageLookup((purchaseRows ?? []) as PurchaseInvoice[], productCost)
  const categoryMap = new Map((categories ?? []).map(c => [c.id, c.name]))
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

  const profitProducts = new Map<string, ProfitProduct>()
  const profitCategories = new Map<string, ProfitCategory>()
  const profitInvoices: ProfitInvoice[] = []
  const profitParties = new Map<string, ProfitParty>()
  const productMeta = new Map((products ?? []).map(p => [p.product_id, p]))
  const partyIds = new Set<string>()
  const invoicePartyMap = new Map<string, string>()

  for (const invoice of salesRows ?? []) {
    const saleDate = String(invoice.sold_at ?? invoice.completed_at ?? invoice.created_at ?? '')
    const invoiceSales = n(invoice.grand_total)
    const invoiceCogs = 0
    const invoiceName = 'Walk-in / Other'
    if (invoice.party_id) partyIds.add(invoice.party_id)
    invoicePartyMap.set(invoice.id, invoice.party_id ?? '')
    const items = (invoice.sales_invoice_items ?? []) as SaleItem[]

    let calculatedInvoiceCogs = invoiceCogs
    for (const item of items) {
      const qty = n(item.quantity)
      const lineSales = item.line_total == null ? n(item.unit_price) * qty - n(item.discount_amount) : n(item.line_total)
      const avgCost = weightedCostAt(item.product_id, saleDate)
      const lineCogs = qty * avgCost
      const lineProfit = lineSales - lineCogs
      calculatedInvoiceCogs += lineCogs
      const meta = productMeta.get(item.product_id)
      const productName = item.product_name || meta?.name || 'Unknown product'
      const sku = item.sku ?? meta?.sku ?? null
      const old = profitProducts.get(item.product_id) ?? { product_id: item.product_id, name: productName, sku, quantity: 0, sales: 0, cogs: 0, profit: 0, margin: 0, average_purchase_cost: avgCost }
      old.quantity += qty; old.sales += lineSales; old.cogs += lineCogs; old.profit += lineProfit; old.average_purchase_cost = avgCost; old.margin = marginOf(old.sales, old.profit)
      profitProducts.set(item.product_id, old)

      const categoryId = meta?.category_id ?? null
      const categoryName = categoryId ? (categoryMap.get(categoryId) ?? 'Uncategorised') : 'Uncategorised'
      const categoryKey = categoryId ?? '__uncategorised__'
      const cat = profitCategories.get(categoryKey) ?? { category_id: categoryId, name: categoryName, sales: 0, cogs: 0, profit: 0, margin: 0 }
      cat.sales += lineSales; cat.cogs += lineCogs; cat.profit += lineProfit; cat.margin = marginOf(cat.sales, cat.profit)
      profitCategories.set(categoryKey, cat)
    }

    const partyName = invoice.party_id ? `Party ${invoice.party_id.slice(0, 8)}` : invoiceName
    const invProfit = invoiceSales - calculatedInvoiceCogs
    profitInvoices.push({ invoice_id: invoice.id, invoice_no: invoice.invoice_no, date: saleDate.slice(0, 10), party_id: invoice.party_id ?? null, party_name: partyName, sales: invoiceSales, cogs: calculatedInvoiceCogs, profit: invProfit, margin: marginOf(invoiceSales, invProfit) })

    const partyKey = invoice.party_id ?? '__walkin__'
    const party = profitParties.get(partyKey) ?? { party_id: invoice.party_id ?? null, name: partyName, invoices: 0, sales: 0, cogs: 0, profit: 0, margin: 0 }
    party.invoices += 1; party.sales += invoiceSales; party.cogs += calculatedInvoiceCogs; party.profit += invProfit; party.margin = marginOf(party.sales, party.profit)
    profitParties.set(partyKey, party)
  }

  const cogs = [...profitProducts.values()].reduce((sum, row) => sum + row.cogs, 0)
  const grossProfit = sales - cogs
  const netProfit = grossProfit + otherIncome - operatingExpense

  const bsAccounts = trialBalance.filter(x => ['asset','liability','equity'].includes(x.nature))
  const assets = bsAccounts.filter(x => x.nature === 'asset').reduce((s, x) => s + x.debit - x.credit, 0)
  const liabilities = bsAccounts.filter(x => x.nature === 'liability').reduce((s, x) => s + x.credit - x.debit, 0)
  const equity = bsAccounts.filter(x => x.nature === 'equity').reduce((s, x) => s + x.credit - x.debit, 0) + netProfit
  const cash = trialBalance.filter(x => x.code === 'SYS_CASH').reduce((s, x) => s + x.debit - x.credit, 0)
  const bank = trialBalance.filter(x => x.code === 'SYS_BANK').reduce((s, x) => s + x.debit - x.credit, 0)
  const stock = (products ?? []).reduce((s, p) => s + n(p.stock_cost_value || n(p.current_stock) * n(p.purchase_price)), 0)

  const [{ data: parties, error: partiesError }, { data: partySales, error: partySalesError }, { data: partyPurchases, error: partyPurchasesError }, { data: partyPayments, error: partyPaymentsError }, { data: partyVouchers, error: partyVouchersError }] = await Promise.all([
    supabase.from('parties').select('id,name,party_type,opening_balance,opening_balance_type,is_active').eq('business_id', businessId),
    supabase.from('sales_invoices').select('id,party_id,grand_total,status,completed_at,sold_at,created_at').eq('business_id', businessId).eq('status', 'completed').order('sold_at', { ascending: true }),
    supabase.from('purchase_invoices').select('id,party_id,grand_total,status,purchased_at,created_at').eq('business_id', businessId).eq('status', 'completed').order('purchased_at', { ascending: true }),
    supabase.from('sale_payments').select('id,party_id,amount,paid_at,status').eq('business_id', businessId).eq('status', 'active').order('paid_at', { ascending: true }),
    supabase.from('account_vouchers').select('id,party_id,voucher_type,amount,paid_at,status').eq('business_id', businessId).eq('status', 'active').order('paid_at', { ascending: true }),
  ])
  for (const e of [partiesError, partySalesError, partyPurchasesError, partyPaymentsError, partyVouchersError]) if (e) return NextResponse.json({ error: e.message }, { status: 400 })

  const partyNameMap = new Map((parties ?? []).map(p => [p.id, p.name]))
  for (const row of profitParties.values()) row.name = row.party_id ? (partyNameMap.get(row.party_id) ?? row.name) : row.name
  for (const row of profitInvoices) row.party_name = row.party_id ? (partyNameMap.get(row.party_id) ?? row.party_name) : row.party_name

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

  const partyRows = (parties ?? []).map(party => ({ name: party.name, party_id: party.id, type: (partyBalances.get(party.id) ?? 0) >= 0 ? 'receivable' : 'payable', amount: Math.abs(round2(partyBalances.get(party.id) ?? 0)) })).filter(x => x.amount > 0.005)
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
    const date = String(invoice.sold_at ?? invoice.completed_at ?? invoice.created_at ?? '').slice(0, 10)
    const m = dailyMap.get(date) || { sales:0, purchases:0, cogs:0, expenses:0, otherIncome:0, entries:0 }
    m.cogs += (invoice.sales_invoice_items ?? []).reduce((sum, item) => sum + n(item.quantity) * weightedCostAt(item.product_id, String(invoice.sold_at ?? invoice.completed_at ?? invoice.created_at ?? '')), 0)
    dailyMap.set(date, m)
  }
  const daily = [...dailyMap.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([date,m]) => ({ ...m, date, grossProfit: m.sales-m.cogs, netProfit: m.sales-m.cogs+m.otherIncome-m.expenses }))
  const today = dailyMap.get(end) || { sales:0, purchases:0, cogs:0, expenses:0, otherIncome:0, entries:0 }
  const todayGrossProfit = today.sales - today.cogs
  const todayNetProfit = todayGrossProfit + today.otherIncome - today.expenses

  return NextResponse.json({
    period: { start, end },
    summary: { income, expense: operatingExpense, totalExpense: totalLedgerExpense, operatingExpense, sales, purchases, costOfGoodsSold: cogs, grossProfit, netProfit, otherIncome, assets, liabilities, equity, debtors, creditors, cash, bank, stock, todaySales: today.sales, todayGrossProfit, todayNetProfit, todayExpenses: today.expenses, todayCogs: today.cogs, todayOtherIncome: today.otherIncome, trialDebit: trialBalance.reduce((s,x)=>s+x.debit,0), trialCredit: trialBalance.reduce((s,x)=>s+x.credit,0) },
    trialBalance,
    pnlAccounts,
    balanceSheet: bsAccounts,
    groups: [...byGroup.entries()].map(([name,v])=>({name,...v})),
    aging: partyRows,
    topExpenses,
    daily,
    stock: products ?? [],
    profitAnalysis: {
      productWise: [...profitProducts.values()].sort((a,b) => b.profit - a.profit),
      categoryWise: [...profitCategories.values()].sort((a,b) => b.profit - a.profit),
      invoiceWise: profitInvoices.sort((a,b) => b.profit - a.profit),
      partyWise: [...profitParties.values()].sort((a,b) => b.profit - a.profit),
    },
  })
}
