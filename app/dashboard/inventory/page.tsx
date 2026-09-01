'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'

type Product = {
  id: string
  sku: string
  name: string
  barcode?: string | null
  current_stock: number
  reorder_level: number
  catalog_units?: { short_name?: string | null } | null
}

type Movement = {
  id: string
  product_id: string
  movement_type: string
  quantity: number
  notes: string | null
  created_at: string
  reference_type?: string | null
  products?: { name?: string; sku?: string } | null
}

type Analysis = {
  product_id: string
  sku: string
  name: string
  current_stock: number
  reorder_level: number
  purchase_price: number
  sale_price: number
  sold_units: number
  purchased_units: number
  sales_value: number
  purchase_value: number
  stock_cost_value: number
  stock_retail_value: number
  last_movement_at: string | null
}

type Summary = {
  products: number
  lowStock: number
  outOfStock: number
  totalUnits: number
  stockCostValue: number
  stockRetailValue: number
  soldUnits: number
  purchasedUnits: number
  salesValue: number
  purchaseValue: number
}

type Filter = 'all' | 'low' | 'out' | 'fast' | 'idle'
type Detail = 'stock' | 'low' | 'sold' | 'purchased' | 'value' | null

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const qty = (value: number) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [analysis, setAnalysis] = useState<Analysis[]>([])
  const [summary, setSummary] = useState<Summary>({
    products: 0,
    lowStock: 0,
    outOfStock: 0,
    totalUnits: 0,
    stockCostValue: 0,
    stockRetailValue: 0,
    soldUnits: 0,
    purchasedUnits: 0,
    salesValue: 0,
    purchaseValue: 0,
  })
  const [productId, setProductId] = useState('')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'overview' | 'analysis' | 'movements'>('overview')
  const [detail, setDetail] = useState<Detail>(null)

  async function load() {
    setLoading(true)
    try {
      const [inventory, stats] = await Promise.all([
        fetch('/api/inventory?limit=40', { cache: 'no-store' }),
        fetch('/api/inventory-analysis', { cache: 'no-store' }),
      ])
      const inventoryBody = await inventory.json().catch(() => ({}))
      const statsBody = await stats.json().catch(() => ({}))
      if (!inventory.ok) throw new Error(inventoryBody.error || 'Unable to load inventory')
      if (!stats.ok) throw new Error(statsBody.error || 'Unable to load inventory analysis')
      setProducts(inventoryBody.products ?? [])
      setMovements(inventoryBody.movements ?? [])
      setAnalysis(statsBody.analysis ?? [])
      setSummary(statsBody.summary ?? summary)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const selected = useMemo(() => products.find((product) => product.id === productId), [products, productId])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return analysis.filter((product) => {
      const matchesSearch = !q || product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q)
      const stock = Number(product.current_stock)
      const reorder = Number(product.reorder_level)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'out' && stock <= 0) ||
        (filter === 'low' && stock > 0 && stock <= reorder) ||
        (filter === 'fast' && product.sold_units > 0) ||
        (filter === 'idle' && product.sold_units <= 0 && stock > 0)
      return matchesSearch && matchesFilter
    })
  }, [analysis, search, filter])

  const stockHealth = summary.products ? Math.round(((summary.products - summary.lowStock) / summary.products) * 100) : 100
  const grossStockPotential = summary.stockRetailValue - summary.stockCostValue

  async function adjust() {
    if (!productId) return toast.error('Select a product first')
    const amount = Number(quantity)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid quantity')
    setSaving(true)
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, direction, quantity: amount, notes }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Adjustment failed')
      toast.success(`Stock ${direction === 'in' ? 'added' : 'removed'} successfully`)
      setNotes('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Adjustment failed')
    } finally {
      setSaving(false)
    }
  }

  function openDetail(next: Detail) {
    setDetail(next)
    if (next === 'low') setFilter('low')
    else if (next === 'sold') setFilter('fast')
    else if (next === 'stock' || next === 'value') setFilter('all')
    else if (next === 'purchased') setFilter('all')
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                <Boxes className="h-3.5 w-3.5" /> Inventory control centre
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Stock health & decisions</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Know what is in stock, what needs replenishment, where cash is locked, and which products are actually moving.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start xl:self-center">
              <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right sm:block">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Stock health</p>
                <p className={`text-sm font-black ${stockHealth >= 80 ? 'text-emerald-700' : stockHealth >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>{Math.max(0, stockHealth)}%</p>
              </div>
              <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4">
            {([['overview', 'Overview'], ['analysis', 'Product analysis'], ['movements', 'Movement history']] as const).map(([value, label]) => (
              <button key={value} onClick={() => setTab(value)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === value ? 'bg-emerald-700 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <DecisionCard icon={<Boxes />} label="Stock at cost" value={money(summary.stockCostValue)} sub={`${qty(summary.totalUnits)} units on hand`} tone="green" onClick={() => openDetail('value')} />
        <DecisionCard icon={<AlertTriangle />} label="Attention needed" value={`${summary.lowStock}`} sub={`${summary.outOfStock} completely out of stock`} tone="amber" onClick={() => openDetail('low')} />
        <DecisionCard icon={<TrendingDown />} label="Sold units" value={qty(summary.soldUnits)} sub={`${money(summary.salesValue)} sales value`} tone="blue" onClick={() => openDetail('sold')} />
        <DecisionCard icon={<TrendingUp />} label="Purchased units" value={qty(summary.purchasedUnits)} sub={`${money(summary.purchaseValue)} purchase value`} tone="violet" onClick={() => openDetail('purchased')} />
        <DecisionCard icon={<Package />} label="Potential stock margin" value={money(grossStockPotential)} sub="Retail value less cost" tone="gold" onClick={() => openDetail('value')} />
      </section>

      {tab === 'overview' && (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-emerald-600" /><h2 className="font-black text-slate-900">Stock actions</h2></div>
                  <p className="mt-1 text-xs text-slate-500">Use manual adjustments only for physical counts, damage, corrections or other traceable changes.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Audit friendly</span>
              </div>
              <div className="p-5">
                <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto]">
                  <ProductPicker value={selected ?? null} initialProducts={products} onSelect={(product) => setProductId(product?.id ?? '')} />
                  <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Action</label><select value={direction} onChange={(event) => setDirection(event.target.value as 'in' | 'out')} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"><option value="in">Add stock</option><option value="out">Remove stock</option></select></div>
                  <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Quantity</label><input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" /></div>
                  <div className="flex items-end"><button disabled={saving || !productId} onClick={() => void adjust()} className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white shadow-sm transition disabled:opacity-50 ${direction === 'in' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-600 hover:bg-rose-700'}`}>{direction === 'in' ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}{saving ? 'Saving…' : direction === 'in' ? 'Add stock' : 'Remove stock'}</button></div>
                </div>
                {selected && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500"><span>Current <b className="text-slate-800">{qty(selected.current_stock)} {selected.catalog_units?.short_name ?? ''}</b></span><span>Reorder at <b className="text-slate-800">{qty(selected.reorder_level)}</b></span><span>SKU <b className="text-slate-800">{selected.sku}</b></span></div>}
                <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason / reference — physical count, damaged, correction…" className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500" />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><div><h2 className="font-black text-slate-900">What needs attention</h2><p className="mt-1 text-xs text-slate-500">Priorities for today's stock decisions.</p></div><Zap className="h-5 w-5 text-amber-500" /></div>
              <div className="mt-4 space-y-3">
                <ActionRow icon={<AlertTriangle />} title="Low stock" value={summary.lowStock} description="Reorder before the next sales cycle." tone="amber" onClick={() => openDetail('low')} />
                <ActionRow icon={<Package />} title="Out of stock" value={summary.outOfStock} description="Products currently unavailable for sale." tone="rose" onClick={() => { setFilter('out'); setDetail('low') }} />
                <ActionRow icon={<Clock3 />} title="Idle stock" value={analysis.filter((item) => item.current_stock > 0 && item.sold_units <= 0).length} description="Units sitting without recorded sales." tone="slate" onClick={() => { setFilter('idle'); setDetail('stock') }} />
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-black text-slate-900">Inventory at a glance</h2><p className="mt-1 text-xs text-slate-500">Search products and act on the highest-priority stock issues first.</p></div>
              <button onClick={() => setTab('analysis')} className="self-start rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">Open full analysis →</button>
            </div>
            <ProductTable rows={visible.slice(0, 8)} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} compact />
          </section>
        </>
      )}

      {tab === 'analysis' && <AnalysisTable rows={visible} />}
      {tab === 'movements' && <MovementTable rows={movements} />}

      {detail && <DetailPanel detail={detail} analysis={analysis} summary={summary} onClose={() => setDetail(null)} onFilter={(next) => { setFilter(next); setDetail(null); setTab('analysis') }} />}
    </div>
  )
}

