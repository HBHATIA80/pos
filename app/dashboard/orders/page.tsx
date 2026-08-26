'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Image as ImageIcon, Loader2, Minus, PackageSearch, Plus, Search, ShoppingBag, ShoppingCart, Store, Trash2, WalletCards, X, ArrowRight, Clock3, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

type Shop = { business_id: string; party_id: string; is_primary: boolean; business: { id: string; name: string; code: string | null } | null; party: { id: string; name: string } | null }
type Facet = { id: string; name: string; category_id?: string }
type Product = { id: string; sku: string; barcode: string | null; name: string; sale_price: number; current_stock: number; category_id: string | null; subcategory_id: string | null; brand_id: string | null; image_url: string | null }
type CartItem = Product & { quantity: number }
type Order = { id: string; invoice_no: string; status: 'draft' | 'completed' | 'void'; order_status?: 'placed' | 'accepted' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled' | null; grand_total: number; created_at: string; sales_invoice_items?: { product_name: string; quantity: number; unit_price: number; line_total: number }[] }

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const statusLabel = (status: Order['order_status']) => ({ placed: 'Placed', accepted: 'Accepted', packed: 'Packed', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' }[status || 'placed'] || 'Placed')

export default function OrdersPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [shopId, setShopId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [categories, setCategories] = useState<Facet[]>([])
  const [subcategories, setSubcategories] = useState<Facet[]>([])
  const [brands, setBrands] = useState<Facet[]>([])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const requestId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedShop = useMemo(() => shops.find(shop => shop.business_id === shopId) ?? null, [shops, shopId])
  const visibleSubcategories = useMemo(() => subcategories.filter(item => !categoryId || item.category_id === categoryId), [subcategories, categoryId])
  const total = cart.reduce((sum, item) => sum + item.quantity * Number(item.sale_price), 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  async function loadShops() {
    const response = await fetch('/api/customer/shops', { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'Unable to load shops')
    const next = body.shops ?? []
    setShops(next)
    if (next.length && !shopId) setShopId(next.find((shop: Shop) => shop.is_primary)?.business_id ?? next[0].business_id)
  }

  async function loadProducts(append = false) {
    if (!shopId) return
    const id = ++requestId.current
    if (append) setLoadingMore(true); else setLoadingProducts(true)
    try {
      const offset = append ? products.length : 0
      const params = new URLSearchParams({ business_id: shopId, q: search.trim(), limit: '30', offset: String(offset) })
      if (categoryId) params.set('category_id', categoryId)
      if (subcategoryId) params.set('subcategory_id', subcategoryId)
      if (brandId) params.set('brand_id', brandId)
      const response = await fetch(`/api/pos/products?${params}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (id !== requestId.current) return
      if (!response.ok) throw new Error(body.error || 'Unable to load products')
      setProducts(current => append ? [...current, ...(body.products ?? [])] : (body.products ?? []))
      setHasMore(Boolean(body.hasMore))
      setCategories(body.facets?.categories ?? [])
      setSubcategories(body.facets?.subcategories ?? [])
      setBrands(body.facets?.brands ?? [])
    } catch (error) { if (id === requestId.current) toast.error(error instanceof Error ? error.message : 'Unable to load products') }
    finally { if (id === requestId.current) { setLoadingProducts(false); setLoadingMore(false) } }
  }

  async function loadOrders(nextShopId = shopId) {
    if (!nextShopId) return
    const response = await fetch(`/api/customer/orders?business_id=${encodeURIComponent(nextShopId)}`, { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))
    if (response.ok) setOrders(body.orders ?? [])
  }

  useEffect(() => { setLoading(true); void loadShops().catch(error => toast.error(error instanceof Error ? error.message : 'Unable to load customer portal')).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    if (!shopId) return
    setProducts([]); setCart([]); setSearch(''); setCategoryId(''); setSubcategoryId(''); setBrandId('')
    void loadOrders(shopId); void loadProducts()
  }, [shopId])
  useEffect(() => {
    if (!shopId) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void loadProducts(false), 220)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [search, categoryId, subcategoryId, brandId])

  function add(product: Product) {
    setCart(current => { const existing = current.find(item => item.id === product.id); return existing ? current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }] })
    toast.success(`${product.name} added`, { duration: 900 })
  }
  function changeQuantity(id: string, delta: number) { setCart(current => current.flatMap(item => item.id !== id ? [item] : item.quantity + delta <= 0 ? [] : [{ ...item, quantity: item.quantity + delta }])) }
  async function placeOrder() {
    if (!shopId || !cart.length || saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/customer/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: shopId, items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })) }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to place order')
      toast.success(`Order ${body.order?.invoice_no ?? ''} placed successfully`)
      setCart([]); setCartOpen(false); await loadOrders(shopId)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to place order') }
    finally { setSaving(false) }
  }
  function clearFilters() { setSearch(''); setCategoryId(''); setSubcategoryId(''); setBrandId('') }

  if (loading) return <div className="mx-auto flex min-h-[60vh] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" /><span className="text-sm font-semibold text-slate-600">Loading your shopping space…</span></div></div>

  return <div className="min-h-[calc(100vh-6rem)] bg-slate-50 pb-24">
    <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-7">
      <section className="relative overflow-hidden rounded-[26px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" /><div className="absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-100"><ShoppingBag className="h-3.5 w-3.5" /> Customer shopping</div><h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Shop smarter. Order faster.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Choose a shop, search its live catalog, filter by category or brand, and add everything you need to one simple cart.</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/marketplace" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-900 shadow-sm transition hover:bg-indigo-50"><Store className="h-4 w-4 text-indigo-600" /> Browse Marketplace <ArrowRight className="h-4 w-4" /></Link><Link href="/dashboard/my-ledger" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15"><WalletCards className="h-4 w-4" /> My ledger</Link></div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
          <label className="relative flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50"><Store className="h-5 w-5 shrink-0 text-indigo-600" /><select value={shopId} onChange={event => setShopId(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent pr-6 text-sm font-bold outline-none"><option value="">Select shop</option>{shops.map(shop => <option key={shop.business_id} value={shop.business_id}>{shop.business?.name || 'Shop'}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" /></label>
          <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-500" /><input disabled={!shopId} value={search} onChange={event => setSearch(event.target.value)} placeholder={shopId ? `Search in ${selectedShop?.business?.name || 'this shop'} by product, SKU or barcode…` : 'Select a shop to start searching…'} className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}</div>
        </div>
        {shopId && <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]"><select value={categoryId} onChange={event => { setCategoryId(event.target.value); setSubcategoryId('') }} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"><option value="">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={subcategoryId} onChange={event => setSubcategoryId(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"><option value="">All subcategories</option>{visibleSubcategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={brandId} onChange={event => setBrandId(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"><option value="">All brands</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" onClick={clearFilters} className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600 hover:bg-slate-50">Clear</button></div>}
        {selectedShop && <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs"><span className="truncate text-slate-500">Shopping from <strong className="text-slate-900">{selectedShop.business?.name}</strong></span><span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700">{products.length}{hasMore ? '+' : ''} products</span></div>}
      </section>

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5"><div><h2 className="text-base font-black text-slate-950">Products</h2><p className="mt-0.5 text-xs text-slate-500">Live products available from your selected shop.</p></div><div className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><PackageSearch className="h-5 w-5" /></div></div>
          {loadingProducts && !products.length ? <div className="flex min-h-64 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" /> Loading products…</div> : !products.length ? <div className="p-14 text-center"><PackageSearch className="mx-auto h-11 w-11 text-slate-300" /><p className="mt-3 font-bold text-slate-800">{shopId ? 'No products found' : 'Select a shop'}</p><p className="mt-1 text-sm text-slate-500">{shopId ? 'Try a different search or filter.' : 'Choose a shop above to browse its catalog.'}</p></div> : <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 xl:grid-cols-4">{products.map(product => { const inCart = cart.find(item => item.id === product.id)?.quantity ?? 0; const stock = Number(product.current_stock); return <article key={product.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"><div className="relative flex aspect-square items-center justify-center overflow-hidden bg-slate-50">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" onError={event => { event.currentTarget.style.display = 'none' }} /> : <ImageIcon className="h-10 w-10 text-indigo-200" />}{inCart > 0 && <span className="absolute right-2 top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-black text-white shadow">{inCart}</span>}</div><div className="p-3"><h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-900">{product.name}</h3><p className="mt-1 truncate text-[10px] font-medium text-slate-400">{product.sku || product.barcode || 'No product code'}</p><div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Price</p><p className="text-base font-black text-indigo-700">{money(product.sale_price)}</p></div><button type="button" onClick={() => add(product)} className="inline-flex min-h-9 items-center justify-center rounded-xl bg-indigo-600 px-3 text-white shadow-sm transition hover:bg-indigo-700"><Plus className="h-4 w-4" /><span className="ml-1 text-[11px] font-black">Add</span></button></div><p className={`mt-2 text-[10px] font-bold ${stock > 0 ? 'text-emerald-600' : 'text-indigo-600'}`}>{stock > 0 ? `${stock} available` : 'Available to order'}</p></div></article> })}</div>}
          {hasMore && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => void loadProducts(true)} disabled={loadingMore} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more products</button></div>}
        </section>

        <aside className={`${cartOpen ? 'fixed inset-x-0 bottom-0 z-50 xl:static' : 'hidden xl:block'} xl:sticky xl:top-20 xl:h-fit`}>
          {cartOpen && <button type="button" className="fixed inset-0 -z-10 bg-slate-950/50 xl:hidden" onClick={() => setCartOpen(false)} aria-label="Close cart" />}
          <div className="overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl xl:rounded-2xl xl:shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Your cart</p><p className="mt-1 text-sm font-black text-slate-950">{itemCount} items · {money(total)}</p></div><button type="button" onClick={() => setCartOpen(false)} className="rounded-xl p-2 text-slate-400 xl:hidden"><X className="h-5 w-5" /></button></div>{!cart.length ? <div className="p-9 text-center"><ShoppingCart className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-800">Cart is empty</p><p className="mt-1 text-xs text-slate-500">Add products to begin your order.</p></div> : <><div className="max-h-[45vh] divide-y overflow-y-auto">{cart.map(item => <div key={item.id} className="flex gap-3 p-3.5"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-50">{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="m-3 h-6 w-6 text-slate-300" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-black text-slate-900">{item.name}</p><p className="mt-1 text-[11px] text-slate-500">{money(item.sale_price)} each</p><div className="mt-2 flex items-center gap-1.5"><button type="button" onClick={() => changeQuantity(item.id, -1)} className="rounded-lg border p-1.5 hover:bg-slate-50"><Minus className="h-3 w-3" /></button><span className="min-w-6 text-center text-xs font-black">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} className="rounded-lg border p-1.5 hover:bg-slate-50"><Plus className="h-3 w-3" /></button><button type="button" onClick={() => setCart(current => current.filter(x => x.id !== item.id))} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div></div></div>)}</div><div className="border-t bg-slate-50 p-3.5"><button type="button" disabled={saving} onClick={() => void placeOrder()} className="min-h-11 w-full rounded-xl bg-indigo-600 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Placing order…' : `Place order · ${money(total)}`}</button></div></>}</div>
        </aside>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5"><div><h2 className="text-base font-black text-slate-950">Recent orders</h2><p className="mt-0.5 text-xs text-slate-500">Track your latest purchases from the selected shop.</p></div><Clock3 className="h-5 w-5 text-slate-400" /></div>{!orders.length ? <div className="p-8 text-center text-sm text-slate-500">No orders yet.</div> : <div className="divide-y">{orders.slice(0, 10).map(order => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><CheckCircle2 className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{order.invoice_no}</p><p className="mt-0.5 text-[11px] text-slate-500">{new Date(order.created_at).toLocaleDateString('en-IN')} · {order.sales_invoice_items?.length ?? 0} products</p></div></div><div className="flex items-center gap-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">{statusLabel(order.order_status)}</span><span className="text-sm font-black text-slate-900">{money(order.grand_total)}</span></div></div>)}</div>}</section>
    </div>
    <button type="button" onClick={() => setCartOpen(true)} className="fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-black text-white shadow-xl xl:hidden"><ShoppingCart className="h-5 w-5" /> Cart {itemCount > 0 && `(${itemCount})`}</button>
  </div>
}