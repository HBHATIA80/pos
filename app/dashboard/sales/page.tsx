'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, History, Image as ImageIcon, Loader2, Minus, Pause, Plus, RefreshCw, Search, ShoppingCart, Trash2, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PaymentDialog from './PaymentDialog'

type Product = { id: string; sku: string; barcode: string | null; name: string; image_url: string | null; sale_price: number; purchase_price: number; current_stock: number; reorder_level: number }
type Party = { id: string; party_code: string; name: string; phone: string | null; party_type: 'customer' | 'supplier' | 'both' }
type CartItem = Product & { quantity: number | ''; unit_price: number; pricing_source: 'base' | 'price_list'; price_overridden: boolean }
type Sale = { id: string; invoice_no: string; status: string; grand_total: number; created_at: string; sold_at?: string | null; party?: Party | Party[] | null }

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
function PriceChip({ label, value }: { label: string; value: number }) { return <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-950 ring-1 ring-slate-200"><span className="text-slate-700">{label}</span> {money(value)}</span> }

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
  const today = useMemo(() => { const now = new Date(); return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}` }, [])

  const selectedCustomer = parties.find(party => party.id === customer)
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price), 0), [cart])
  const itemCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  async function searchProducts(query: string) {
    setProductLoading(true)
    try { const response = await fetch(`/api/pos/products?q=${encodeURIComponent(query)}&limit=30`, { cache: 'no-store' }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Unable to search products'); setProducts(body.products || []) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to search products') }
    finally { setProductLoading(false) }
  }
  async function searchParties(query: string) {
    setPartyLoading(true)
    try { const response = await fetch(`/api/pos/parties?q=${encodeURIComponent(query)}&limit=30`, { cache: 'no-store' }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Unable to search customers'); setParties((body.parties || []).filter((party: Party) => party.party_type === 'customer' || party.party_type === 'both')) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to search customers') }
    finally { setPartyLoading(false) }
  }
  async function loadLatestSales() {
    setVouchersLoading(true)
    try { const response = await fetch('/api/sales', { cache: 'no-store' }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Unable to load sales vouchers'); setLatestSales((body.invoices || []).slice(0, 20)) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load sales vouchers') }
    finally { setVouchersLoading(false) }
  }
  async function boot() {
    try { const profile = await fetch('/api/profile', { cache: 'no-store' }); if (profile.ok) { const body = await profile.json(); setBusinessName(body.business?.name || 'BIZBook Shop') }; await Promise.all([searchProducts(''), searchParties('')]) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load sales workspace') }
  }
  useEffect(() => { void boot() }, [])
  useEffect(() => { const timer = setTimeout(() => void searchProducts(productSearch), 220); return () => clearTimeout(timer) }, [productSearch])
  useEffect(() => { const timer = setTimeout(() => void searchParties(partySearch), 220); return () => clearTimeout(timer) }, [partySearch])
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) { event.preventDefault(); productInput.current?.focus(); setShowProducts(true) }; if (event.key === 'Escape') { setShowProducts(false); setShowParties(false); setShowVouchers(false) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [])

  async function resolvePrice(productId: string, quantity: number) {
    const params = new URLSearchParams({ product_id: productId, quantity: String(quantity) }); if (customer) params.set('customer_id', customer)
    const response = await fetch(`/api/pos/pricing?${params}`, { cache: 'no-store' }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Unable to resolve price')
    return { unit_price: Number(body.unit_price), pricing_source: body.source as CartItem['pricing_source'] }
  }

  async function addProduct(product: Product) {
    try {
      if (Number(product.current_stock) <= 0) return toast.error(`${product.name} is out of stock`)
      const existing = cart.find(item => item.id === product.id); const nextQuantity = Number(existing?.quantity || 0) + 1
      if (existing?.price_overridden) setCart(current => current.map(item => item.id === product.id ? { ...item, quantity: nextQuantity } : item))
      else { const resolved = await resolvePrice(product.id, nextQuantity); setCart(current => { const found = current.find(item => item.id === product.id); return found ? current.map(item => item.id === product.id ? { ...item, quantity: nextQuantity, unit_price: resolved.unit_price, pricing_source: resolved.pricing_source } : item) : [...current, { ...product, quantity: 1, unit_price: resolved.unit_price, pricing_source: resolved.pricing_source, price_overridden: false }] }) }
      setProductSearch(''); setShowProducts(false); requestAnimationFrame(() => productInput.current?.focus())
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to add product') }
  }

  function setQuantityDraft(id: string, value: string) {
    if (value === '') { setCart(current => current.map(item => item.id === id ? { ...item, quantity: '' } : item)); return }
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    setCart(current => current.map(item => item.id === id ? { ...item, quantity: parsed } : item))
  }
  async function commitQuantity(id: string) {
    const existing = cart.find(item => item.id === id); if (!existing) return
    const quantity = Math.max(1, Number(existing.quantity || 0))
    if (quantity > Number(existing.current_stock)) { toast.error(`Only ${existing.current_stock} units are available`); setCart(current => current.map(item => item.id === id ? { ...item, quantity: existing.current_stock } : item)); return }
    if (existing.price_overridden) { setCart(current => current.map(item => item.id === id ? { ...item, quantity } : item)); return }
    try { const resolved = await resolvePrice(id, quantity); setCart(current => current.map(item => item.id === id ? { ...item, quantity, unit_price: resolved.unit_price, pricing_source: resolved.pricing_source } : item)) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update quantity') }
  }
  function setPrice(id: string, value: string) { const numeric = Number(value); if (!Number.isFinite(numeric) || numeric < 0) return; setCart(current => current.map(item => item.id === id ? { ...item, unit_price: numeric, price_overridden: true } : item)) }

  async function save(status: 'draft' | 'completed') {
    if (!cart.length) return toast.error('Add at least one product')
    if (cart.some(item => Number(item.quantity || 0) < 1)) return toast.error('Enter a quantity of at least 1 for every product')
    setSaving(true)
    try {
      const items = cart.map(item => ({ product_id: item.id, quantity: Number(item.quantity), unit_price: item.unit_price, discount_amount: 0 }))
      const response = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { party_id: customer || null, status, items } }) })
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Unable to save sale'); if (!body.invoice?.id) throw new Error('Invoice was saved but no invoice ID was returned')
      setCart([]); setCustomer(''); setPartySearch(''); setProductSearch(''); setShowProducts(false)
      if (status === 'draft') toast.success(`Draft saved for ${businessName}`); else { toast.success('Invoice saved — receive payment'); setPaymentInvoiceId(body.invoice.id); setPaymentOpen(true) }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save sale') }
    finally { setSaving(false) }
  }

  const salePartyName = (sale: Sale) => Array.isArray(sale.party) ? (sale.party[0]?.name || 'Walk-in Customer') : (sale.party?.name || 'Walk-in Customer')
  const saleDate = (sale: Sale) => new Date(sale.sold_at || sale.created_at).toLocaleDateString('en-IN')

  return <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-[1680px] flex-col gap-3 pb-24 lg:pb-3">
    <section className="shrink-0 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
      <div className="flex min-h-[82px] flex-wrap items-center gap-4 px-4 py-3 md:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm"><ShoppingCart className="h-5 w-5" /></span>
          <div className="min-w-0 leading-tight"><div className="text-base font-black text-black">Sales Invoice</div><div className="mt-0.5 truncate text-xs font-bold text-slate-700">{businessName} <span className="mx-1 text-slate-400">•</span> New Sale</div></div>
          <span className="hidden rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200 sm:inline-flex">Live POS</span>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 shadow-sm"><CalendarDays className="h-4 w-4 text-emerald-800" /><div><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Invoice date</div><div className="text-xs font-black text-black">{today}</div></div></div>
          <button type="button" onClick={() => { setShowVouchers(true); void loadLatestSales() }} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-black text-black shadow-sm"><History className="h-4 w-4 text-emerald-800" />Vouchers</button>
          <button type="button" onClick={() => void boot()} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-black shadow-sm" aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>
    </section>

    <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
      <main className="flex min-h-0 min-w-0 flex-col gap-3">
        <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(300px,.9fr)_minmax(420px,1.6fr)]">
            <div className="relative">
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-700">Customer / Party</label>
              <div className={`flex h-14 items-center gap-3 rounded-xl border bg-white px-4 shadow-sm transition ${showParties ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-slate-300'}`}>
                <UserRound className="h-5 w-5 shrink-0 text-emerald-800" />
                <input value={selectedCustomer?.name || partySearch} onChange={event => { setCustomer(''); setPartySearch(event.target.value); setShowParties(true) }} onFocus={() => setShowParties(true)} onKeyDown={event => { if (event.key === 'Enter' && parties[0]) { setCustomer(parties[0].id); setPartySearch(''); setShowParties(false) } }} placeholder="Walk-in customer, name or mobile" className="min-w-0 flex-1 bg-transparent text-base font-semibold text-black outline-none placeholder:text-slate-500" autoComplete="off" />
                {partyLoading && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-700" />}{customer && <button type="button" onClick={() => { setCustomer(''); setPartySearch(''); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[placeholder^="Walk-in customer"]')?.focus()) }} className="rounded-md p-1 hover:bg-slate-100"><X className="h-4 w-4 text-slate-600" /></button>}
              </div>
              {showParties && !customer && <div className="absolute left-0 right-0 top-[78px] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-72 overflow-y-auto">{parties.slice(0, 12).map(party => <button type="button" key={party.id} onMouseDown={event => event.preventDefault()} onClick={() => { setCustomer(party.id); setPartySearch(''); setShowParties(false); requestAnimationFrame(() => productInput.current?.focus()) }} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-emerald-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-black text-emerald-800">{party.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-black">{party.name}</span><span className="block truncate text-xs font-medium text-slate-600">{party.party_code || 'No code'} · {party.phone || 'No mobile'}</span></span></button>)}{!parties.length && <div className="p-6 text-center text-sm font-bold text-slate-700">No customer found</div>}</div></div>}
            </div>
            <div className="relative">
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-700">Product / Barcode</label>
              <div className={`flex h-14 items-center gap-3 rounded-xl border bg-white px-4 shadow-sm transition ${showProducts ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-slate-300'}`}>
                <Search className="h-5 w-5 shrink-0 text-emerald-800" /><input ref={productInput} value={productSearch} onChange={event => { setProductSearch(event.target.value); setShowProducts(true) }} onFocus={() => setShowProducts(true)} onKeyDown={event => { if (event.key === 'Enter' && products[0]) void addProduct(products[0]) }} placeholder="Search product, SKU or scan barcode…" className="min-w-0 flex-1 bg-transparent text-base font-semibold text-black outline-none placeholder:text-slate-500" autoComplete="off" />{productLoading && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-700" />}<span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">/</span>
              </div>
              {showProducts && <div className="absolute left-0 right-0 top-[78px] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-[55vh] overflow-y-auto">{products.slice(0, 12).map(product => <button type="button" key={product.id} onMouseDown={event => event.preventDefault()} onClick={() => void addProduct(product)} className="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-emerald-50"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-500" />}</div><div className="min-w-0 flex-1"><b className="block truncate text-sm font-black text-black">{product.name}</b><span className="block truncate text-xs font-bold text-slate-600">SKU: {product.sku} · <span className="text-emerald-800">Stock: {product.current_stock}</span></span><div className="mt-1.5 flex flex-wrap gap-1.5"><PriceChip label="Selling" value={Number(product.sale_price)} /><PriceChip label="Purchase" value={Number(product.purchase_price)} /></div></div><Plus className="h-5 w-5 shrink-0 text-emerald-700" /></div></button>)}{!products.length && <div className="p-7 text-center text-sm font-bold text-slate-700">{productSearch ? 'No matching product' : 'Type to search products'}</div>}</div></div>}
            </div>
          </div>
        </section>

        <section className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2"><h2 className="text-base font-black text-black">Invoice Items</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-900">{itemCount} Qty</span>{selectedCustomer && <span className="hidden text-xs font-bold text-slate-700 sm:inline">• {selectedCustomer.name}</span>}</div><div className="flex items-center gap-2"><button type="button" onClick={() => setCart([])} disabled={!cart.length || saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-black text-slate-800 disabled:opacity-40"><Trash2 className="h-4 w-4" />Clear</button><button type="button" onClick={() => void save('draft')} disabled={!cart.length || saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-800 disabled:opacity-40"><Pause className="h-4 w-4" />Hold</button></div></div>
          <div className="min-h-0 flex-1 overflow-auto">
            {cart.length ? <table className="w-full min-w-[860px] text-sm"><thead className="sticky top-0 z-10 bg-white text-[11px] font-black uppercase tracking-wide text-slate-700"><tr><th className="w-[42%] px-4 py-3 text-left">Product</th><th className="px-2 py-3 text-center">Stock</th><th className="px-2 py-3 text-center">Qty</th><th className="px-2 py-3 text-right">Rate</th><th className="px-4 py-3 text-right">Amount</th><th className="w-10" /></tr></thead><tbody className="divide-y divide-slate-200">{cart.map(item => <tr key={item.id} className="hover:bg-emerald-50/40"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-slate-500" />}</div><div className="min-w-0"><div className="truncate text-sm font-black text-black">{item.name}</div><div className="text-xs font-bold text-slate-600">{item.sku}{item.pricing_source === 'price_list' ? ' · Customer Price' : ''}</div></div></div></td><td className="px-2 py-3 text-center text-xs font-black text-slate-700">{item.current_stock}</td><td className="px-2 py-3"><div className="mx-auto flex h-12 w-[148px] items-center justify-between rounded-xl border border-slate-300 bg-white shadow-sm"><button type="button" onClick={() => setQuantityDraft(item.id, String(Math.max(1, Number(item.quantity || 1) - 1)))} className="flex h-full w-10 items-center justify-center rounded-l-xl hover:bg-slate-100"><Minus className="h-4 w-4" /></button><input type="text" inputMode="numeric" value={item.quantity} onChange={event => setQuantityDraft(item.id, event.target.value.replace(/\D/g, ''))} onBlur={() => void commitQuantity(item.id)} onKeyDown={event => { if (event.key === 'Enter') { event.currentTarget.blur() } }} className="h-full min-w-0 w-[76px] bg-transparent text-center text-lg font-black text-black outline-none" aria-label={`Quantity for ${item.name}`} autoComplete="off" /><button type="button" onClick={() => setQuantityDraft(item.id, String(Math.min(Number(item.current_stock), Number(item.quantity || 0) + 1)))} className="flex h-full w-10 items-center justify-center rounded-r-xl hover:bg-slate-100"><Plus className="h-4 w-4" /></button></div></td><td className="px-2 py-3 text-right"><input aria-label={`Rate for ${item.name}`} type="text" inputMode="decimal" value={item.unit_price} onChange={event => setPrice(item.id, event.target.value.replace(/[^0-9.]/g, ''))} className="h-11 w-28 rounded-xl border border-slate-300 bg-white px-3 text-right text-sm font-black text-black outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></td><td className="px-4 py-3 text-right text-sm font-black text-black">{money(Number(item.quantity || 0) * Number(item.unit_price))}</td><td className="px-2"><button type="button" onClick={() => setCart(current => current.filter(value => value.id !== item.id))} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><X className="h-4 w-4" /></button></td></tr>)}</tbody></table> : <div className="flex h-full min-h-[500px] flex-col items-center justify-center px-6 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><ShoppingCart className="h-8 w-8" /></div><h3 className="mt-4 text-lg font-black text-black">Start your sale</h3><p className="mt-1 max-w-sm text-sm font-medium text-slate-600">Choose a customer, then search or scan a product. Quantity and rate can be edited directly in the invoice.</p></div>}
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm"><span className="font-bold text-slate-700">{cart.length} products · {itemCount} units</span><span className="font-black text-black">Subtotal <b className="ml-2 text-base text-emerald-800">{money(subtotal)}</b></span></div>
        </section>
      </main>

      <aside className="max-xl:fixed max-xl:bottom-16 max-xl:left-2 max-xl:right-2 max-xl:z-40 xl:sticky xl:top-3 xl:self-start"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"><div className="flex items-center justify-between bg-emerald-800 px-4 py-4 text-white"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-100">Bill Summary</div><div className="mt-1 text-2xl font-black">{money(subtotal)}</div></div><div className="text-right"><div className="text-2xl font-black">{itemCount}</div><div className="text-[10px] font-bold uppercase">items</div></div></div><div className="hidden space-y-3 px-4 py-4 text-sm xl:block"><div className="flex justify-between"><span className="font-bold text-slate-700">Subtotal</span><b className="text-black">{money(subtotal)}</b></div><div className="flex justify-between"><span className="font-bold text-slate-700">Discount</span><b className="text-black">₹0.00</b></div><div className="rounded-xl bg-amber-50 px-3 py-3"><div className="flex items-end justify-between"><span className="font-black text-black">Grand Total</span><span className="text-xl font-black text-black">{money(subtotal)}</span></div></div></div><div className="border-t border-slate-200 p-3"><button type="button" onClick={() => void save('completed')} disabled={!cart.length || saving} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-4 w-4" />{saving ? 'Saving…' : 'Save & Receive Payment'}</button><button type="button" onClick={() => void save('draft')} disabled={!cart.length || saving} className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-white text-xs font-black text-black disabled:opacity-40">Save as Draft</button></div></section></aside>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-300 bg-white/95 p-2 shadow-[0_-4px_18px_rgba(15,23,42,.10)] backdrop-blur sm:hidden"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wide text-slate-600">Grand Total</p><p className="truncate text-lg font-black text-emerald-800">{money(subtotal)} <span className="text-[11px] font-black text-black">· {itemCount} qty</span></p></div><button type="button" disabled={saving || !cart.length} onClick={() => void save('completed')} className="min-h-11 shrink-0 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white">{saving ? 'Saving…' : 'Checkout'}</button></div></div>
    {showVouchers && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"><div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="text-lg font-black text-black">Latest 20 Sales Vouchers</h2><p className="text-xs font-medium text-slate-600">Newest sales invoices for this business</p></div><button type="button" onClick={() => setShowVouchers(false)} className="rounded-xl p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="min-h-0 overflow-auto">{vouchersLoading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : <table className="w-full text-sm"><thead className="sticky top-0 bg-slate-100 text-[11px] font-black uppercase tracking-wide text-slate-700"><tr><th className="p-3 text-left">Voucher</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Date</th><th className="p-3 text-right">Amount</th><th className="p-3 text-left">Status</th></tr></thead><tbody className="divide-y divide-slate-200">{latestSales.map(sale => <tr key={sale.id} className="hover:bg-emerald-50/50"><td className="p-3 font-black text-black">{sale.invoice_no}</td><td className="max-w-[220px] truncate p-3 font-bold text-black">{salePartyName(sale)}</td><td className="whitespace-nowrap p-3 font-medium text-slate-700">{saleDate(sale)}</td><td className="p-3 text-right font-black text-black">{money(sale.grand_total)}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${sale.status === 'draft' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{sale.status}</span></td></tr>)}</tbody></table>}{!latestSales.length && !vouchersLoading && <div className="p-10 text-center text-sm font-bold text-slate-700">No sales vouchers found.</div>}</div></div></div>}
    <PaymentDialog invoiceId={paymentInvoiceId} open={paymentOpen} onClose={() => { setPaymentOpen(false); setPaymentInvoiceId(null) }} />
  </div>
}
