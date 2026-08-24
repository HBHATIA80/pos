'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Loader2, PackageSearch, Search, Store, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Product = { id: string; sku: string; barcode: string | null; name: string; image_url: string | null; sale_price: number; current_stock: number; is_active: boolean; marketplace_enabled: boolean }
export default function MarketplaceManagerPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  async function load(q = search, append = false) {
    if (!append) setLoading(true)
    try {
      const params = new URLSearchParams({ entity: 'products', q: q.trim(), limit: '50', offset: String(append ? products.length : 0) })
      const response = await fetch(`/api/catalog?${params}`, { cache: 'no-store' }); const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load products')
      setProducts(current => append ? [...current, ...(body.products || [])] : (body.products || [])); setHasMore(Boolean(body.hasMore))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load products') } finally { setLoading(false) }
  }
  async function toggle(product: Product) {
    setBusy(product.id)
    try {
      const response = await fetch('/api/catalog', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'products', id: product.id, data: { marketplace_enabled: !product.marketplace_enabled } }) })
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Unable to update marketplace listing')
      setProducts(current => current.map(item => item.id === product.id ? { ...item, marketplace_enabled: Boolean(body.marketplace_enabled) } : item))
      toast.success(product.marketplace_enabled ? 'Removed from marketplace' : 'Listed on marketplace')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update marketplace listing') } finally { setBusy(null) }
  }
  useEffect(() => { void load('') }, [])
  useEffect(() => { const timer = setTimeout(() => void load(search), 250); return () => clearTimeout(timer) }, [search])
  return <div className="mx-auto max-w-[1400px] space-y-5">
    <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><Link href="/dashboard/marketplace" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold ring-1 ring-white/15 hover:bg-white/15"><Store className="h-4 w-4" /> View Marketplace</Link><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">List products on Marketplace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">Choose which products from your shop appear in the public BIZBook Marketplace. Customers and other active BIZBook users can see listed products and their selling prices.</p></div><div className="rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15"><p className="font-black">Admin / Staff</p><p className="mt-1 text-indigo-100">You control your shop's listings.</p></div></div></section>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4 sm:p-5"><div className="relative"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your products…" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-10 text-base outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2"><X className="h-4 w-4" /></button>}</div></div>
      {loading && !products.length ? <div className="p-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" /><p className="mt-3 text-sm text-slate-500">Loading your products…</p></div> : !products.length ? <div className="p-16 text-center"><PackageSearch className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold">No products found</p></div> : <div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Marketplace</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map(product => <tr key={product.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-slate-50">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <PackageSearch className="h-5 w-5 text-slate-300" />}</div><div><div className="font-bold">{product.name}</div><div className="text-xs text-slate-400">SKU: {product.sku}</div></div></div></td><td className="px-5 py-4 font-black">₹{Number(product.sale_price).toLocaleString('en-IN')}</td><td className="px-5 py-4 font-semibold">{Number(product.current_stock)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.marketplace_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.marketplace_enabled ? 'Listed' : 'Not listed'}</span></td><td className="px-5 py-4 text-right"><button type="button" disabled={busy === product.id || !product.is_active || Number(product.current_stock) <= 0} onClick={() => void toggle(product)} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${product.marketplace_enabled ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{busy === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : product.marketplace_enabled ? 'Remove' : <><Check className="h-4 w-4" /> List product</>}</button></td></tr>)}</tbody></table></div>}
      {hasMore && <div className="border-t p-4 text-center"><button type="button" onClick={() => void load(search, true)} className="min-h-11 rounded-xl border px-5 text-sm font-bold">Load more products</button></div>}
    </section>
  </div>
}
