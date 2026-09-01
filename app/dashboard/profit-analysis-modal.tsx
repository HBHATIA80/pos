'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CalendarDays, ChevronRight, CircleDollarSign, FileText, Package, RefreshCw, Store, TrendingDown, TrendingUp, Users, X } from 'lucide-react'

type ProfitRow = { sales: number; cogs: number; profit: number; margin: number }
type ProductRow = ProfitRow & { product_id: string; name: string; sku: string | null; quantity: number; average_purchase_cost: number; category: string }
type CategoryRow = ProfitRow & { category_id: string | null; name: string }
type InvoiceRow = ProfitRow & { invoice_id: string; invoice_no: string; date: string; party_id: string | null; party_name: string }
type PartyRow = ProfitRow & { party_id: string | null; name: string; invoices: number }
type DateRow = { date: string; sales: number; cogs: number; profit: number; invoices: number }
type ProfitData = { period: { start: string; end: string }; summary: { sales: number; cogs: number; grossProfit: number; grossMargin: number; invoiceCount: number; negativeInvoices: number; lowMarginProducts: number }; productWise: ProductRow[]; categoryWise: CategoryRow[]; invoiceWise: InvoiceRow[]; partyWise: PartyRow[]; dateWise: DateRow[] }

type Tab = 'overview' | 'product' | 'category' | 'date' | 'invoice' | 'party'

