'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, Image as ImageIcon, Loader2, Minus, PackageSearch, Plus, ShoppingCart, Store, Trash2, WalletCards, X } from 'lucide-react'
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
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categories, setCategories] = useState<Facet[]>([])
  const [subcategories, setSubcategories] = useState<Facet[]>([])
  const [brands, setBrands] = useState<Facet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const requestId = useRef(0)

  const selectedShop = useMemo(() => shops.find((shop) => shop.business_id === shopId) ?? null, [shops, shopId])
  const visibleSubcategories = useMemo(() => subcategories.filter((item) => !categoryId || item.category_id === categoryId), [subcategories, categoryId])
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
      const params = new URLSearchParams({ business_id: shopId, limit: '30', offset: String(offset) })
      if (categoryId) params.set('category_id', categoryId)
      if (subcategoryId) params.set('subcategory_id', subcategoryId)
      if (brandId) params.set('brand_id', brandId)
      const response = await fetch(`/api/pos/products?${params.toString()}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (id !== requestId.current) return
      if (!response.ok) throw new Error(body.error || 'Unable to load products')
      setProducts(current => append ? [...current, ...(body.products ?? [])] : (body.products ?? []))
      setHasMore(Boolean(body.hasMore))
      if (body.facets) {
        setCategories(Array.isArray(body.facets.categories) ? body.facets.categories : [])
        setSubcategories(Array.isArray(body.facets.subcategories) ? body.facets.subcategories : [])
        setBrands(Array.isArray(body.facets.brands) ? body.facets.brands : [])
      }
    } catch (error) {
      if (id === requestId.current) toast.error(error instanceof Error ? error.message : 'Unable to load products')
    } finally {
      if (id === requestId.current) { setLoadingProducts(false); setLoadingMore(false) }
    }
  }

  async function loadOrders(nextShopId = shopId) {
    if (!nextShopId) return
    const response = await fetch(`/api/customer/orders?business_id=${encodeURIComponent(nextShopId)}`, { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))
    if (response.ok) setOrders(body.orders ?? [])
  }

  async function boot() {
    setLoading(true)
    try { await loadShops() } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load customer portal') }
    finally { setLoading(false) }
  }

  useEffect(() => { void boot() }, [])
  useEffect(() => {
    if (!shopId) return
    setProducts([]); setCart([]); setCategories([]); setSubcategories([]); setBrands([]); setCategoryId(''); setSubcategoryId(''); setBrandId('')
    void loadOrders(shopId)
  }, [shopId])
  useEffect(() => {
    if (!shopId) return
    void loadProducts()
  }, [shopId, categoryId, subcategoryId, brandId])

  function add(product: Product) {
    setCart(current => {
      const existing = current.find(item => item.id === product.id)
      if (existing) return current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...current, { ...product, quantity: 1 }]
    })
    toast.success(`${product.name} added`, { duration: 900 })
  }
  function changeQuantity(id: string, delta: number) {
    setCart(current => current.flatMap(item => {
      if (item.id !== id) return [item]
      const next = item.quantity + delta
      return next <= 0 ? [] : [{ ...item, quantity: next }]
    }))
  }
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
  function clearFilters() { setCategoryId(''); setSubcategoryId(''); setBrandId('') }

  if (loading) return <div className="mx-auto flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>

  return <div className="mx-auto max-w-7xl space-y-4 pb-3">
    <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lg sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20"><ShoppingCart className="h-3.5 w-3.5" /> Customer shopping</div><h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Order what you need, in seconds.</h1><p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">Browse products by category, subcategory or brand.</p></div><div className="flex gap-2"><Link href="/dashboard/marketplace" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"><Store className="h-4 w-4" /> Marketplace</Link><Link href="/dashboard/my-ledger" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/20"><WalletCards className="h-4 w-4" /> My ledger</Link></div></div>
    </section>
    <section className="sticky top-16 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center"><label className="relative flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3"><Store className="h-5 w-5 shrink-0 text-indigo-600" /><select value={shopId} onChange={event => setShopId(event.target.value)} className="min-h-10 min-w-0 flex-1 appearance-none bg-transparent pr-7 text-sm font-semibold outline-none"><option value="">Select shop</option>{shops.map(shop => <option key={shop.business_id} value={shop.business_id}>{shop.business?.name || 'Shop'}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" /></label></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3"><select value={categoryId} onChange={event => { setCategoryId(event.target.value); setSubcategoryId('') }} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"><option value="">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={subcategoryId} onChange={event => setSubcategoryId(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"><option value="">All subcategories</option>{visibleSubcategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="flex gap-2"><select value={brandId} onChange={event => setBrandId(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"><option value="">All brands</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" onClick={clearFilters} className="rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600">Clear</button></div></div>
      {selectedShop && <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-500">Shopping from <strong className="text-slate-800">{selectedShop.business?.name}</strong></span><span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">{products.length}{hasMore ? '+' : ''} shown</span></div>}
    </section>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="font-bold text-slate-950">Products</h2><p className="mt-0.5 text-xs text-slate-500">Out-of-stock products can still be ordered; the shop can verify stock before fulfillment.</p></div><PackageSearch className="h-5 w-5 text-indigo-500" /></div>
        {loadingProducts && !products.length ? <div className="flex items-center justify-center py-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" /> Loading products…</div> : !products.length ? <div className="p-12 text-center"><PackageSearch className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">No products available</p><p className="mt-1 text-sm text-slate-500">Try another category, subcategory or brand.</p></div> : <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 xl:grid-cols-4">{products.map(product => { const inCart = cart.find(item => item.id === product.id)?.quantity ?? 0; const stock = Number(product.current_stock); return <article key={product.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><div className="relative flex aspect-square items-center justify-center overflow-hidden bg-slate-50">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none' }} /> : <ImageIcon className="h-10 w-10 text-indigo-200" />}{inCart > 0 && <span className="absolute right-2 top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-bold text-white shadow">{inCart}</span>}</div><div className="p-3"><h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900">{product.name}</h3><p className="mt-1 truncate text-[11px] text-slate-400">{product.sku || product.barcode || 'No code'}</p><div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Price</p><p className="text-base font-black text-indigo-700">{money(product.sale_price)}</p></div><button type="button" onClick={() => add(product)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-indigo-600 px-3 text-white shadow-sm hover:bg-indigo-700" aria-label={`Add ${product.name}`}><Plus className="h-5 w-5" /><span className="ml-1 hidden sm:inline text-xs font-bold">Add</span></button></div><p className={`mt-2 text-[11px] font-medium ${stock > 0 ? 'text-emerald-600' : 'text-indigo-600'}`}>{stock > 0 ? `${stock} available` : 'Available to order'}</p></div></article> })}</div>}
        {hasMore && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => void loadProducts(true)} disabled={loadingMore} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 disabled:opacity-50">{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more products</button></div>}
      </section>
      <aside className={`${cartOpen ? 'fixed inset-x-0 bottom-0 z-50 lg:static' : 'hidden lg:block'} lg:sticky lg:top-20 lg:h-fit`}>{cartOpen && <button type="button" className="fixed inset-0 -z-10 bg-slate-950/40 lg:hidden" onClick={() => setCartOpen(false)} aria-label="Close cart" />}<div className="overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl lg:rounded-2xl lg:shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Your cart</p><p className="mt-1 font-black text-slate-950">{itemCount} items</p></div><button type="button" onClick={() => setCartOpen(false)} className="rounded-xl p-2 text-slate-400 lg:hidden"><X className="h-5 w-5" /></button></div>{!cart.length ? <div className="p-10 text-center"><ShoppingCart className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-800">Your cart is empty</p><p className="mt-1 text-sm text-slate-500">Browse products above and tap Add.</p></div> : <><div className="max-h-[45vh] divide-y overflow-y-auto">{cart.map(item => <div key={item.id} className="flex gap-3 p-4"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-50">{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="m-4 h-6 w-6 text-slate-300" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">{money(item.sale_price)} each</p><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => changeQuantity(item.id, -1)} className="rounded-lg border p-1.5"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-7 text-center text-sm font-bold">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} className="rounded-lg border p-1.5"><Plus className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setCart(current => current.filter(x => x.id !== item.id))} className="ml-auto rounded-lg p-1.5 text-slate-400"><Trash2 className="h-4 w-4" /></button></div></div><p className="font-black text-slate-900">{money(item.quantity * Number(item.sale_price))}</p></div>)}</div><div className="border-t p-4"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-500">Order total</span><span className="text-xl font-black text-indigo-700">{money(total)}</span></div><button type="button" disabled={saving} onClick={() => void placeOrder()} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Place order <ArrowRight className="h-4 w-4" /></button></div></>}</div></aside>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="font-bold text-slate-950">Recent orders</h2></div>{!orders.length ? <div className="p-8 text-center text-sm text-slate-500">No orders yet.</div> : <div className="divide-y divide-slate-100">{orders.slice(0, 8).map(order => <div key={order.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><p className="font-bold text-slate-900">{order.invoice_no}</p><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()} · {order.sales_invoice_items?.length ?? 0} lines</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold capitalize text-indigo-700">{statusLabel(order.order_status)}</span><span className="font-black">{money(order.grand_total)}</span></div></div>)}</div>}</section>
    <button type="button" onClick={() => setCartOpen(true)} className="fixed bottom-20 right-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-black text-white shadow-xl lg:hidden"><ShoppingCart className="h-5 w-5" /> Cart ({itemCount})</button>
  </div>
}
