'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, PackageSearch, Search, ShieldCheck, Store, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Facet = { id: string; name: string; category_id?: string }
type Product = {
  id: string
  business_id: string
  shop_name: string
  name: string
  sale_price: number | null
  image_url: string | null
  category_name: string | null
  subcategory_name: string | null
  brand_name: string | null
  current_stock: number
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function MarketplaceProductsPopup() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Facet[]>([])
  const [subcategories, setSubcategories] = useState<Facet[]>([])
  const [brands, setBrands] = useState<Facet[]>([])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [canViewPrices, setCanViewPrices] = useState(false)
  const requestId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visibleSubcategories = useMemo(() => subcategories.filter(item => !categoryId || item.category_id === categoryId), [subcategories, categoryId])

  async function load(append = false) {
    const id = ++requestId.current
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const offset = append ? products.length : 0
      const params = new URLSearchParams({ q: search.trim(), limit: '40', offset: String(offset) })
      if (categoryId) params.set('category_id', categoryId)
      if (subcategoryId) params.set('subcategory_id', subcategoryId)
      if (brandId) params.set('brand_id', brandId)
      const response = await fetch(`/api/marketplace?${params}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (id !== requestId.current) return
      if (!response.ok) throw new Error(body.error || 'Unable to load products')
      setCanViewPrices(Boolean(body.canViewPrices))
      setProducts(current => append ? [...current, ...(body.products || [])] : (body.products || []))
      setHasMore(Boolean(body.hasMore))
      setCategories(Array.isArray(body.facets?.categories) ? body.facets.categories : [])
      setSubcategories(Array.isArray(body.facets?.subcategories) ? body.facets.subcategories : [])
      setBrands(Array.isArray(body.facets?.brands) ? body.facets.brands : [])
    } catch (error) {
      if (id === requestId.current) toast.error(error instanceof Error ? error.message : 'Unable to load products')
    } finally {
      if (id === requestId.current) { setLoading(false); setLoadingMore(false) }
    }
  }

  useEffect(() => { void load(false) }, [])
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void load(false), 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [search, categoryId, subcategoryId, brandId])

  const clear = () => { setSearch(''); setCategoryId(''); setSubcategoryId(''); setBrandId('') }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-950 sm:text-xl">Products</h1>
            <p className="text-xs text-slate-500">Search all marketplace products</p>
          </div>
          <button type="button" onClick={() => window.close()} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close product window">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products, shop, SKU, barcode, category, brand…" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-base outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
          {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400"><X className="h-4 w-4" /></button>}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select value={categoryId} onChange={event => { setCategoryId(event.target.value); setSubcategoryId('') }} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
            <option value="">All categories</option>
            {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={subcategoryId} onChange={event => setSubcategoryId(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
            <option value="">All subcategories</option>
            {visibleSubcategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={brandId} onChange={event => setBrandId(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
              <option value="">All brands</option>
              {brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button type="button" onClick={clear} className="rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600">Clear</button>
          </div>
        </div>

        {!canViewPrices && <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><ShieldCheck className="h-4 w-4 shrink-0" /><span>Sign in to view prices.</span></div>}
      </div>

      <section className="p-3 sm:p-4">
        {loading && !products.length ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" /> Loading products…</div>
        ) : !products.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center"><PackageSearch className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-3 font-bold text-slate-800">No products found</p><p className="mt-1 text-sm text-slate-500">Try a different search or filter.</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {products.map(product => {
              const stock = Number(product.current_stock)
              return <article key={`${product.business_id}-${product.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-50">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none' }} /> : <PackageSearch className="h-10 w-10 text-indigo-200" />}</div>
                <div className="p-3">
                  <p className="flex items-center gap-1 truncate text-[11px] font-bold text-indigo-600"><Store className="h-3 w-3" /> {product.shop_name}</p>
                  <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900">{product.name}</h2>
                  <div className="mt-1 flex flex-wrap gap-1">{product.category_name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">{product.category_name}</span>}{product.subcategory_name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">{product.subcategory_name}</span>}{product.brand_name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">{product.brand_name}</span>}</div>
                  <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Selling price</p>{canViewPrices && product.sale_price !== null ? <p className="text-lg font-black text-slate-950">{money(product.sale_price)}</p> : <p className="text-sm font-bold text-slate-400">Sign in to view</p>}</div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>{stock > 0 ? 'In stock' : 'Available'}</span></div>
                </div>
              </article>
            })}
          </div>
        )}
        {hasMore && <div className="p-5 text-center"><button type="button" onClick={() => void load(true)} disabled={loadingMore} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 disabled:opacity-50">{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more products</button></div>}
      </section>
    </main>
  )
}