const money = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const dateText = (v: string) => new Date(`${v}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const pct = (v: number) => `${Number(v || 0).toFixed(1)}%`

export default function ProfitAnalysisModal({ start, end, onClose }: { start: string; end: string; onClose: () => void }) {
  const [data, setData] = useState<ProfitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'profit' | 'sales' | 'margin'>('profit')

  async function load() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/accounting/profit-analysis?start=${start}&end=${end}`, { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error || 'Unable to load profit analysis')
      setData(json)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load profit analysis') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [start, end])
  useEffect(() => { const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' } }, [onClose])

  const filteredProducts = useMemo(() => filterAndSort(data?.productWise || [], query, sort), [data, query, sort])
  const filteredCategories = useMemo(() => filterAndSort(data?.categoryWise || [], query, sort), [data, query, sort])
  const filteredInvoices = useMemo(() => (data?.invoiceWise || []).filter(x => `${x.invoice_no} ${x.party_name}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => sortValue(b, sort) - sortValue(a, sort)), [data, query, sort])
  const filteredParties = useMemo(() => filterAndSort(data?.partyWise || [], query, sort), [data, query, sort])

  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="flex max-h-[calc(100vh-24px)] w-[min(1180px,calc(100vw-24px))] min-w-0 flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl sm:max-h-[calc(100vh-40px)]">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Admin decision center</span><span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> {dateText(start)} – {dateText(end)}</span></div><h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Profit Analysis</h2><p className="mt-1 text-sm text-slate-500">See exactly which products, categories, dates, invoices and parties are driving profit.</p></div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-emerald-700 disabled:opacity-50" title="Refresh"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button><button type="button" onClick={onClose} className="rounded-xl bg-emerald-700 p-2.5 text-white transition hover:bg-emerald-800" aria-label="Close"><X className="h-5 w-5" /></button></div>
        </div>
      </header>

      {loading && <div className="min-h-[520px] flex-1 overflow-y-auto p-5 sm:p-7"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div><div className="mt-5 h-80 animate-pulse rounded-2xl bg-slate-100" /></div>}
      {!loading && error && <div className="flex min-h-[420px] flex-1 items-center justify-center p-8"><div className="max-w-md text-center"><AlertTriangle className="mx-auto h-10 w-10 text-red-500" /><h3 className="mt-3 text-lg font-black text-slate-950">Profit analysis unavailable</h3><p className="mt-1 text-sm text-slate-500">{error}</p><button onClick={() => void load()} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">Try again</button></div></div>}
      {!loading && data && <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/60 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Sales" value={money(data.summary.sales)} icon={<Store />} />
          <Kpi label="COGS" value={money(data.summary.cogs)} icon={<Package />} />
          <Kpi label="Gross Profit" value={money(data.summary.grossProfit)} accent={data.summary.grossProfit >= 0} icon={<CircleDollarSign />} extra={pct(data.summary.grossMargin)} />
          <Kpi label="Gross Margin" value={pct(data.summary.grossMargin)} accent={data.summary.grossMargin >= 0} icon={<BarChart3 />} extra={`${data.summary.invoiceCount} invoices`} />
        </div>

        {(data.summary.negativeInvoices > 0 || data.summary.lowMarginProducts > 0) && <div className="mt-4 grid gap-3 sm:grid-cols-2"><AlertBox icon={<TrendingDown />} title="Profit leakage" text={`${data.summary.negativeInvoices} invoice(s) sold below weighted cost.`} danger={data.summary.negativeInvoices > 0} /><AlertBox icon={<AlertTriangle />} title="Low margin products" text={`${data.summary.lowMarginProducts} product(s) are below 10% gross margin.`} danger={false} /></div>}

        <nav className="mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {([['overview','Overview','What happened?'],['product','Product Wise','What makes money?'],['category','Category Wise','Which category wins?'],['date','Date Wise','When is profit made?'],['invoice','Invoice Wise','Which invoices win?'],['party','Party Wise','Which customers win?']] as const).map(([key,label,desc]) => <button key={key} type="button" onClick={() => { setTab(key); setQuery('') }} className={`min-w-max rounded-xl px-3 py-2 text-left transition ${tab === key ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-yellow-100 hover:text-emerald-800'}`}><span className="block text-xs font-black">{label}</span><span className={`hidden text-[9px] font-semibold sm:block ${tab === key ? 'text-emerald-100' : 'text-slate-400'}`}>{desc}</span></button>)}
        </nav>

        {tab === 'overview' && <Overview data={data} onTab={setTab} />}
        {tab !== 'overview' && <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {tab !== 'date' && <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black text-slate-950">{tabTitle(tab)}</h3><p className="text-xs text-slate-500">Sorted by {sort === 'profit' ? 'profit' : sort === 'sales' ? 'sales' : 'margin'} · negative profit is a loss.</p></div><div className="flex flex-wrap gap-2"><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${tab === 'invoice' ? 'invoice or party' : tab}`} className="h-9 min-w-[190px] rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-emerald-500" /><select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none"><option value="profit">Highest profit</option><option value="sales">Highest sales</option><option value="margin">Highest margin</option></select></div></div>}
          {tab === 'product' && <ProductTable rows={filteredProducts} />}
          {tab === 'category' && <CategoryTable rows={filteredCategories} />}
          {tab === 'invoice' && <InvoiceTable rows={filteredInvoices} />}
          {tab === 'party' && <PartyTable rows={filteredParties} />}
          {tab === 'date' && <DateTable rows={data.dateWise} />}
        </div>}
      </div>}
    </div>
  </div>
}

function Kpi({ label, value, icon, accent, extra }: { label: string; value: string; icon: React.ReactNode; accent?: boolean; extra?: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black tracking-tight ${accent === undefined ? 'text-slate-950' : accent ? 'text-emerald-700' : 'text-red-700'}`}>{value}</p>{extra && <p className="mt-1 text-[10px] font-bold text-slate-400">{extra}</p>}</div><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">{icon}</span></div></div> }
function AlertBox({ icon, title, text, danger }: { icon: React.ReactNode; title: string; text: string; danger: boolean }) { return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}><div className="flex gap-3"><span className={`rounded-xl bg-white p-2 ${danger ? 'text-red-600' : 'text-yellow-700'}`}>{icon}</span><div><p className={`text-xs font-black uppercase tracking-wide ${danger ? 'text-red-800' : 'text-yellow-800'}`}>{title}</p><p className="mt-1 text-sm font-semibold text-slate-700">{text}</p></div></div></div> }

function Overview({ data, onTab }: { data: ProfitData; onTab: (tab: Tab) => void }) {
  const bestProduct = data.productWise[0]
  const bestCategory = data.categoryWise[0]
  const bestParty = data.partyWise[0]
  const bestInvoice = data.invoiceWise[0]
  const worstProduct = [...data.productWise].sort((a,b) => a.margin-b.margin)[0]
  const max = Math.max(1, ...data.dateWise.map(x => Math.abs(x.profit)))
  return <div className="mt-4 space-y-4">
    <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="font-black text-slate-950">Profit trend</h3><p className="mt-1 text-xs text-slate-500">Gross profit by day using weighted-average purchase cost.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">{data.dateWise.length} days</span></div><div className="mt-6 flex h-56 items-end gap-1 overflow-x-auto">{data.dateWise.map(row => <div key={row.date} className="group flex min-w-[30px] flex-1 flex-col items-center justify-end gap-2 rounded-lg px-0.5 py-1 hover:bg-yellow-50" title={`${dateText(row.date)} · Profit ${money(row.profit)}`}><div className="flex h-44 w-full max-w-10 items-end justify-center rounded-lg bg-slate-50 p-1"><div className={`w-3/5 rounded-t-md transition group-hover:bg-yellow-400 ${row.profit >= 0 ? 'bg-emerald-300' : 'bg-red-300'}`} style={{ height: `${Math.max(4, Math.abs(row.profit) / max * 100)}%` }} /></div><span className="text-[9px] font-semibold text-slate-500 group-hover:font-black group-hover:text-emerald-700">{new Date(`${row.date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-black text-slate-950">Decision summary</h3><p className="mt-1 text-xs text-slate-500">The numbers worth acting on first.</p><div className="mt-4 space-y-2">{bestProduct && <Decision label="Top product" value={bestProduct.name} amount={bestProduct.profit} onClick={() => onTab('product')} />}{bestCategory && <Decision label="Top category" value={bestCategory.name} amount={bestCategory.profit} onClick={() => onTab('category')} />}{bestParty && <Decision label="Top party" value={bestParty.name} amount={bestParty.profit} onClick={() => onTab('party')} />}{bestInvoice && <Decision label="Top invoice" value={bestInvoice.invoice_no} amount={bestInvoice.profit} onClick={() => onTab('invoice')} />}</div></section></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MiniDecision title="Highest profit product" main={bestProduct?.name || 'No sales'} value={bestProduct?.profit || 0} /><MiniDecision title="Lowest margin product" main={worstProduct?.name || 'No sales'} value={worstProduct?.margin || 0} percent /><MiniDecision title="Loss-making invoices" main={`${data.summary.negativeInvoices}`} value={data.summary.negativeInvoices} plain /><MiniDecision title="Products below 10%" main={`${data.summary.lowMarginProducts}`} value={data.summary.lowMarginProducts} plain /></div>
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4"><p className="text-xs font-black uppercase tracking-wide text-emerald-800">How profit is calculated</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-700"><b>Line sales − quantity × weighted-average purchase cost = gross profit.</b> The weighted-average cost changes as completed purchases occur. Operating expenses are intentionally kept outside product/category/invoice/party gross profit so the attribution remains logical.</p></div>
  </div>
}

function Decision({ label, value, amount, onClick }: { label: string; value: string; amount: number; onClick: () => void }) { return <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-left transition hover:border-yellow-200 hover:bg-yellow-50"><span><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</span><span className="block truncate text-sm font-black text-slate-800">{value}</span></span><span className={`text-sm font-black ${amount >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(amount)}</span></button> }
function MiniDecision({ title, main, value, percent, plain }: { title: string; main: string; value: number; percent?: boolean; plain?: boolean }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{title}</p><p className="mt-2 truncate text-sm font-black text-slate-900">{main}</p><p className={`mt-1 text-lg font-black ${!plain && value < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{plain ? value : percent ? pct(value) : money(value)}</p></div> }

function filterAndSort<T extends ProfitRow>(rows: T[], query: string, sort: 'profit' | 'sales' | 'margin') { const q = query.toLowerCase(); return rows.filter(x => JSON.stringify(x).toLowerCase().includes(q)).sort((a,b) => sortValue(b,sort)-sortValue(a,sort)) }
function sortValue(row: ProfitRow, sort: 'profit' | 'sales' | 'margin') { return sort === 'sales' ? row.sales : sort === 'margin' ? row.margin : row.profit }
function tabTitle(tab: Tab) { return ({ product: 'Product profitability', category: 'Category profitability', invoice: 'Invoice profitability', party: 'Party profitability', date: 'Daily profitability', overview: 'Profit overview' } as Record<Tab,string>)[tab] }

function TableWrap({ children }: { children: React.ReactNode }) { return <div className="max-h-[54vh] overflow-auto"><table className="min-w-[760px] w-full text-sm">{children}</table></div> }
function ProductTable({ rows }: { rows: ProductRow[] }) { return <TableWrap><thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Product</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">Avg cost</th><th className="p-3 text-right">COGS</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Margin</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map(r => <tr key={r.product_id} className="hover:bg-yellow-50"><td className="p-3"><b>{r.name}</b><span className="ml-2 text-xs text-slate-400">{r.sku || ''}</span><span className="block text-[10px] text-slate-400">{r.category}</span></td><td className="p-3 text-right">{r.quantity}</td><td className="p-3 text-right">{money(r.sales)}</td><td className="p-3 text-right">{money(r.average_purchase_cost)}</td><td className="p-3 text-right">{money(r.cogs)}</td><td className={`p-3 text-right font-black ${r.profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{money(r.profit)}</td><td className={`p-3 text-right font-black ${r.margin < 10 ? 'text-red-700' : 'text-slate-800'}`}>{pct(r.margin)}</td></tr>) : <Empty colSpan={7} />}</tbody></TableWrap> }
function CategoryTable({ rows }: { rows: CategoryRow[] }) { return <TableWrap><thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Category</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">COGS</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Margin</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map(r => <tr key={r.category_id || r.name} className="hover:bg-yellow-50"><td className="p-3 font-black text-slate-800">{r.name}</td><td className="p-3 text-right">{money(r.sales)}</td><td className="p-3 text-right">{money(r.cogs)}</td><td className={`p-3 text-right font-black ${r.profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{money(r.profit)}</td><td className="p-3 text-right font-black">{pct(r.margin)}</td></tr>) : <Empty colSpan={5} />}</tbody></TableWrap> }
function InvoiceTable({ rows }: { rows: InvoiceRow[] }) { return <TableWrap><thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Invoice</th><th className="p-3 text-left">Party</th><th className="p-3 text-left">Date</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">COGS</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Margin</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map(r => <tr key={r.invoice_id} className="hover:bg-yellow-50"><td className="p-3 font-black text-emerald-700">{r.invoice_no}</td><td className="p-3 font-semibold">{r.party_name}</td><td className="p-3">{dateText(r.date)}</td><td className="p-3 text-right">{money(r.sales)}</td><td className="p-3 text-right">{money(r.cogs)}</td><td className={`p-3 text-right font-black ${r.profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{money(r.profit)}</td><td className="p-3 text-right font-black">{pct(r.margin)}</td></tr>) : <Empty colSpan={7} />}</tbody></TableWrap> }
function PartyTable({ rows }: { rows: PartyRow[] }) { return <TableWrap><thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Party</th><th className="p-3 text-right">Invoices</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">COGS</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Margin</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map(r => <tr key={r.party_id || r.name} className="hover:bg-yellow-50"><td className="p-3 font-black text-slate-800">{r.name}</td><td className="p-3 text-right">{r.invoices}</td><td className="p-3 text-right">{money(r.sales)}</td><td className="p-3 text-right">{money(r.cogs)}</td><td className={`p-3 text-right font-black ${r.profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{money(r.profit)}</td><td className="p-3 text-right font-black">{pct(r.margin)}</td></tr>) : <Empty colSpan={6} />}</tbody></TableWrap> }
function DateTable({ rows }: { rows: DateRow[] }) { return <TableWrap><thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-right">Invoices</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">COGS</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Margin</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map(r => { const m = r.sales ? r.profit / r.sales * 100 : 0; return <tr key={r.date} className="hover:bg-yellow-50"><td className="p-3 font-black text-slate-800">{dateText(r.date)}</td><td className="p-3 text-right">{r.invoices}</td><td className="p-3 text-right">{money(r.sales)}</td><td className="p-3 text-right">{money(r.cogs)}</td><td className={`p-3 text-right font-black ${r.profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{money(r.profit)}</td><td className="p-3 text-right font-black">{pct(m)}</td></tr> }) : <Empty colSpan={6} />}</tbody></TableWrap> }
function Empty({ colSpan }: { colSpan: number }) { return <tr><td colSpan={colSpan} className="p-10 text-center text-sm font-semibold text-slate-500">No profitability data for the selected period.</td></tr> }
