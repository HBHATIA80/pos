'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Image as ImageIcon, Minus, Plus, Search, ShoppingCart, Trash2, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'

type Product = {
  id: string
  sku: string
  name: string
  sale_price: number
  current_stock: number
}

type CartItem = Product & { quantity: number }
type Order = {
  id: string
  invoice_no: string
  status: 'draft' | 'completed' | 'void'
  order_channel?: string | null
  order_status?: 'placed' | 'accepted' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled' | null
  grand_total: number
  created_at: string
  sales_invoice_items?: { product_name: string; quantity: number; unit_price: number }[]
}

const money = (value: number) => `₹${Number(value || 0).toFixed(2)}`

const orderStatusLabel = (status: Order['order_status']) => {
  switch (status) {
    case 'accepted': return 'Accepted'
    case 'packed': return 'Packed'
    case 'out_for_delivery': return 'Out for delivery'
    case 'delivered': return 'Delivered'
    case 'cancelled': return 'Cancelled'
    case 'placed': return 'Placed'
    default: return 'Waiting for shop'
  }
}

export default function OrdersPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [productsResponse, ordersResponse] = await Promise.all([
      fetch('/api/pos/products?q=&limit=50', { cache: 'no-store' }),
      fetch('/api/sales', { cache: 'no-store' }),
    ])

    const productData = await productsResponse.json().catch(() => ({}))
    const orderData = await ordersResponse.json().catch(() => ({}))

    if (productsResponse.ok) setProducts(productData.products ?? [])
    else toast.error(productData.error ?? 'Unable to load products')

    if (ordersResponse.ok) setOrders(orderData.invoices ?? [])
    else toast.error(orderData.error ?? 'Unable to load orders')

    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return products
    return products.filter((product) => product.name.toLowerCase().includes(value) || product.sku.toLowerCase().includes(value))
  }, [products, search])

  const total = cart.reduce((sum, item) => sum + item.quantity * Number(item.sale_price), 0)

  function add(product: Product) {
    if (Number(product.current_stock) <= 0) return toast.error('This product is out of stock.')
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= Number(product.current_stock)) return current
        return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item]
      const quantity = item.quantity + delta
      if (quantity <= 0) return []
      if (quantity > Number(item.current_stock)) return [item]
      return [{ ...item, quantity }]
    }))
  }

  async function placeOrder() {
    if (!cart.length || saving) return
    setSaving(true)

    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          status: 'draft',
          party_id: null,
          notes: 'Customer portal order',
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.sale_price,
            discount_amount: 0,
          })),
        },
      }),
    })

    const data = await response.json().catch(() => ({}))
    setSaving(false)

    if (!response.ok) {
      toast.error(data.error ?? 'Unable to place order')
      return
    }

    toast.success(`Order ${data.invoice?.invoice_no ?? ''} placed successfully.`)
    setCart([])
    await load()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Customer Portal</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Shop & Place Order</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Browse available products, see the selling price, add items to your cart, and send your order to the shop.</p>
          </div>
          <div className="flex w-full max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or SKU" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <Link href="/dashboard/my-ledger" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" title="Open my ledger">
              <WalletCards className="h-4 w-4" />
              <span className="hidden sm:inline">My Ledger</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Available products</h2></div>
          {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading products…</div> : !filteredProducts.length ? <div className="p-10 text-center text-sm text-slate-500">No products available.</div> : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex h-36 items-center justify-center bg-slate-50 text-slate-300"><ImageIcon className="h-12 w-12" /></div>
                  <div className="p-4">
                    <h3 className="min-h-10 font-semibold text-slate-900">{product.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">SKU {product.sku}</p>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div><p className="text-xs text-slate-400">Selling price</p><p className="text-lg font-bold text-blue-700">{money(product.sale_price)}</p></div>
                      <button type="button" onClick={() => add(product)} disabled={Number(product.current_stock) <= 0} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"><ShoppingCart className="h-4 w-4" /> Add</button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{Number(product.current_stock) > 0 ? `${Number(product.current_stock)} available` : 'Out of stock'}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-20">
          <div className="border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-2 font-semibold text-slate-900"><ShoppingCart className="h-5 w-5 text-blue-600" /> Your order</div></div>
          {!cart.length ? <div className="p-8 text-center text-sm text-slate-500">Your cart is empty.</div> : (
            <div className="space-y-3 p-4">
              {cart.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-xs text-slate-500">{money(item.sale_price)} each</p></div><button type="button" onClick={() => changeQuantity(item.id, -item.quantity)} className="text-slate-400 hover:text-red-600" aria-label={`Remove ${item.name}`}><Trash2 className="h-4 w-4" /></button></div>
                  <div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-lg border border-slate-200 bg-white"><button type="button" onClick={() => changeQuantity(item.id, -1)} className="p-2 text-slate-600"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} className="p-2 text-slate-600"><Plus className="h-3.5 w-3.5" /></button></div><span className="font-semibold">{money(item.quantity * item.sale_price)}</span></div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4"><div className="flex items-center justify-between text-lg font-bold"><span>Total</span><span className="text-blue-700">{money(total)}</span></div><button type="button" onClick={() => void placeOrder()} disabled={saving} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {saving ? 'Placing order…' : 'Place order'}</button></div>
            </div>
          )}
        </aside>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold text-slate-900">My orders</h2><p className="mt-1 text-xs text-slate-500">Track what the shop has done with each order.</p></div>
            <Link href="/dashboard/my-ledger" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"><WalletCards className="h-4 w-4" /> View my ledger</Link>
          </div>
        </div>
        {!orders.length ? <div className="p-8 text-center text-sm text-slate-500">No orders yet.</div> : <div className="divide-y divide-slate-100">{orders.map((order) => {
          const lifecycle = order.order_channel === 'customer_portal' ? order.order_status : null
          return <div key={order.id} className="px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{order.invoice_no}</p>
                <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lifecycle === 'delivered' ? 'bg-green-50 text-green-700' : lifecycle === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{orderStatusLabel(lifecycle)}</span>
                <span className="font-bold text-slate-900">{money(order.grand_total)}</span>
              </div>
            </div>
            {lifecycle && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Shop action:</span>
              <span>{orderStatusLabel(lifecycle)}</span>
              {lifecycle === 'delivered' && <span className="text-green-700">· Added to your ledger</span>}
            </div>}
          </div>
        })}</div>}
      </section>
    </div>
  )
}
