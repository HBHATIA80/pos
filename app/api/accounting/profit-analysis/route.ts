import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const n = (v: unknown) => Number(v ?? 0)
const iso = (date: string, end = false) => `${date}T${end ? '23:59:59.999' : '00:00:00.000'}Z`
const round2 = (v: number) => Number(v.toFixed(2))
const margin = (sales: number, profit: number) => sales ? round2((profit / sales) * 100) : 0

function saleDate(row: { sold_at?: string | null; completed_at?: string | null; created_at?: string | null }) {
  return row.sold_at ?? row.completed_at ?? row.created_at ?? ''
}

type PurchaseItem = { product_id: string; quantity: number; unit_price: number; discount_amount?: number | null; line_total?: number | null }
type Purchase = { purchased_at?: string | null; completed_at?: string | null; created_at?: string | null; purchase_invoice_items?: PurchaseItem[] }
type SaleItem = { product_id: string; product_name?: string | null; sku?: string | null; quantity: number; unit_price?: number | null; discount_amount?: number | null; line_total?: number | null }

function weightedAverageCost(purchases: Purchase[], fallback: Map<string, number>) {
  const events = [...purchases].sort((a, b) => (a.purchased_at ?? a.completed_at ?? a.created_at ?? '').localeCompare(b.purchased_at ?? b.completed_at ?? b.created_at ?? ''))
  const state = new Map<string, { qty: number; value: number }>()
  const snapshots: { date: string; costs: Map<string, number> }[] = []
  for (const purchase of events) {
    const date = purchase.purchased_at ?? purchase.completed_at ?? purchase.created_at ?? ''
    for (const item of purchase.purchase_invoice_items ?? []) {
      const qty = n(item.quantity)
      if (qty <= 0) continue
      const value = item.line_total == null ? Math.max(0, n(item.unit_price) * qty - n(item.discount_amount)) : Math.max(0, n(item.line_total))
      const old = state.get(item.product_id) ?? { qty: 0, value: 0 }
      old.qty += qty
      old.value += value
      state.set(item.product_id, old)
    }
    snapshots.push({ date, costs: new Map([...state.entries()].map(([id, x]) => [id, x.qty ? x.value / x.qty : (fallback.get(id) ?? 0)])) })
  }
  return (productId: string, at: string) => {
    let best: Map<string, number> | null = null
    for (const snapshot of snapshots) {
      if (snapshot.date <= at) best = snapshot.costs
      else break
    }
    return best?.get(productId) ?? fallback.get(productId) ?? 0
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id || profile.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const url = new URL(request.url)
  const start = url.searchParams.get('start') || new Date().toISOString().slice(0, 10)
  const end = url.searchParams.get('end') || start
  if (start > end) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  const businessId = profile.business_id

  const [{ data: sales, error: salesError }, { data: purchases, error: purchasesError }, { data: products, error: productsError }, { data: categories, error: categoriesError }, { data: parties, error: partiesError }] = await Promise.all([
    supabase.from('sales_invoices').select('id,invoice_no,party_id,grand_total,sold_at,completed_at,created_at,sales_invoice_items(product_id,product_name,sku,quantity,unit_price,discount_amount,line_total)').eq('business_id', businessId).eq('status', 'completed').is('deleted_at', null).is('cancelled_at', null).gte('sold_at', iso(start)).lte('sold_at', iso(end, true)).order('sold_at'),
    supabase.from('purchase_invoices').select('purchased_at,completed_at,created_at,purchase_invoice_items(product_id,quantity,unit_price,discount_amount,line_total)').eq('business_id', businessId).eq('status', 'completed').is('deleted_at', null).lte('purchased_at', iso(end, true)).order('purchased_at'),
    supabase.from('products').select('id,name,sku,category_id,purchase_price').eq('business_id', businessId),
    supabase.from('catalog_categories').select('id,name').eq('business_id', businessId),
    supabase.from('parties').select('id,name').eq('business_id', businessId),
  ])
  for (const e of [salesError, purchasesError, productsError, categoriesError, partiesError]) if (e) return NextResponse.json({ error: e.message }, { status: 400 })

  const productRows = products ?? []
  const productMap = new Map(productRows.map(p => [p.id, p]))
  const fallback = new Map(productRows.map(p => [p.id, n(p.purchase_price)]))
  const categoryMap = new Map((categories ?? []).map(c => [c.id, c.name]))
  const partyMap = new Map((parties ?? []).map(p => [p.id, p.name]))
  const costAt = weightedAverageCost((purchases ?? []) as Purchase[], fallback)

  const productWise = new Map<string, { product_id: string; name: string; sku: string | null; quantity: number; sales: number; cogs: number; profit: number; margin: number; average_purchase_cost: number; category: string }>()
  const categoryWise = new Map<string, { category_id: string | null; name: string; sales: number; cogs: number; profit: number; margin: number }>()
  const partyWise = new Map<string, { party_id: string | null; name: string; invoices: number; sales: number; cogs: number; profit: number; margin: number }>()
  const invoiceWise: { invoice_id: string; invoice_no: string; date: string; party_id: string | null; party_name: string; sales: number; cogs: number; profit: number; margin: number }[] = []
  const dateWise = new Map<string, { date: string; sales: number; cogs: number; profit: number; invoices: number }>()

  for (const invoice of sales ?? []) {
    const dateTime = saleDate(invoice)
    const date = dateTime.slice(0, 10)
    let invoiceCogs = 0
    const items = (invoice.sales_invoice_items ?? []) as SaleItem[]
    for (const item of items) {
      const qty = n(item.quantity)
      const lineSales = item.line_total == null ? Math.max(0, n(item.unit_price) * qty - n(item.discount_amount)) : n(item.line_total)
      const avgCost = costAt(item.product_id, dateTime)
      const lineCogs = qty * avgCost
      const product = productMap.get(item.product_id)
      const categoryId = product?.category_id ?? null
      const categoryName = categoryId ? (categoryMap.get(categoryId) ?? 'Uncategorised') : 'Uncategorised'
      invoiceCogs += lineCogs

      const p = productWise.get(item.product_id) ?? { product_id: item.product_id, name: item.product_name || product?.name || 'Unknown product', sku: item.sku ?? product?.sku ?? null, quantity: 0, sales: 0, cogs: 0, profit: 0, margin: 0, average_purchase_cost: avgCost, category: categoryName }
      p.quantity += qty; p.sales += lineSales; p.cogs += lineCogs; p.profit += lineSales - lineCogs; p.average_purchase_cost = avgCost; p.margin = margin(p.sales, p.profit); productWise.set(item.product_id, p)

      const categoryKey = categoryId ?? '__uncategorised__'
      const c = categoryWise.get(categoryKey) ?? { category_id: categoryId, name: categoryName, sales: 0, cogs: 0, profit: 0, margin: 0 }
      c.sales += lineSales; c.cogs += lineCogs; c.profit += lineSales - lineCogs; c.margin = margin(c.sales, c.profit); categoryWise.set(categoryKey, c)
    }

    const invoiceSales = n(invoice.grand_total)
    const invoiceProfit = invoiceSales - invoiceCogs
    const partyName = invoice.party_id ? (partyMap.get(invoice.party_id) ?? 'Unknown party') : 'Walk-in / Other'
    invoiceWise.push({ invoice_id: invoice.id, invoice_no: invoice.invoice_no, date, party_id: invoice.party_id ?? null, party_name: partyName, sales: invoiceSales, cogs: invoiceCogs, profit: invoiceProfit, margin: margin(invoiceSales, invoiceProfit) })

    const partyKey = invoice.party_id ?? '__walkin__'
    const party = partyWise.get(partyKey) ?? { party_id: invoice.party_id ?? null, name: partyName, invoices: 0, sales: 0, cogs: 0, profit: 0, margin: 0 }
    party.invoices += 1; party.sales += invoiceSales; party.cogs += invoiceCogs; party.profit += invoiceProfit; party.margin = margin(party.sales, party.profit); partyWise.set(partyKey, party)

    const day = dateWise.get(date) ?? { date, sales: 0, cogs: 0, profit: 0, invoices: 0 }
    day.sales += invoiceSales; day.cogs += invoiceCogs; day.profit += invoiceProfit; day.invoices += 1; dateWise.set(date, day)
  }

  const totalSales = invoiceWise.reduce((sum, row) => sum + row.sales, 0)
  const totalCogs = invoiceWise.reduce((sum, row) => sum + row.cogs, 0)
  const grossProfit = totalSales - totalCogs
  const negativeInvoices = invoiceWise.filter(row => row.profit < -0.005).length
  const lowMarginProducts = [...productWise.values()].filter(row => row.sales > 0 && row.margin < 10).length

  return NextResponse.json({
    period: { start, end },
    summary: { sales: round2(totalSales), cogs: round2(totalCogs), grossProfit: round2(grossProfit), grossMargin: margin(totalSales, grossProfit), invoiceCount: invoiceWise.length, negativeInvoices, lowMarginProducts },
    productWise: [...productWise.values()].map(x => ({ ...x, sales: round2(x.sales), cogs: round2(x.cogs), profit: round2(x.profit), average_purchase_cost: round2(x.average_purchase_cost) })).sort((a,b) => b.profit - a.profit),
    categoryWise: [...categoryWise.values()].map(x => ({ ...x, sales: round2(x.sales), cogs: round2(x.cogs), profit: round2(x.profit) })).sort((a,b) => b.profit - a.profit),
    invoiceWise: invoiceWise.map(x => ({ ...x, sales: round2(x.sales), cogs: round2(x.cogs), profit: round2(x.profit) })).sort((a,b) => b.profit - a.profit),
    partyWise: [...partyWise.values()].map(x => ({ ...x, sales: round2(x.sales), cogs: round2(x.cogs), profit: round2(x.profit) })).sort((a,b) => b.profit - a.profit),
    dateWise: [...dateWise.values()].map(x => ({ ...x, sales: round2(x.sales), cogs: round2(x.cogs), profit: round2(x.profit) })).sort((a,b) => a.date.localeCompare(b.date)),
  })
}
