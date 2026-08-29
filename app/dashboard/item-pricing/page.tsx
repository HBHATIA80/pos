'use client'

import { useEffect, useMemo, useState } from 'react'
import { History, PackageSearch, Save, Search, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

type Product = { id: string; sku: string; barcode: string | null; name: string; purchase_price: number; sale_price: number; current_stock: number }
type PurchasePrice = { id: string; invoice_no: string; unit_price: number; quantity: number; purchased_at: string }
type PricingDetail = { product: Product; unit_price: number; source: string; last_purchase_prices: PurchasePrice[] }
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function ItemPricingPage() {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [detail, setDetail] = useState<PricingDetail | null>(null)
  const [salePrice, setSalePrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams({ entity: 'products', limit: '100' })
      if (query.trim()) params.set('q', query.trim())
      fetch(`/api/catalog?${params.toString()}`, { cache: 'no-store' })
        .then(async response => {
          const body = await response.json()
          if (!response.ok) throw new Error(body.error || 'Unable to load products')
          setProducts(body.products ?? [])
          if (!selected && body.products?.[0]) setSelected(body.products[0])
        })
        .catch(error => toast.error(error instanceof Error ? error.message : 'Unable to load products'))
        .finally(() => setLoading(false))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!selected) return
    setSalePrice(String(selected.sale_price ?? 0))
    fetch(`/api/pos/pricing?product_id=${selected.id}`, { cache: 'no-store' })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load pricing history')
        setDetail(body)
        setSalePrice(String(body.product.sale_price ?? 0))
      })
      .catch(error => toast.error(error instanceof Error ? error.message : 'Unable to load pricing history'))
  }, [selected?.id])

  const averagePurchase = useMemo(() => {
    const rows = detail?.last_purchase_prices ?? []
    if (!rows.length) return 0
    return rows.reduce((sum, row) => sum + row.unit_price, 0) / rows.length
  }, [detail])

  async function saveSalePrice() {
    if (!selected) return
    const value = Number(salePrice)
    if (!Number.isFinite(value) || value < 0) { toast.error('Enter a valid sale price'); return }
    setSaving(true)
    try {
      const response = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'products', id: selected.id, data: { sale_price: value } }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to save sale price')
      const next = { ...selected, sale_price: value }
      setSelected(next)
      setProducts(rows => rows.map(row => row.id === selected.id ? next : row))
      setDetail(current => current ? { ...current, product: next, unit_price: value } : current)
      toast.success('Sale price updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save sale price')
    } finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-7xl space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700"><TrendingUp className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[.15em] text-green-700">Pricing desk</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950">Item Pricing</h1><p className="mt-1 text-sm text-slate-600">Review current pricing, change the sale price and compare the last five completed purchase prices.</p></div></div>
        <div className="relative w-full lg:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product, SKU or barcode" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-base font-medium text-slate-950" /></div>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4"><div className="flex items-center gap-2"><PackageSearch className="h-5 w-5 text-green-700" /><h2 className="text-lg font-extrabold text-slate-950">Products</h2><span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">{products.length}</span></div></div>
        <div className="max-h-[620px] overflow-y-auto">
          {loading ? <div className="p-8 text-center text-sm font-semibold text-slate-600">Loading products…</div> : products.length ? products.map(product => <button key={product.id} type="button" onClick={() => setSelected(product)} className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-green-50 ${selected?.id === product.id ? 'bg-green-50 ring-inset ring-2 ring-green-200' : 'bg-white'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-base font-extrabold text-slate-950">{product.name}</p><p className="mt-1 text-sm font-medium text-slate-600">{product.sku}{product.barcode ? ` · ${product.barcode}` : ''}</p></div><span className="shrink-0 text-sm font-extrabold text-green-700">{money(product.sale_price)}</span></div></button>) : <div className="p-8 text-center text-sm font-semibold text-slate-600">No products found.</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {!selected || !detail ? <div className="flex min-h-[420px] items-center justify-center text-sm font-semibold text-slate-600">Select an item to see its pricing.</div> : <>
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-green-700">Selected item</p><h2 className="mt-1 text-2xl font-extrabold text-slate-950">{detail.product.name}</h2><p className="mt-1 text-sm font-semibold text-slate-600">SKU {detail.product.sku} · Stock {detail.product.current_stock}</p></div><div className="rounded-xl bg-green-50 px-4 py-3 text-right"><p className="text-xs font-bold uppercase tracking-wide text-green-700">Current sale price</p><p className="mt-1 text-2xl font-black text-green-700">{money(detail.product.sale_price)}</p></div></div>

          <div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-600">Current purchase price</p><p className="mt-2 text-xl font-extrabold text-slate-950">{money(detail.product.purchase_price)}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-600">Last 5 avg. purchase</p><p className="mt-2 text-xl font-extrabold text-slate-950">{averagePurchase ? money(averagePurchase) : '—'}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-600">Automatic POS price</p><p className="mt-2 text-xl font-extrabold text-slate-950">{money(detail.unit_price)}</p></div></div>

          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50/60 p-5"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div className="w-full md:max-w-sm"><label className="text-sm font-extrabold text-slate-950">Sale price</label><div className="mt-2 flex"><span className="flex h-12 items-center rounded-l-xl border border-r-0 border-slate-300 bg-white px-4 text-base font-bold text-slate-700">₹</span><input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="h-12 w-full rounded-r-xl border border-slate-300 bg-white px-4 text-base font-extrabold text-slate-950" /></div></div><button type="button" disabled={saving} onClick={() => void saveSalePrice()} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 font-extrabold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"><Save className="h-5 w-5" />{saving ? 'Saving…' : 'Save Sale Price'}</button></div><p className="mt-3 text-sm font-medium text-slate-600">This updates the product master sale price used by the POS when no customer-specific price list overrides it.</p></div>

          <div className="mt-7"><div className="flex items-center gap-2"><History className="h-5 w-5 text-green-700" /><h3 className="text-lg font-extrabold text-slate-950">Last 5 purchase prices</h3></div><div className="mt-3 overflow-x-auto rounded-xl border border-slate-200"><table><thead><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Purchase</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Unit price</th></tr></thead><tbody>{detail.last_purchase_prices.length ? detail.last_purchase_prices.map(row => <tr key={row.id}><td className="px-4 py-3">{new Date(row.purchased_at).toLocaleDateString('en-IN')}</td><td className="px-4 py-3 font-bold text-slate-950">{row.invoice_no}</td><td className="px-4 py-3 text-right">{row.quantity}</td><td className="px-4 py-3 text-right font-extrabold text-slate-950">{money(row.unit_price)}</td></tr>) : <tr><td colSpan={4} className="px-4 py-8 text-center font-semibold text-slate-600">No completed purchase history found for this item.</td></tr>}</tbody></table></div></div>
        </>}
      </section>
    </div>
  </div>
}