function DecisionCard({ icon, label, value, sub, tone, onClick }: { icon: ReactNode; label: string; value: string; sub: string; tone: 'green' | 'amber' | 'blue' | 'violet' | 'gold'; onClick: () => void }) {
  const styles = { green: 'bg-emerald-50 text-emerald-700 ring-emerald-100', amber: 'bg-amber-50 text-amber-700 ring-amber-100', blue: 'bg-blue-50 text-blue-700 ring-blue-100', violet: 'bg-violet-50 text-violet-700 ring-violet-100', gold: 'bg-yellow-50 text-yellow-700 ring-yellow-100' }[tone]
  return <button onClick={onClick} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-200"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${styles} transition group-hover:scale-105`}>{icon}</div><p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</p><p className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{value}</p><p className="mt-1 text-[11px] font-medium text-slate-400">{sub}</p><p className="mt-3 text-[10px] font-black uppercase tracking-wider text-emerald-700 opacity-0 transition group-hover:opacity-100">View details →</p></button>
}

function ActionRow({ icon, title, value, description, tone, onClick }: { icon: ReactNode; title: string; value: number; description: string; tone: 'amber' | 'rose' | 'slate'; onClick: () => void }) {
  const styles = tone === 'amber' ? 'bg-amber-50 text-amber-700' : tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
  return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-emerald-100 hover:bg-emerald-50/40"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles}`}>{icon}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><b className="text-sm text-slate-800">{title}</b><b className="text-sm text-slate-950">{value}</b></span><span className="mt-0.5 block truncate text-xs text-slate-400">{description}</span></span></button>
}

