'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2, PackageSearch, Search, Store, X } from 'lucide-react'
import toast from 'react-hot-toast'

type MarketplaceProduct = { id: string; business_id: string; shop_name: string; shop_code: string | null; name: string; sku: string | null; barcode: string | null; sale_price: number; image_url: string | null; category_id: string | null; current_stock: number }
const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function MarketplacePage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)
  async function load(q = search, append = false) {
    const id = ++requestId.current
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const offset = append ? products.length : 0
      const params = new URLSearchParams({ q: q.trim(), limit: '40', offset: String(offset) })
      const response = await fetch(`/api/marketplace?${params.toString()}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (id !== requestId.current) return
      if (!response.ok) throw new Error(body.error || 'Unable to load marketplace')
      setProducts(current => append ? [...current, ...(body.products || [])] : (body.products || []))
      setHasMore(Boolean(body.hasMore))
    } catch (error) { if (id === requestId.current) toast.error(error instanceof Error ? error.message : 'Unable to load marketplace') }
    finally { if (id === requestId.current) { setLoading(false); setLoadingMore(false) } }
  }
  useEffect(() => { void load('', false) }, [])
  useEffect(() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void load(search, false), 280); return () => { if (timer.current) clearTimeout(timer.current) } }, [search])

  return <div className="mx-auto max-w-7xl space-y-4 pb-4">
    <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lg sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/15"><ArrowLeft className="h-4 w-4" /> Dashboard</Link><div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20"><Store className="h-3.5 w-3.5" /> BIZBook Marketplace</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">One market. Many shops.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">Discover products that BIZBook shops have chosen to list publicly and compare their current selling prices in one place.</p></div><div className="rounded-2xl bg-white/10 p-4 text-sm ring-1 ring-white/15 lg:min-w-64"><p className="font-black">Shop smarter</p><p className="mt-1 text-indigo-100">Search by product, SKU, barcode or shop name.</p></div></div>
    </section>
    <section className="sticky top-16 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4"><div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search all shops and products…" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-base outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Clear search"><X className="h-4 w-4" /></button>}</div></section>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="font-bold text-slate-950">Marketplace products</h2><p className="mt-0.5 text-xs text-slate-500">Only products explicitly listed by shops are shown.</p></div><PackageSearch className="h-5 w-5 text-indigo-500" /></div>
      {loading && !products.length ? <div className="flex items-center justify-center py-20 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" /> Loading marketplace…</div> : !products.length ? <div className="p-14 text-center"><PackageSearch className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-3 font-bold text-slate-800">No marketplace products found</p><p className="mt-1 text-sm text-slate-500">Try another search or ask a shop to list its products.</p></div> : <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-4 xl:grid-cols-5">{products.map(product => <article key={`${product.business_id}-${product.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-fuchsia-50">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <PackageSearch className="h-10 w-10 text-indigo-200" />}</div><div className="p-3"><p className="flex items-center gap-1 truncate text-[11px] font-bold text-indigo-600"><Store className="h-3 w-3" /> {product.shop_name}</p><h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900">{product.name}</h3><p className="mt-1 truncate text-[11px] text-slate-400">{product.sku || product.barcode || 'Product'}</p><div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Selling price</p><p className="text-lg font-black text-slate-950">{money(product.sale_price)}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">In stock</span></div></div></article>)}</div>}
      {hasMore && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => void load(search, true)} disabled={loadingMore} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more</button></div>}
    </section>
  </div>
}
