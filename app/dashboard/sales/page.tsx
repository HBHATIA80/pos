'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CreditCard, History, Image as ImageIcon, Loader2, Minus, Pause, Plus, RefreshCw, Search, ShoppingCart, Trash2, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PaymentDialog from './PaymentDialog'

type Product = { id: string; sku: string; barcode: string | null; name: string; image_url: string | null; sale_price: number; current_stock: number; reorder_level: number }
type Party = { id: string; party_code: string; name: string; phone: string | null; alternate_phone?: string | null; party_type: 'customer' | 'supplier' | 'both' }
type CartItem = Product & { quantity: number; unit_price: number; pricing_source: 'base' | 'price_list'; price_overridden: boolean }
type Sale = { id: string; invoice_no: string; status: string; grand_total: number; created_at: string; sold_at?: string | null; party?: Party | Party[] | null }
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function SalesPage() {
  const [businessName, setBusinessName] = useState('BIZBook Shop')
  const [products, setProducts] = useState<Product[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [partySearch, setPartySearch] = useState('')
  const [customer, setCustomer] = useState('')
  const [showProducts, setShowProducts] = useState(false)
  const [showParties, setShowParties] = useState(false)
  const [productLoading, setProductLoading] = useState(false)
  const [partyLoading, setPartyLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [showVouchers, setShowVouchers] = useState(false)
  const [latestSales, setLatestSales] = useState<Sale[]>([])
  const [vouchersLoading, setVouchersLoading] = useState(false)
  const productInput = useRef<HTMLInputElement>(null)

  const selectedCustomer = parties.find((party) => party.id === customer)
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * Number(item.unit_price), 0), [cart])
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  async function searchProducts(query: string) {
    setProductLoading(true)
    try {
      const response = await fetch(`/api/pos/products?q=${encodeURIComponent(query)}&limit=30`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to search products')
      setProducts(body.products || [])
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to search products') }
    finally { setProductLoading(false) }
  }

  async function searchParties(query: string) {
    setPartyLoading(true)
    try {
      const response = await fetch(`/api/pos/parties?q=${encodeURIComponent(query)}&limit=30`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to search customers')
      setParties((body.parties || []).filter((party: Party) => party.party_type === 'customer' || party.party_type === 'both'))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to search customers') }
    finally { setPartyLoading(false) }
  }

  async function loadLatestSales() {
    setVouchersLoading(true)
    try {
      const response = await fetch('/api/sales', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load sales vouchers')
      setLatestSales((body.invoices || []).slice(0, 20))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load sales vouchers') }
    finally { setVouchersLoading(false) }
  }

  async function openVouchers() {
    setShowVouchers(true)
    await loadLatestSales()
  }

  async function boot() {
    try {
      const profile = await fetch('/api/profile', { cache: 'no-store' })
      if (profile.ok) { const body = await profile.json(); setBusinessName(body.business?.name || 'BIZBook Shop') }
      await Promise.all([searchProducts(''), searchParties('')])
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load sales workspace') }
  }

  useEffect(() => { void boot() }, [])
  useEffect(() => { const timer = setTimeout(() => void searchProducts(productSearch), 220); return () => clearTimeout(timer) }, [productSearch])
  useEffect(() => { const timer = setTimeout(() => void searchParties(partySearch), 220); return () => clearTimeout(timer) }, [partySearch])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) { event.preventDefault(); productInput.current?.focus(); setShowProducts(true) }
      if (event.key === 'Escape') { setShowProducts(false); setShowParties(false); setShowVouchers(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function resolvePrice(productId: string, quantity: number) {
    const params = new URLSearchParams({ product_id: productId, quantity: String(quantity) })
    if (customer) params.set('customer_id', customer)
    const response = await fetch(`/api/pos/pricing?${params}`, { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'Unable to resolve price')
    return { unit_price: Number(body.unit_price), pricing_source: body.source as CartItem['pricing_source'] }
  }

  async function addProduct(product: Product) {
    try {
      if (Number(product.current_stock) <= 0) return toast.error(`${product.name} is out of stock`)
      const existing = cart.find((item) => item.id === product.id)
      const nextQuantity = (existing?.quantity || 0) + 1
      if (existing?.price_overridden) setCart((current) => current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      else {
        const resolved = await resolvePrice(product.id, nextQuantity)
        setCart((current) => {
          const found = current.find((item) => item.id === product.id)
          return found ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1, unit_price: resolved.unit_price, pricing_source: resolved.pricing_source } : item) : [...current, { ...product, quantity: 1, unit_price: resolved.unit_price, pricing_source: resolved.pricing_source, price_overridden: false }]
        })
      }
      setProductSearch(''); setShowProducts(false); requestAnimationFrame(() => productInput.current?.focus())
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to add product') }
  }

  async function setQuantity(id: string, quantity: number) {
    if (quantity <= 0) return setCart((current) => current.filter((item) => item.id !== id))
    const existing = cart.find((item) => item.id === id)
    if (!existing) return
    if (quantity > Number(existing.current_stock)) return toast.error(`Only ${existing.current_stock} units are available`)
    if (existing.price_overridden) return setCart((current) => current.map((item) => item.id === id ? { ...item, quantity } : item))
    try {
      const resolved = await resolvePrice(id, quantity)
      setCart((current) => current.map((item) => item.id === id ? { ...item, quantity, unit_price: resolved.unit_price, pricing_source: resolved.pricing_source } : item))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update quantity') }
  }

  function setPrice(id: string, value: string) {
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric < 0) return
    setCart((current) => current.map((item) => item.id === id ? { ...item, unit_price: numeric, price_overridden: true } : item))
  }

  async function save(status: 'draft' | 'completed') {
    if (!cart.length) return toast.error('Add at least one product')
    setSaving(true)
    try {
      const response = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { party_id: customer || null, status, items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity, unit_price: item.unit_price, discount_amount: 0 })) } }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to save sale')
      if (!body.invoice?.id) throw new Error('Invoice was saved but no invoice ID was returned')
      setCart([]); setCustomer(''); setPartySearch(''); setProductSearch(''); setShowProducts(false)
      if (status === 'draft') toast.success(`Draft saved for ${businessName}`)
      else { toast.success('Invoice saved — receive payment'); setPaymentInvoiceId(body.invoice.id); setPaymentOpen(true) }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save sale') }
    finally { setSaving(false) }
  }

  const salePartyName = (sale: Sale) => Array.isArray(sale.party) ? (sale.party[0]?.name || 'Walk-in Customer') : (sale.party?.name || 'Walk-in Customer')
  const saleDate = (sale: Sale) => new Date(sale.sold_at || sale.created_at).toLocaleDateString('en-IN')

  return <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-[1680px] flex-col gap-3 pb-28 lg:pb-3">
    <section className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex min-h-12 flex-wrap items-center gap-2 px-3 py-2"><div className="flex items-center gap-2 pr-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white"><ShoppingCart className="h-4 w-4" /></span><div className="leading-tight"><div className="text-sm font-black text-slate-900">Sales Invoice</div><div className="text-[10px] text-slate-500">{businessName}</div></div></div><div className="hidden h-7 w-px bg-slate-200 sm:block" /><span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">Live POS</span><span className="hidden text-xs text-slate-400 lg:inline">•</span><span className="hidden text-xs text-slate-500 lg:inline">New Invoice</span><div className="ml-auto flex items-center gap-2"><button type="button" onClick={() => void openVouchers()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-black text-violet-700 hover:bg-violet-100"><History className="h-3.5 w-3.5" />Latest 20 Vouchers</button><span className="hidden rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500 md:inline">Press <b>/</b> for products</span><button type="button" onClick={() => void boot()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" />Refresh</button></div></div></section>

    <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_250px]">
      <main className="flex min-h-0 min-w-0 flex-col gap-3">
        <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="grid gap-2 lg:grid-cols-[minmax(250px,.7fr)_minmax(0,1.6fr)]">
          <div className="relative"><label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Customer / Party</label><div className={`flex h-11 items-center gap-2 rounded-xl border px-3 ${showParties ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200 bg-slate-50'}`}><UserRound className="h-4 w-4 shrink-0 text-slate-400" /><input value={selectedCustomer?.name || partySearch} onChange={(event) => { setCustomer(''); setPartySearch(event.target.value); setShowParties(true) }} onFocus={() => setShowParties(true)} placeholder="Walk-in customer / name / mobile" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />{partyLoading && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}{customer && <button type="button" onClick={() => { setCustomer(''); setPartySearch('') }}><X className="h-4 w-4 text-slate-400" /></button>}</div>{showParties && !customer && <div className="absolute left-0 right-0 top-[62px] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-64 overflow-y-auto">{parties.slice(0, 12).map((party) => <button type="button" key={party.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setCustomer(party.id); setPartySearch(''); setShowParties(false) }} className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-violet-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-[10px] font-black text-violet-700">{party.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900">{party.name}</span><span className="block truncate text-[10px] text-slate-500">{party.party_code || 'No code'} · {party.phone || 'No mobile'}</span></span></button>)}{!parties.length && <div className="p-5 text-center text-xs text-slate-500">No customer found</div>}</div></div>}</div>
          <div className="relative"><label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Product / Barcode</label><div className={`flex h-11 items-center gap-2 rounded-xl border px-3 ${showProducts ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200 bg-slate-50'}`}><Search className="h-4 w-4 shrink-0 text-slate-400" /><input ref={productInput} value={productSearch} onChange={(event) => { setProductSearch(event.target.value); setShowProducts(true) }} onFocus={() => setShowProducts(true)} placeholder="Search product, SKU or scan barcode…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />{productLoading && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}<span className="rounded-md bg-white px-1.5 py-1 text-[10px] font-bold text-slate-400 shadow-sm">/</span></div>{showProducts && <div className="absolute left-0 right-0 top-[62px] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-[52vh] overflow-y-auto">{products.slice(0, 12).map((product) => <button type="button" key={product.id} onMouseDown={(event) => event.preventDefault()} onClick={() => void addProduct(product)} className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-violet-50"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-slate-300" />}</div><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-900">{product.name}</b><small className="block truncate text-[10px] text-slate-500">{product.sku} · Stock {product.current_stock}</small></span><span className="text-xs font-black">{money(product.sale_price)}</span><Plus className="h-4 w-4 text-violet-600" /></button>)}{!products.length && <div className="p-6 text-center text-xs text-slate-500">{productSearch ? 'No matching product' : 'Type to search products'}</div>}</div></div>}</div>
        </div></section>

        <section className="flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2.5"><div className="flex items-center gap-2"><h2 className="text-sm font-black text-slate-900">Invoice Items</h2><span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700">{itemCount} Qty</span>{selectedCustomer && <span className="hidden text-[11px] text-slate-500 sm:inline">• {selectedCustomer.name}</span>}</div><div className="flex items-center gap-1.5"><button type="button" onClick={() => setCart([])} disabled={!cart.length || saving} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-bold text-rose-600 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Clear</button><button type="button" onClick={() => void save('draft')} disabled={!cart.length || saving} className="hidden h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 disabled:opacity-40 sm:inline-flex"><Pause className="h-3.5 w-3.5" />Hold</button></div></div><div className="min-h-0 flex-1 overflow-auto">{cart.length ? <table className="w-full min-w-[760px] text-sm"><thead className="sticky top-0 z-10 bg-white text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]"><tr><th className="w-1/2 px-3 py-2 text-left">Product</th><th className="px-2 py-2 text-center">Stock</th><th className="px-2 py-2 text-center">Qty</th><th className="px-2 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th><th className="w-8" /></tr></thead><tbody className="divide-y divide-slate-100">{cart.map((item) => <tr key={item.id} className="hover:bg-violet-50/40"><td className="px-3 py-2"><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-slate-300" />}</div><div className="min-w-0"><div className="truncate text-xs font-bold text-slate-900">{item.name}</div><div className="truncate text-[10px] text-slate-500">{item.sku}{item.pricing_source === 'price_list' ? ' · Customer Price' : ''}</div></div></div></td><td className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">{item.current_stock}</td><td className="px-2 py-2"><div className="mx-auto flex h-8 w-[92px] items-center justify-between rounded-lg border border-slate-200 bg-white"><button type="button" onClick={() => void setQuantity(item.id, item.quantity - 1)} className="flex h-full w-7 items-center justify-center text-slate-500 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button><input type="number" min="1" max={item.current_stock} value={item.quantity} onChange={(event) => void setQuantity(item.id, Number(event.target.value))} className="w-10 bg-transparent text-center text-xs font-black outline-none" /><button type="button" onClick={() => void setQuantity(item.id, item.quantity + 1)} className="flex h-full w-7 items-center justify-center text-violet-600 hover:bg-violet-50"><Plus className="h-3.5 w-3.5" /></button></div></td><td className="px-2 py-2 text-right"><input aria-label={`Rate for ${item.name}`} type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => setPrice(item.id, event.target.value)} className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 text-right text-xs font-bold outline-none focus:border-violet-500" /></td><td className="px-3 py-2 text-right text-xs font-black text-slate-900">{money(item.quantity * Number(item.unit_price))}</td><td className="px-2"><button type="button" onClick={() => void setQuantity(item.id, 0)} className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button></td></tr>)}</tbody></table> : <div className="flex h-full min-h-[540px] flex-col items-center justify-center px-6 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><ShoppingCart className="h-7 w-7" /></div><h3 className="mt-3 text-base font-black text-slate-800">Start your invoice</h3><p className="mt-1 max-w-sm text-xs text-slate-500">Search a product above or scan its barcode. Added items will appear here with quantity, rate and amount.</p><button type="button" onClick={() => productInput.current?.focus()} className="mt-4 h-9 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700">Search Products</button></div>}</div><div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span className="text-slate-500">{cart.length} products · {itemCount} units</span><span className="font-black text-slate-900">Subtotal <b className="ml-2 text-sm">{money(subtotal)}</b></span></div></section>
      </main>

      <aside className="max-xl:fixed max-xl:bottom-16 max-xl:left-2 max-xl:right-2 max-xl:z-40 xl:sticky xl:top-3 xl:self-start"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg max-xl:shadow-2xl"><div className="flex items-center justify-between bg-violet-700 px-3 py-2.5 text-white"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">Bill Summary</div><div className="mt-0.5 text-xl font-black tracking-tight">{money(subtotal)}</div></div><div className="text-right text-[9px] text-violet-100">{itemCount} items</div></div><div className="hidden space-y-2 px-3 py-3 text-xs xl:block"><div className="flex justify-between"><span className="text-slate-500">Subtotal</span><b>{money(subtotal)}</b></div><div className="flex justify-between"><span className="text-slate-500">Discount</span><b>₹0.00</b></div><div className="border-t border-dashed border-slate-200 pt-2"><div className="flex items-end justify-between"><span className="font-bold text-slate-700">Grand Total</span><span className="text-xl font-black text-violet-700">{money(subtotal)}</span></div></div></div><div className="border-t border-slate-200 p-2.5"><button type="button" onClick={() => void save('completed')} disabled={!cart.length || saving} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-black text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-4 w-4" />{saving ? 'Saving…' : 'Save & Receive Payment'}</button><button type="button" onClick={() => void save('draft')} disabled={!cart.length || saving} className="mt-1.5 h-9 w-full rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Save as Draft</button></div></section></aside>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-2 shadow-[0_-4px_18px_rgba(15,23,42,.10)] backdrop-blur sm:hidden"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Grand Total</p><p className="truncate text-lg font-black text-violet-700">{money(subtotal)} <span className="text-[10px] font-semibold text-slate-400">· {itemCount} qty</span></p></div><button type="button" disabled={saving || !cart.length} onClick={() => void save('completed')} className="min-h-11 shrink-0 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-40">{saving ? 'Saving…' : 'Checkout'}</button></div></div>

    {showVouchers && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"><div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5"><div><h2 className="text-base font-black text-slate-900">Latest 20 Sales Vouchers</h2><p className="text-[11px] text-slate-500">Newest sales invoices for this business</p></div><button type="button" onClick={() => setShowVouchers(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="min-h-0 overflow-auto">{vouchersLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div> : <table className="w-full min-w-[680px] text-xs"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-2 text-left">Voucher</th><th className="p-2 text-left">Customer</th><th className="p-2 text-left">Date</th><th className="p-2 text-right">Amount</th><th className="p-2 text-left">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{latestSales.map(sale => <tr key={sale.id} className="hover:bg-violet-50/40"><td className="p-2 font-bold">{sale.invoice_no}</td><td className="max-w-[220px] truncate p-2">{salePartyName(sale)}</td><td className="whitespace-nowrap p-2 text-slate-500">{saleDate(sale)}</td><td className="p-2 text-right font-bold">{money(sale.grand_total)}</td><td className="p-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${sale.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{sale.status}</span></td></tr>)}</tbody></table>}{!latestSales.length && !vouchersLoading && <div className="p-10 text-center text-sm text-slate-500">No sales vouchers found.</div>}</div></div></div>}

    <PaymentDialog invoiceId={paymentInvoiceId} open={paymentOpen} onClose={() => { setPaymentOpen(false); setPaymentInvoiceId(null) }} />
  </div>
}
