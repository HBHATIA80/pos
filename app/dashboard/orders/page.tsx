'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, Image as ImageIcon, Loader2, Minus, PackageSearch, Plus, Search, ShoppingCart, Store, Trash2, WalletCards, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Shop = { business_id: string; party_id: string; is_primary: boolean; business: { id: string; name: string; code: string | null } | null; party: { id: string; name: string } | null }
type Product = { id: string; sku: string; barcode: string | null; name: string; sale_price: number; current_stock: number; category_id: string | null }
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
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  const selectedShop = useMemo(() => shops.find((shop) => shop.business_id === shopId) ?? null, [shops, shopId])
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

  async function loadProducts(nextQuery = search, append = false) {
    if (!shopId) return
    const id = ++requestId.current
    if (append) setLoadingMore(true); else setLoadingProducts(true)
    try {
      const offset = append ? products.length : 0
      const params = new URLSearchParams({ business_id: shopId, q: nextQuery.trim(), limit: '30', offset: String(offset) })
      const response = await fetch(`/api/pos/products?${params.toString()}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (id !== requestId.current) return
      if (!response.ok) throw new Error(body.error || 'Unable to load products')
      setProducts((current) => append ? [...current, ...(body.products ?? [])] : (body.products ?? []))
      setHasMore(Boolean(body.hasMore))
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
    setProducts([])
    setCart([])
    void loadProducts('', false)
    void loadOrders(shopId)
  }, [shopId])

  useEffect(() => {
    if (!shopId) return
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { void loadProducts(search, false) }, 280)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  function add(product: Product) {
    const stock = Number(product.current_stock)
    if (stock <= 0) return toast.error('This product is out of stock.')
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= stock) return current
        return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...current, { ...product, quantity: 1 }]
    })
    toast.success(`${product.name} added`, { duration: 900 })
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item]
      const next = item.quantity + delta
      if (next <= 0) return []
      if (next > Number(item.current_stock)) return [item]
      return [{ ...item, quantity: next }]
    }))
  }

  async function placeOrder() {
    if (!shopId || !cart.length || saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/customer/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: shopId, items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })) }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to place order')
      toast.success(`Order ${body.order?.invoice_no ?? ''} placed successfully`)
      setCart([]); setCartOpen(false)
      await loadOrders(shopId)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to place order') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="mx-auto flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-3">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20"><ShoppingCart className="h-3.5 w-3.5" /> Customer shopping</div>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Order what you need, in seconds.</h1>
            <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">Fast search, clean product cards and a tap-friendly cart built for thousands of products.</p>
          </div>
          <Link href="/dashboard/my-ledger" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"><WalletCards className="h-4 w-4" /> My ledger</Link>
        </div>
      </section>

      <section className="sticky top-16 z-20 -mx-1 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:static sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product name, SKU or barcode…" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-10 text-base outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
            {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </div>
          <label className="relative flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 md:w-72">
            <Store className="h-5 w-5 shrink-0 text-indigo-600" />
            <span className="sr-only">Select shop</span>
            <select value={shopId} onChange={(event) => setShopId(event.target.value)} className="min-h-10 min-w-0 flex-1 appearance-none bg-transparent pr-7 text-sm font-semibold text-slate-800 outline-none"><option value="">Select shop</option>{shops.map((shop) => <option key={shop.business_id} value={shop.business_id}>{shop.business?.name || 'Shop'}</option>)}</select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
          </label>
        </div>
        {selectedShop && <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-500">Shopping from <strong className="text-slate-800">{selectedShop.business?.name}</strong></span><span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">{products.length}{hasMore ? '+' : ''} shown</span></div>}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="font-bold text-slate-950">Products</h2><p className="mt-0.5 text-xs text-slate-500">Only 30 load at a time for a fast experience.</p></div><PackageSearch className="h-5 w-5 text-indigo-500" /></div>
          {loadingProducts && !products.length ? <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-4"><div className="col-span-full flex items-center justify-center py-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" /> Finding products…</div></div> : !products.length ? <div className="p-12 text-center"><PackageSearch className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">No matching products</p><p className="mt-1 text-sm text-slate-500">Try a shorter name, SKU or barcode.</p></div> : (
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 xl:grid-cols-4">
              {products.map((product) => {
                const inCart = cart.find((item) => item.id === product.id)?.quantity ?? 0
                const stock = Number(product.current_stock)
                return <article key={product.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                  <div className="relative flex aspect-[1.2] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-fuchsia-50"><ImageIcon className="h-10 w-10 text-indigo-200" />{inCart > 0 && <span className="absolute right-2 top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-bold text-white shadow">{inCart}</span>}</div>
                  <div className="p-3"><h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900">{product.name}</h3><p className="mt-1 truncate text-[11px] text-slate-400">{product.sku || product.barcode || 'No code'}</p><div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Price</p><p className="text-base font-black text-indigo-700">{money(product.sale_price)}</p></div><button type="button" onClick={() => add(product)} disabled={stock <= 0} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-indigo-600 px-3 text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400" aria-label={`Add ${product.name}`}><Plus className="h-5 w-5" /><span className="ml-1 hidden sm:inline text-xs font-bold">Add</span></button></div><p className={`mt-2 text-[11px] font-medium ${stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{stock > 0 ? `${stock} available` : 'Out of stock'}</p></div>
                </article>
              })}
            </div>
          )}
          {hasMore && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => void loadProducts(search, true)} disabled={loadingMore} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more products</button></div>}
        </section>

        <aside className={`lg:sticky lg:top-20 lg:h-fit ${cartOpen ? 'fixed inset-x-0 bottom-0 z-50 lg:static' : 'hidden lg:block'}`}>
          {cartOpen && <button type="button" className="fixed inset-0 -z-10 bg-slate-950/40 lg:hidden" onClick={() => setCartOpen(false)} aria-label="Close cart" />}
          <div className="overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl lg:rounded-2xl lg:shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Your cart</p><h2 className="mt-0.5 text-lg font-black text-slate-950">{itemCount} item{itemCount === 1 ? '' : 's'}</h2></div><button type="button" onClick={() => setCartOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Close cart"><X className="h-5 w-5" /></button></div>
            {!cart.length ? <div className="p-8 text-center"><ShoppingCart className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">Your cart is empty</p><p className="mt-1 text-xs leading-5 text-slate-500">Search products above and tap Add to build your order.</p></div> : <div className="max-h-[52vh] space-y-2 overflow-y-auto p-3 lg:max-h-[55vh]">{cart.map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold text-slate-900">{item.name}</p><p className="mt-0.5 text-xs text-slate-500">{money(item.sale_price)} each</p></div><button type="button" onClick={() => changeQuantity(item.id, -item.quantity)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500" aria-label={`Remove ${item.name}`}><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-xl border border-slate-200 bg-white"><button type="button" onClick={() => changeQuantity(item.id, -1)} className="min-h-10 min-w-10 p-2 text-slate-600" aria-label="Decrease quantity"><Minus className="mx-auto h-4 w-4" /></button><span className="min-w-8 text-center text-sm font-black">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} className="min-h-10 min-w-10 p-2 text-indigo-600" aria-label="Increase quantity"><Plus className="mx-auto h-4 w-4" /></button></div><span className="font-black text-slate-900">{money(item.quantity * item.sale_price)}</span></div></div>)}</div>}
            <div className="border-t border-slate-100 bg-white p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">Order total</span><span className="text-2xl font-black text-indigo-700">{money(total)}</span></div><button type="button" onClick={() => void placeOrder()} disabled={!cart.length || saving} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saving ? 'Placing order…' : 'Place order'}<ArrowRight className="h-4 w-4" /></button></div>
          </div>
        </aside>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="font-bold text-slate-950">Recent orders</h2><p className="mt-0.5 text-xs text-slate-500">{selectedShop?.business?.name || 'Selected shop'}</p></div><Link href="/dashboard/my-ledger" className="text-xs font-bold text-indigo-700">Ledger →</Link></div>{!orders.length ? <div className="p-8 text-center text-sm text-slate-500">No orders yet. Your placed orders will appear here.</div> : <div className="divide-y divide-slate-100">{orders.slice(0, 8).map((order) => <div key={order.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><p className="font-bold text-slate-900">{order.invoice_no}</p><p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleString('en-IN')} · {order.sales_invoice_items?.length ?? 0} line items</p></div><div className="flex items-center justify-between gap-4 sm:justify-end"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${order.order_status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : order.order_status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{statusLabel(order.order_status)}</span><span className="font-black text-slate-900">{money(order.grand_total)}</span></div></div>)}</div>}</section>

      {cart.length > 0 && <button type="button" onClick={() => setCartOpen(true)} className="fixed bottom-20 left-3 right-3 z-40 flex min-h-14 items-center justify-between rounded-2xl bg-slate-950 px-4 text-white shadow-2xl lg:hidden"><span className="flex items-center gap-2 text-sm font-bold"><span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-indigo-500 px-2">{itemCount}</span> View cart</span><span className="flex items-center gap-2 text-sm font-black">{money(total)} <ArrowRight className="h-4 w-4" /></span></button>}
    </div>
  )
}
