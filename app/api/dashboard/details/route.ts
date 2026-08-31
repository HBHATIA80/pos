import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const iso = (v: string | null, end = false) => `${v || new Date().toISOString().slice(0, 10)}${end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
const num = (v: unknown) => Number(v ?? 0)

type PartyRow = { id: string; name: string; phone?: string | null; party_type?: string | null }
type PurchaseItem = { product_id: string; quantity: number; unit_price: number; discount_amount?: number | null; line_total?: number | null }
type PurchaseInvoice = { purchased_at?: string | null; completed_at?: string | null; created_at?: string | null; purchase_invoice_items?: PurchaseItem[] }
type InvoiceItem = { id: string; product_id: string; sku: string; product_name: string; unit_name: string; quantity: number; unit_price: number; discount_amount: number; line_total: number; cost_unit_price?: number | null }
type InvoiceRow = { id: string; invoice_no: string; status: string; party_id: string | null; subtotal: number; discount_amount: number; grand_total: number; notes?: string | null; parties?: PartyRow | PartyRow[] | null; party?: PartyRow | PartyRow[] | null; sales_invoice_items?: InvoiceItem[] }

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
      const qty = num(item.quantity)
      if (qty <= 0) continue
      const lineTotal = item.line_total == null ? num(item.unit_price) * qty - num(item.discount_amount) : num(item.line_total)
      const value = lineTotal > 0 ? lineTotal : num(item.unit_price) * qty
      const old = state.get(item.product_id) ?? { qty: 0, value: 0 }
      old.qty += qty
      old.value += value
      state.set(item.product_id, old)
    }
    snapshots.push({ date, costs: new Map([...state.entries()].map(([id, x]) => [id, x.qty > 0 ? x.value / x.qty : (fallbackCosts.get(id) ?? 0)])) })
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

async function attachPartyNames<T extends { party_id?: string | null; parties?: unknown }>(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string, rows: T[]) {
  const partyIds = [...new Set(rows.map(row => row.party_id).filter((id): id is string => Boolean(id)))]
  if (!partyIds.length) return rows
  const { data: parties } = await supabase.from('parties').select('id,name,phone,party_type').eq('business_id', businessId).in('id', partyIds)
  const partyMap = new Map((parties ?? []).map(party => [party.id, party]))
  return rows.map(row => ({ ...row, party: row.parties || (row.party_id ? partyMap.get(row.party_id) ?? null : null) }))
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
    const { data, error } = await supabase.from('sales_invoices').select('id,invoice_no,status,party_id,subtotal,discount_amount,grand_total,notes,sold_at,completed_at,created_at,parties(id,name,phone,party_type),sales_invoice_items(id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total,cost_unit_price)').eq('business_id', businessId).is('deleted_at', null).gte('created_at', iso(start)).lte('created_at', iso(end, true)).order('created_at', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ type, rows: await attachPartyNames(supabase, businessId, data ?? []) })
  }

  if (type === 'purchases') {
    const { data, error } = await supabase.from('purchase_invoices').select('id,invoice_no,status,party_id,subtotal,discount_amount,grand_total,notes,purchased_at,completed_at,created_at,parties(id,name,phone,party_type),purchase_invoice_items(id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total)').eq('business_id', businessId).is('deleted_at', null).gte('created_at', iso(start)).lte('created_at', iso(end, true)).order('created_at', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ type, rows: await attachPartyNames(supabase, businessId, data ?? []) })
  }

  if (type === 'grossprofit' || type === 'netprofit') {
    const [{ data: sales, error: salesError }, { data: products, error: productsError }, { data: purchases, error: purchasesError }] = await Promise.all([
      supabase.from('sales_invoices').select('id,invoice_no,status,party_id,subtotal,discount_amount,grand_total,notes,sold_at,completed_at,created_at,parties(id,name,phone,party_type),sales_invoice_items(id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total,cost_unit_price)').eq('business_id', businessId).eq('status', 'completed').is('deleted_at', null).is('cancelled_at', null).gte('sold_at', iso(start)).lte('sold_at', iso(end, true)).order('sold_at', { ascending: false }).limit(200),
      supabase.from('products').select('id,purchase_price').eq('business_id', businessId),
      supabase.from('purchase_invoices').select('purchased_at,completed_at,created_at,purchase_invoice_items(product_id,quantity,unit_price,discount_amount,line_total)').eq('business_id', businessId).eq('status', 'completed').is('deleted_at', null).lte('purchased_at', iso(end, true)).order('purchased_at'),
    ])
    if (salesError || productsError || purchasesError) return NextResponse.json({ error: salesError?.message || productsError?.message || purchasesError?.message }, { status: 400 })

    const fallbackCosts = new Map((products ?? []).map(product => [product.id, num(product.purchase_price)]))
    const weightedCostAt = buildWeightedAverageLookup((purchases ?? []) as PurchaseInvoice[], fallbackCosts)
    const invoices = (await attachPartyNames(supabase, businessId, (sales ?? []) as InvoiceRow[])).map(invoice => {
      const saleDate = invoice.sold_at || invoice.completed_at || invoice.created_at
      const salesItems = (invoice.sales_invoice_items ?? []).map(item => ({ ...item, cost_unit_price: weightedCostAt(item.product_id, saleDate || '') }))
      const cogs = salesItems.reduce((sum, item) => sum + num(item.quantity) * num(item.cost_unit_price), 0)
      const salesValue = num(invoice.grand_total)
      return { ...invoice, sales_invoice_items: salesItems, cogs, gross_profit: salesValue - cogs }
    })

    const saleRows = invoices.map(invoice => ({ kind: 'sale', id: invoice.id, invoice_no: invoice.invoice_no, date: invoice.sold_at || invoice.created_at, party: invoice.party, status: invoice.status, sales: num(invoice.grand_total), cogs: num(invoice.cogs), gross_profit: num(invoice.gross_profit), invoice }))
    if (type === 'grossprofit') return NextResponse.json({ type, rows: saleRows, summary: { sales: saleRows.reduce((s, row) => s + row.sales, 0), cogs: saleRows.reduce((s, row) => s + row.cogs, 0), grossProfit: saleRows.reduce((s, row) => s + row.gross_profit, 0) } })

    const [{ data: lines, error: linesError }, { data: accounts, error: accountsError }, { data: groups, error: groupsError }] = await Promise.all([
      supabase.from('accounting_posted_lines').select('journal_line_id,entry_date,account_id,debit,credit,narration,voucher_type,voucher_no').eq('business_id', businessId).gte('entry_date', iso(start)).lte('entry_date', iso(end, true)).order('entry_date', { ascending: false }).limit(500),
      supabase.from('accounts').select('id,name,account_code,account_nature,account_group_id').eq('business_id', businessId).eq('is_active', true),
      supabase.from('account_groups').select('id,name').eq('business_id', businessId).eq('is_active', true),
    ])
    if (linesError || accountsError || groupsError) return NextResponse.json({ error: linesError?.message || accountsError?.message || groupsError?.message }, { status: 400 })
    const accountMap = new Map((accounts ?? []).map(account => [account.id, account]))
    const groupMap = new Map((groups ?? []).map(group => [group.id, group.name]))
    const ledgerRows = (lines ?? []).flatMap(line => {
      const account = accountMap.get(line.account_id)
      if (!account) return []
      const group = groupMap.get(account.account_group_id) || ''
      const nature = account.account_nature
      if ((nature === 'expense' && group.toLowerCase().includes('purchase')) || (nature === 'income' && group.toLowerCase().includes('sales'))) return []
      const id = line.journal_line_id
      if (nature === 'expense') return [{ kind: 'expense', id, date: line.entry_date, account: account.name, reference_type: line.voucher_type, reference_id: line.voucher_no, description: line.narration || 'Operating expense', amount: num(line.debit) - num(line.credit) }]
      if (nature === 'income') return [{ kind: 'income', id, date: line.entry_date, account: account.name, reference_type: line.voucher_type, reference_id: line.voucher_no, description: line.narration || 'Other income', amount: num(line.credit) - num(line.debit) }]
      return []
    }).filter(row => row.amount !== 0)
    const operatingExpense = Math.max(ledgerRows.filter(row => row.kind === 'expense').reduce((s, row) => s + row.amount, 0), 0)
    const otherIncome = Math.max(ledgerRows.filter(row => row.kind === 'income').reduce((s, row) => s + row.amount, 0), 0)
    const salesTotal = saleRows.reduce((s, row) => s + row.sales, 0)
    const cogsTotal = saleRows.reduce((s, row) => s + row.cogs, 0)
    const grossProfit = salesTotal - cogsTotal
    const netProfit = grossProfit + otherIncome - operatingExpense
    return NextResponse.json({ type, rows: [...saleRows, ...ledgerRows], summary: { sales: salesTotal, cogs: cogsTotal, grossProfit, operatingExpense, otherIncome, netProfit } })
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
      supabase.from('accounting_posted_lines').select('journal_line_id,entry_date,account_id,debit,credit,narration,voucher_type,voucher_no').eq('business_id', businessId).gte('entry_date', iso(start)).lte('entry_date', iso(end, true)).order('entry_date', { ascending: false }).limit(200),
    ])
    if (accountsError || linesError) return NextResponse.json({ error: accountsError?.message || linesError?.message }, { status: 400 })
    const map = new Map((accounts ?? []).map(a => [a.id, a]))
    return NextResponse.json({ type, rows: (lines ?? []).filter(r => map.has(r.account_id)).map(r => ({ ...r, id: r.journal_line_id, account: map.get(r.account_id)?.name || map.get(r.account_id)?.account_code || 'Cash / Bank' })) })
  }

  return NextResponse.json({ error: 'Unsupported detail type' }, { status: 400 })
}