function ProductPicker({ value, initialProducts, onSelect }: { value: Product | null; initialProducts: Product[]; onSelect: (product: Product | null) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/inventory?limit=40&q=${encodeURIComponent(query.trim())}`, { cache: 'no-store' })
        const body = await response.json().catch(() => ({}))
        if (response.ok) setResults(body.products ?? [])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => clearTimeout(timer)
  }, [query, open])

  useEffect(() => { if (!query) setResults(initialProducts) }, [initialProducts, query])

  return <div className="relative"><label className="mb-1.5 block text-xs font-bold text-slate-600">Product</label><button type="button" onClick={() => setOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm outline-none transition hover:border-emerald-300 focus:ring-2 focus:ring-emerald-100"><span className={value ? 'truncate text-slate-900' : 'truncate text-slate-400'}>{value ? `${value.name} · ${value.sku}` : 'Search product by name, SKU or barcode…'}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /></button>{open && <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center gap-2 border-b border-slate-100 p-2"><Search className="ml-2 h-4 w-4 text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type to search live catalog…" className="min-h-10 flex-1 text-sm outline-none" /><button type="button" onClick={() => { setQuery(''); setOpen(false) }}><X className="h-4 w-4 text-slate-400" /></button></div><div className="max-h-72 overflow-y-auto">{loading ? <p className="p-4 text-sm text-slate-500">Searching live catalog…</p> : results.length === 0 ? <p className="p-4 text-sm text-slate-500">No matching products.</p> : results.map((product) => <button type="button" key={product.id} onClick={() => { onSelect(product); setOpen(false); setQuery('') }} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-emerald-50"><span className="min-w-0"><b className="block truncate text-sm text-slate-800">{product.name}</b><span className="text-xs text-slate-500">{product.sku}{product.barcode ? ` · ${product.barcode}` : ''}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${Number(product.current_stock) <= 0 ? 'bg-rose-50 text-rose-700' : Number(product.current_stock) <= Number(product.reorder_level) ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{qty(product.current_stock)} in stock</span></button>)}</div></div>}</div>
}

function ProductTable({ rows, search, setSearch, filter, setFilter, compact = false }: { rows: Analysis[]; search: string; setSearch: (value: string) => void; filter: Filter; setFilter: (value: Filter) => void; compact?: boolean }) {
  return <div><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or SKU…" className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-emerald-500" /></div><select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"><option value="all">All products</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="fast">Sold products</option><option value="idle">Idle stock</option></select></div><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Reorder</th><th className="px-5 py-3">Sold</th><th className="px-5 py-3">Cost value</th><th className="px-5 py-3">Retail value</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((product) => { const stock = Number(product.current_stock); const reorder = Number(product.reorder_level); const out = stock <= 0; const low = !out && stock <= reorder; return <tr key={product.product_id} className="transition hover:bg-emerald-50/40"><td className="px-5 py-3.5"><b className="block text-slate-800">{product.name}</b><span className="text-xs text-slate-400">{product.sku}</span></td><td className="px-5 py-3.5 font-black">{qty(stock)}</td><td className="px-5 py-3.5 text-slate-500">{qty(reorder)}</td><td className="px-5 py-3.5">{qty(product.sold_units)}</td><td className="px-5 py-3.5 font-semibold">{money(product.stock_cost_value)}</td><td className="px-5 py-3.5">{money(product.stock_retail_value)}</td><td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${out ? 'bg-rose-50 text-rose-700' : low ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{out ? 'Out of stock' : low ? 'Reorder' : 'Healthy'}</span></td></tr> }) : <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No products match this view.</td></tr>}</tbody></table></div>{compact && rows.length > 0 && <p className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">Showing the first {rows.length} products. Use Product analysis for the complete catalog.</p>}</div>
}

function AnalysisTable({ rows }: { rows: Analysis[] }) {
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /><h2 className="font-black text-slate-900">Product-level inventory analysis</h2></div><p className="mt-1 text-xs text-slate-500">Use cost value for working-capital decisions and retail value to understand potential sales value.</p></div><div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Purchase cost</th><th className="px-5 py-3">Sale price</th><th className="px-5 py-3">On hand</th><th className="px-5 py-3">Purchased</th><th className="px-5 py-3">Sold</th><th className="px-5 py-3">Stock cost</th><th className="px-5 py-3">Potential sales</th><th className="px-5 py-3">Last movement</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((product) => <tr key={product.product_id} className="hover:bg-emerald-50/40"><td className="px-5 py-4"><b>{product.name}</b><div className="text-xs text-slate-400">{product.sku}</div></td><td className="px-5 py-4">{money(product.purchase_price)}</td><td className="px-5 py-4">{money(product.sale_price)}</td><td className="px-5 py-4 font-black">{qty(product.current_stock)}</td><td className="px-5 py-4">{qty(product.purchased_units)}</td><td className="px-5 py-4">{qty(product.sold_units)}</td><td className="px-5 py-4 font-semibold">{money(product.stock_cost_value)}</td><td className="px-5 py-4 font-semibold">{money(product.stock_retail_value)}</td><td className="px-5 py-4 text-xs text-slate-500">{product.last_movement_at ? new Date(product.last_movement_at).toLocaleDateString('en-IN') : '—'}</td></tr>)}</tbody></table></div></section>
}

function MovementTable({ rows }: { rows: Movement[] }) {
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-emerald-600" /><h2 className="font-black text-slate-900">Movement history</h2></div><p className="mt-1 text-xs text-slate-500">Automatic sales/purchases and manual corrections, newest first.</p></div><div className="max-h-[620px] overflow-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Movement</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((movement) => <tr key={movement.id} className="hover:bg-emerald-50/40"><td className="px-5 py-3"><b>{movement.products?.name ?? 'Product'}</b><div className="text-xs text-slate-400">{movement.products?.sku}</div></td><td className="px-5 py-3 capitalize">{movement.movement_type.replaceAll('_', ' ')}</td><td className="px-5 py-3 font-black">{qty(movement.quantity)}</td><td className="px-5 py-3 text-xs text-slate-500">{movement.reference_type ?? 'manual'}</td><td className="max-w-xs px-5 py-3 text-xs text-slate-500">{movement.notes || '—'}</td><td className="px-5 py-3 text-xs text-slate-500">{new Date(movement.created_at).toLocaleString('en-IN')}</td></tr>)}</tbody></table></div></section>
}

function DetailPanel({ detail, analysis, summary, onClose, onFilter }: { detail: Exclude<Detail, null>; analysis: Analysis[]; summary: Summary; onClose: () => void; onFilter: (filter: Filter) => void }) {
  const title = detail === 'low' ? 'Stock requiring attention' : detail === 'sold' ? 'Products with recorded sales' : detail === 'purchased' ? 'Purchased stock' : 'Inventory valuation'
  const description = detail === 'low' ? 'Prioritise these products for replenishment or physical verification.' : detail === 'sold' ? 'Products with recorded movement through sales.' : detail === 'purchased' ? 'Products that have received purchase quantities.' : 'Understand how much capital is currently tied up in inventory.'
  const rows = detail === 'low' ? analysis.filter((item) => Number(item.current_stock) <= Number(item.reorder_level)) : detail === 'sold' ? analysis.filter((item) => item.sold_units > 0) : detail === 'purchased' ? analysis.filter((item) => item.purchased_units > 0) : analysis.filter((item) => item.current_stock > 0)
  const cost = rows.reduce((sum, item) => sum + Number(item.stock_cost_value), 0)
  const retail = rows.reduce((sum, item) => sum + Number(item.stock_retail_value), 0)
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="flex max-h-[calc(100vh-32px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-5 sm:p-6"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Inventory decision detail</p><h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{title}</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p></div><button onClick={onClose} className="rounded-xl bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100" aria-label="Close"><X className="h-5 w-5" /></button></div><div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-5 sm:grid-cols-4"><MiniStat label="Products" value={rows.length.toLocaleString('en-IN')} /><MiniStat label="Units" value={qty(rows.reduce((sum, item) => sum + Number(item.current_stock), 0))} /><MiniStat label="Cost value" value={money(cost)} /><MiniStat label="Retail value" value={money(retail)} /></div><div className="min-h-0 flex-1 overflow-auto p-5"><div className="mb-4 flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500">Quick view:</span><button onClick={() => onFilter(detail === 'low' ? 'low' : detail === 'sold' ? 'fast' : 'all')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Open in analysis</button>{detail === 'low' && summary.outOfStock > 0 && <button onClick={() => onFilter('out')} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Only out of stock</button>}</div><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">On hand</th><th className="px-4 py-3">Reorder</th><th className="px-4 py-3">Sold</th><th className="px-4 py-3">Stock cost</th><th className="px-4 py-3">Potential sales</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((item) => <tr key={item.product_id} className="hover:bg-emerald-50/40"><td className="px-4 py-3"><b>{item.name}</b><div className="text-xs text-slate-400">{item.sku}</div></td><td className="px-4 py-3 font-black">{qty(item.current_stock)}</td><td className="px-4 py-3">{qty(item.reorder_level)}</td><td className="px-4 py-3">{qty(item.sold_units)}</td><td className="px-4 py-3 font-semibold">{money(item.stock_cost_value)}</td><td className="px-4 py-3">{money(item.stock_retail_value)}</td></tr>)}</tbody></table></div></div></div></div>
}

function MiniStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-base font-black text-slate-900">{value}</p></div> }
