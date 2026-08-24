'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Edit3, Image as ImageIcon, Loader2, Package, Plus, RefreshCw, Search, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Role = 'admin' | 'staff' | 'user'
type Master = { id: string; name: string; short_name?: string; is_active: boolean }
type Product = { id: string; sku: string; barcode: string | null; name: string; image_url: string | null; sale_price: number; current_stock: number; is_active: boolean; catalog_categories?: { name: string } | null; catalog_units?: { short_name: string } | null }
type Tab = 'products' | 'categories' | 'subcategories' | 'brands' | 'units'
const tabs: { key: Tab; label: string }[] = [{ key: 'products', label: 'Products' }, { key: 'categories', label: 'Categories' }, { key: 'subcategories', label: 'Subcategories' }, { key: 'brands', label: 'Brands' }, { key: 'units', label: 'Units' }]

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
  const canManage = role === 'admin' || role === 'staff'

  async function loadProducts(q = search, append = false) {
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const params = new URLSearchParams({ entity: 'products', q: q.trim(), limit: '50', offset: String(append ? products.length : 0) })
      const response = await fetch(`/api/catalog?${params}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load products')
      setProducts(current => append ? [...current, ...(body.products ?? [])] : body.products ?? [])
      setTotal(Number(body.total ?? 0)); setHasMore(Boolean(body.hasMore))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load products') }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }

  async function boot() {
    try {
      const profile = await fetch('/api/profile', { cache: 'no-store' })
      if (profile.ok) { const body = await profile.json(); setRole(body.profile?.role ?? 'user') }
      await loadProducts('')
      const results = await Promise.all(tabs.slice(1).map(async item => { const response = await fetch(`/api/catalog?entity=${item.key}`, { cache: 'no-store' }); const body = await response.json(); return [item.key, (body[item.key] ?? []) as Master[]] as const }))
      setMasters(Object.fromEntries(results))
    } catch { toast.error('Unable to load catalog') }
  }

  useEffect(() => { void boot() }, [])
  useEffect(() => { const timer = setTimeout(() => void loadProducts(), 250); return () => clearTimeout(timer) }, [search])

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/15">BIZBook Catalog</span><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Products & Inventory Masters</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">Manage thousands of SKUs with fast search, stock controls and product photography.</p></div>
        {canManage && <div className="flex flex-wrap gap-2"><Link href="/dashboard/products/import" className="inline-flex min-h-11 items-center rounded-2xl bg-white/15 px-4 text-sm font-black text-white ring-1 ring-white/20 hover:bg-white/20"><Upload className="mr-2 h-4 w-4" />Bulk Products</Link><Link href="/dashboard/products/new" className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 text-sm font-black text-indigo-700"><Plus className="mr-2 h-4 w-4" />Add Product</Link><button type="button" onClick={() => void boot()} className="min-h-11 rounded-2xl bg-white/10 px-4 text-sm font-bold ring-1 ring-white/15"><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</button></div>}
        {!canManage && <button type="button" onClick={() => void boot()} className="min-h-11 rounded-2xl bg-white/10 px-4 text-sm font-bold ring-1 ring-white/15"><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</button>}
      </div>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{tabs.map(item => <button type="button" key={item.key} onClick={() => setTab(item.key)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === item.key ? 'bg-white text-indigo-700' : 'bg-white/10 hover:bg-white/15'}`}>{item.label}</button>)}</div>
    </section>

    {tab === 'products' ? <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search product, SKU or barcode…" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-10 text-base outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2"><X className="h-4 w-4" /></button>}</div><span className="text-xs font-bold text-slate-500">{total.toLocaleString('en-IN')} products · {products.length} loaded</span></div>
      {loading && !products.length ? <div className="p-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" /><p className="mt-3 text-sm text-slate-500">Loading catalog…</p></div> : !products.length ? <div className="p-16 text-center"><Package className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold">No matching products</p></div> : <div className="overflow-x-auto"><table className="min-w-[1000px] w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Sale</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Status</th>{canManage && <th className="px-5 py-3 text-right">Action</th>}</tr></thead><tbody className="divide-y divide-slate-100">{products.map(product => <tr key={product.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-slate-50">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}</div><div><div className="font-bold">{product.name}</div><div className="text-xs text-slate-400">{product.barcode || 'No barcode'}</div></div></div></td><td className="px-5 py-4 font-mono text-xs">{product.sku}</td><td className="px-5 py-4">{product.catalog_categories?.name ?? '—'}</td><td className="px-5 py-4 font-black">₹{Number(product.sale_price).toLocaleString('en-IN')}</td><td className="px-5 py-4 font-semibold">{Number(product.current_stock)} {product.catalog_units?.short_name ?? ''}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.is_active ? 'Available' : 'Inactive'}</span></td>{canManage && <td className="px-5 py-4 text-right"><Link href={`/dashboard/products/${product.id}/edit`} className="inline-flex min-h-10 items-center rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-sm font-black text-indigo-700 hover:bg-indigo-100"><Edit3 className="mr-1.5 h-4 w-4" />Edit</Link></td>}</tr>)}</tbody></table></div>}
      {hasMore && <div className="border-t p-4 text-center"><button type="button" onClick={() => void loadProducts(search, true)} disabled={loadingMore} className="min-h-11 rounded-xl border px-5 text-sm font-bold">{loadingMore ? 'Loading…' : 'Load more products'}</button></div>}
    </section> : <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-5 font-black capitalize">{tab}</div>{(masters[tab] ?? []).map(item => <div key={item.id} className="flex items-center justify-between border-b px-5 py-4"><span className="font-semibold">{item.name}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{item.is_active ? 'Active' : 'Inactive'}</span></div>)}{!(masters[tab] ?? []).length && <div className="p-10 text-center text-sm text-slate-500">No {tab} found.</div>}</section>}
  </div>
}
