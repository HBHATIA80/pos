'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Edit3, Image as ImageIcon, Layers3, Loader2, Package, Plus, RefreshCw, Search, Tag, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Role = 'admin' | 'staff' | 'user'
type Master = { id: string; name: string; short_name?: string; is_active: boolean }
type Product = {
  id: string
  sku: string
  barcode: string | null
  name: string
  image_url: string | null
  sale_price: number
  purchase_price?: number
  current_stock: number
  is_active: boolean
  catalog_categories?: { name: string } | null
  catalog_units?: { short_name: string } | null
}
type Tab = 'products' | 'categories' | 'subcategories' | 'brands' | 'units'

const tabs: { key: Tab; label: string; description: string }[] = [
  { key: 'products', label: 'Products', description: 'SKUs, pricing and stock' },
  { key: 'categories', label: 'Categories', description: 'Organise your catalogue' },
  { key: 'subcategories', label: 'Subcategories', description: 'More precise grouping' },
  { key: 'brands', label: 'Brands', description: 'Brand master' },
  { key: 'units', label: 'Units', description: 'Selling and stock units' },
]

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function ProductsPage() {
  const [role, setRole] = useState<Role>('user')
  const [tab, setTab] = useState<Tab>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [masters, setMasters] = useState<Record<string, Master[]>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const canManage = role === 'admin' || role === 'staff'

  const lowStockCount = useMemo(() => products.filter(product => Number(product.current_stock) > 0 && Number(product.current_stock) <= 5).length, [products])
  const outOfStockCount = useMemo(() => products.filter(product => Number(product.current_stock) <= 0).length, [products])
  const activeCount = useMemo(() => products.filter(product => product.is_active).length, [products])

  function changeTab(nextTab: Tab) {
    setTab(nextTab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', nextTab)
    window.history.replaceState({}, '', url.toString())
  }

  async function loadProducts(q = search, append = false) {
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const params = new URLSearchParams({ entity: 'products', q: q.trim(), limit: '50', offset: String(append ? products.length : 0) })
      const response = await fetch(`/api/catalog?${params}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load products')
      const incoming = (body.products ?? []) as Product[]
      setProducts(current => append ? [...current, ...incoming] : incoming)
      setTotal(Number(body.total ?? 0))
      setHasMore(Boolean(body.hasMore))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load products')
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }

  async function boot() {
    setRefreshing(true)
    try {
      const profile = await fetch('/api/profile', { cache: 'no-store' })
      if (profile.ok) {
        const body = await profile.json()
        setRole(body.profile?.role ?? 'user')
      }
      await loadProducts('')
      const results = await Promise.all(tabs.slice(1).map(async item => {
        const response = await fetch(`/api/catalog?entity=${item.key}`, { cache: 'no-store' })
        const body = await response.json().catch(() => ({}))
        return [item.key, (body[item.key] ?? []) as Master[]] as const
      }))
      setMasters(Object.fromEntries(results))
    } catch {
      toast.error('Unable to load catalogue')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab') as Tab | null
    if (requestedTab && tabs.some(item => item.key === requestedTab)) setTab(requestedTab)
    void boot()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void loadProducts(), 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-900/10 bg-gradient-to-br from-[#123d2d] via-[#176047] to-[#23815c] px-5 py-6 text-white shadow-[0_18px_55px_rgba(15,72,50,0.16)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] ring-1 ring-white/15">
              <Layers3 className="h-3.5 w-3.5" /> Catalogue control centre
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">Products & Inventory Masters</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/85">Keep products, pricing, stock and master data organised in one place. Search thousands of SKUs without losing the information that matters.</p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {canManage && <Link href="/dashboard/products/import" className="inline-flex min-h-11 items-center rounded-xl bg-white/10 px-4 text-sm font-black text-white ring-1 ring-white/20 transition hover:bg-white/20"><Upload className="mr-2 h-4 w-4" />Bulk import</Link>}
            {canManage && <Link href="/dashboard/products/new" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-black text-[#176047] shadow-sm transition hover:bg-emerald-50"><Plus className="mr-2 h-4 w-4" />Add product</Link>}
            <button type="button" onClick={() => void boot()} disabled={refreshing} className="inline-flex min-h-11 items-center rounded-xl bg-black/10 px-4 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-black/20 disabled:opacity-60"><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-100/70">Total products</p><p className="mt-1 text-xl font-black">{total.toLocaleString('en-IN')}</p></div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-100/70">Active</p><p className="mt-1 text-xl font-black">{activeCount.toLocaleString('en-IN')}</p></div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-100/70">Low stock</p><p className="mt-1 text-xl font-black">{lowStockCount}</p></div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-100/70">Out of stock</p><p className="mt-1 text-xl font-black">{outOfStockCount}</p></div>
        </div>

        <div className="relative mt-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(item => (
            <button type="button" key={item.key} onClick={() => changeTab(item.key)} className={`group min-w-fit rounded-xl px-4 py-2.5 text-left transition ${tab === item.key ? 'bg-white text-[#15543e] shadow-sm' : 'bg-white/10 text-white hover:bg-white/15'}`}>
              <span className="block text-sm font-black">{item.label}</span>
              <span className={`mt-0.5 hidden text-[10px] font-semibold sm:block ${tab === item.key ? 'text-emerald-700/70' : 'text-emerald-50/60'}`}>{item.description}</span>
            </button>
          ))}
        </div>
      </section>

      {tab === 'products' ? (
        <section className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-2xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/55" />
                <input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by product name, SKU or barcode…" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-11 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1.5">{products.length.toLocaleString('en-IN')} loaded</span>
                {search && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">Searching: “{search}”</span>}
              </div>
            </div>
          </div>

          {loading && !products.length ? (
            <div className="flex min-h-[430px] items-center justify-center p-12"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" /><p className="mt-3 text-sm font-semibold text-slate-500">Loading catalogue…</p><p className="mt-1 text-xs text-slate-400">Fetching your latest product data</p></div></div>
          ) : !products.length ? (
            <div className="flex min-h-[360px] items-center justify-center p-12"><div className="max-w-sm text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Package className="h-7 w-7" /></div><p className="mt-4 text-base font-black text-slate-800">No products found</p><p className="mt-1 text-sm leading-6 text-slate-500">Try another name, SKU or barcode. Clear the search to see your full catalogue.</p></div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 backdrop-blur">
                  <tr className="border-b border-slate-200"><th className="px-5 py-3.5">Product</th><th className="px-5 py-3.5">SKU / Barcode</th><th className="px-5 py-3.5">Category</th><th className="px-5 py-3.5 text-right">Sale price</th><th className="px-5 py-3.5 text-right">Stock</th><th className="px-5 py-3.5">Status</th>{canManage && <th className="px-5 py-3.5 text-right">Action</th>}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map(product => {
                    const stock = Number(product.current_stock)
                    const stockState = stock <= 0 ? 'out' : stock <= 5 ? 'low' : 'ok'
                    return (
                      <tr key={product.id} className="group transition hover:bg-emerald-50/35">
                        <td className="px-5 py-4"><div className="flex items-center gap-3.5"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}</div><div className="min-w-0"><div className="truncate font-black text-slate-800">{product.name}</div><div className="mt-0.5 text-xs text-slate-400">{product.catalog_units?.short_name ? `Sold in ${product.catalog_units.short_name}` : 'Unit not specified'}</div></div></div></td>
                        <td className="px-5 py-4"><div className="font-mono text-xs font-bold text-slate-700">{product.sku}</div><div className="mt-1 text-[11px] text-slate-400">{product.barcode || 'No barcode'}</div></td>
                        <td className="px-5 py-4"><span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">{product.catalog_categories?.name ?? 'Uncategorised'}</span></td>
                        <td className="px-5 py-4 text-right"><span className="font-black text-slate-900">{money(product.sale_price)}</span></td>
                        <td className="px-5 py-4 text-right"><div className={`font-black ${stockState === 'out' ? 'text-red-600' : stockState === 'low' ? 'text-amber-600' : 'text-slate-800'}`}>{stock.toLocaleString('en-IN')}</div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{stockState === 'out' ? 'Reorder now' : stockState === 'low' ? 'Low stock' : 'In stock'}</div></td>
                        <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.is_active ? 'Active' : 'Inactive'}</span></td>
                        {canManage && <td className="px-5 py-4 text-right"><Link href={`/dashboard/products/${product.id}/edit`} className="inline-flex min-h-9 items-center rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-xs font-black text-emerald-800 opacity-80 transition hover:border-emerald-200 hover:bg-emerald-100 group-hover:opacity-100"><Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit</Link></td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {hasMore && <div className="flex justify-center border-t border-slate-100 bg-slate-50/40 p-4"><button type="button" onClick={() => void loadProducts(search, true)} disabled={loadingMore} className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50">{loadingMore ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading…</> : 'Load more products'}</button></div>}
        </section>
      ) : (
        <section className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Master data</p><h2 className="mt-1 text-xl font-black capitalize tracking-tight text-slate-900">{tab}</h2><p className="mt-1 text-sm text-slate-500">Use clean master data to keep reports, stock and invoices consistent.</p></div>
            <div className="flex items-center gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">{(masters[tab] ?? []).length.toLocaleString('en-IN')} records</span>{canManage && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">Admin / Staff</span>}</div>
          </div>
          {(masters[tab] ?? []).length ? <div className="divide-y divide-slate-100">{(masters[tab] ?? []).map(item => <div key={item.id} className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-emerald-50/35"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Tag className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate font-bold text-slate-800">{item.name}</p>{item.short_name && <p className="text-xs text-slate-400">{item.short_name}</p>}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></div>)}</div> : <div className="p-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Tag className="h-5 w-5" /></div><p className="mt-3 font-black text-slate-800">No {tab} found</p><p className="mt-1 text-sm text-slate-500">Add master data to make your catalogue easier to manage.</p></div>}
        </section>
      )}
    </div>
  )
}
