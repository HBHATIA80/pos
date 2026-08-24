'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Minus, Plus, ReceiptText, RefreshCw, Search, ShoppingCart, Trash2, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PaymentDialog from './PaymentDialog'

type Product = { id: string; sku: string; barcode: string | null; name: string; sale_price: number; current_stock: number; reorder_level: number }
type Party = { id: string; party_code: string; name: string; phone: string | null; alternate_phone?: string | null; party_type: 'customer' | 'supplier' | 'both' }
type CartItem = Product & { quantity: number; unit_price: number; pricing_source: 'base' | 'price_list'; price_overridden: boolean }
type Invoice = { id: string; invoice_no: string; status: 'draft' | 'completed' | 'void'; grand_total: number; subtotal: number; discount_amount: number; created_at: string; parties?: { name: string } | null }

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [partySearch, setPartySearch] = useState('')
  const [customer, setCustomer] = useState('')
  const [showPartyResults, setShowPartyResults] = useState(false)
  const [showProductResults, setShowProductResults] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [productLoading, setProductLoading] = useState(false)
  const [partyLoading, setPartyLoading] = useState(false)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const productInput = useRef<HTMLInputElement>(null)
  const partyInput = useRef<HTMLInputElement>(null)

  async function searchProducts(q: string) {
    setProductLoading(true)
    try {
      const response = await fetch(`/api/pos/products?q=${encodeURIComponent(q)}&limit=30`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to search products')
      setProducts(result.products || [])
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to search products') }
    finally { setProductLoading(false) }
  }

  async function searchParties(q: string) {
    setPartyLoading(true)
    try {
      const response = await fetch(`/api/pos/parties?q=${encodeURIComponent(q)}&limit=30`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to search customers')
      setParties((result.parties || []).filter((p: Party) => p.party_type === 'customer' || p.party_type === 'both'))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to search customers') }
    finally { setPartyLoading(false) }
  }

  async function loadInvoices() {
    const response = await fetch('/api/sales', { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (response.ok) setInvoices(result.invoices || [])
  }

  async function load() {
    setLoading(true)
    await Promise.all([searchProducts(''), searchParties(''), loadInvoices()])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { const t = setTimeout(() => void searchProducts(productSearch), 220); return () => clearTimeout(t) }, [productSearch])
  useEffect(() => { const t = setTimeout(() => void searchParties(partySearch), 220); return () => clearTimeout(t) }, [partySearch])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) { event.preventDefault(); productInput.current?.focus() }
      if (event.key === 'Escape') { setShowPartyResults(false); setShowProductResults(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * Number(item.unit_price), 0), [cart])
  const selectedCustomer = parties.find(p => p.id === customer)

  async function resolvePrice(productId: string, quantity: number) {
    const params = new URLSearchParams({ product_id: productId, quantity: String(quantity) })
    if (customer) params.set('customer_id', customer)
    const response = await fetch(`/api/pos/pricing?${params.toString()}`, { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'Unable to resolve price')
    return { unit_price: Number(result.unit_price), pricing_source: result.source as CartItem['pricing_source'] }
  }

  async function addProduct(product: Product) {
    try {
      const existing = cart.find(item => item.id === product.id)
      const nextQty = (existing?.quantity || 0) + 1
      if (existing?.price_overridden) {
        setCart(current => current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        const price = await resolvePrice(product.id, nextQty)
        setCart(current => {
          const found = current.find(item => item.id === product.id)
          if (found) return current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1, unit_price: price.unit_price, pricing_source: price.pricing_source } : item)
          return [...current, { ...product, quantity: 1, unit_price: price.unit_price, pricing_source: price.pricing_source, price_overridden: false }]
        })
      }
      setProductSearch('')
      setShowProductResults(false)
      requestAnimationFrame(() => productInput.current?.focus())
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to add product') }
  }

  async function setQty(id: string, quantity: number) {
    if (quantity <= 0) return setCart(current => current.filter(item => item.id !== id))
    const existing = cart.find(item => item.id === id)
    if (existing?.price_overridden) return setCart(current => current.map(item => item.id === id ? { ...item, quantity } : item))
    try {
      const price = await resolvePrice(id, quantity)
      setCart(current => current.map(item => item.id === id ? { ...item, quantity, unit_price: price.unit_price, pricing_source: price.pricing_source } : item))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update quantity') }
  }

  function setPrice(id: string, value: string) {
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric < 0) return
    setCart(current => current.map(item => item.id === id ? { ...item, unit_price: numeric, price_overridden: true } : item))
  }

  async function save(status: 'draft' | 'completed') {
    if (!cart.length) return toast.error('Add at least one product')
    setSaving(true)
    try {
      const response = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { party_id: customer || null, status, items: cart.map(item => ({ product_id: item.id, quantity: item.quantity, unit_price: item.unit_price, discount_amount: 0 })) } }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to save sale')
      if (!result.invoice?.id) throw new Error('Sale saved but invoice ID was not returned')
      setCart([]); setCustomer(''); setPartySearch(''); await loadInvoices()
      if (status === 'draft') toast.success('Draft sale saved')
      else { toast.success('Invoice saved — receive payment'); setPaymentInvoiceId(result.invoice.id); setPaymentOpen(true) }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save sale') }
    finally { setSaving(false) }
  }

  async function invoiceAction(id: string, action: 'complete' | 'void') {
    const response = await fetch('/api/sales', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(result.error || 'Unable to update invoice')
    toast.success(action === 'complete' ? 'Sale completed' : 'Sale voided')
    void loadInvoices()
  }

  return <div className="mx-auto max-w-[1500px] space-y-4 pb-8">
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><ShoppingCart className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Sales Invoice</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Fast Billing</h1><p className="mt-1 text-sm text-slate-500">Search a customer, scan/search products, edit quantity or price, then save and collect.</p></div></div>
        <div className="flex items-center gap-2"><span className="hidden rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:inline">Press <b>/</b> to search products</span><button onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
      </div>
    </section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
            <div className="relative">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Customer / Party</label>
              <div className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 ${showPartyResults ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200'}`}><UserRound className="h-5 w-5 shrink-0 text-slate-400" /><input ref={partyInput} value={selectedCustomer ? selectedCustomer.name : partySearch} onChange={e => { setCustomer(''); setPartySearch(e.target.value); setShowPartyResults(true) }} onFocus={() => setShowPartyResults(true)} placeholder="Walk-in customer — type name, code or mobile" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />{partyLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}{customer && <button onClick={() => { setCustomer(''); setPartySearch(''); partyInput.current?.focus() }}><X className="h-4 w-4 text-slate-400" /></button>}</div>
              {showPartyResults && !customer && <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-72 overflow-y-auto">{parties.length ? parties.slice(0, 10).map(p => <button key={p.id} onMouseDown={e => e.preventDefault()} onClick={() => { setCustomer(p.id); setPartySearch(''); setShowPartyResults(false) }} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-blue-50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">{p.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{p.name}</span><span className="block truncate text-xs text-slate-500">{p.party_code || 'No code'} · {p.phone || 'No mobile'} · {p.party_type}</span></span></button>) : <div className="p-5 text-center text-sm text-slate-500">No customer found</div>}</div><div className="border-t bg-slate-50 px-4 py-2 text-[11px] text-slate-500">Search by name, party code or mobile number</div></div>}
            </div>
            <div className="relative">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Add Product</label>
              <div className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 ${showProductResults ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200'}`}><Search className="h-5 w-5 shrink-0 text-slate-400" /><input ref={productInput} value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowProductResults(true) }} onFocus={() => setShowProductResults(true)} placeholder="Search product, SKU or barcode…" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />{productLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}<span className="hidden rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-slate-500 sm:inline">/</span></div>
              {showProductResults && <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-80 overflow-y-auto">{products.slice(0, 10).map(p => <button key={p.id} onMouseDown={e => e.preventDefault()} onClick={() => void addProduct(p)} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-blue-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">{p.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{p.name}</span><span className="block truncate text-xs text-slate-500">{p.sku} · Stock {p.current_stock}</span></span><span className="text-sm font-black text-slate-900">{money(p.sale_price)}</span></button>)}{!products.length && <div className="p-6 text-center text-sm text-slate-500">Start typing to find a product</div>}</div></div>}
            </div>
          </div>
          {selectedCustomer && <div className="mt-3 flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-2.5 text-sm"><span className="font-semibold text-blue-800">Customer: {selectedCustomer.name}</span><span className="text-blue-600">{selectedCustomer.phone || selectedCustomer.party_code}</span></div>}
        </div>

        <div className="p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Invoice Items</h2><p className="text-xs text-slate-500">{cart.length} item{cart.length === 1 ? '' : 's'} · edit directly in the grid</p></div>{cart.length > 0 && <button onClick={() => setCart([])} className="text-xs font-semibold text-red-600 hover:underline">Clear all</button>}</div>
          {cart.length === 0 ? <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center"><ShoppingCart className="h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-600">No items added</p><p className="mt-1 max-w-sm text-sm text-slate-400">Search by product name, SKU or barcode above. Select a result to add it instantly.</p></div> : <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Item</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Amount</th><th className="w-10 p-3" /></tr></thead><tbody className="divide-y divide-slate-100">{cart.map(item => <tr key={item.id} className="hover:bg-slate-50/70"><td className="p-3"><p className="font-bold text-slate-800">{item.name}</p><p className="mt-0.5 text-xs text-slate-500">{item.sku} · Stock {item.current_stock}</p></td><td className="p-3"><div className="mx-auto flex w-fit items-center rounded-xl border border-slate-200"><button onClick={() => void setQty(item.id, item.quantity - 1)} className="p-2 text-slate-500 hover:bg-slate-100"><Minus className="h-3.5 w-3.5" /></button><input value={item.quantity} onChange={e => void setQty(item.id, Number(e.target.value))} className="w-14 border-x border-slate-200 py-2 text-center text-sm font-bold outline-none" /><button onClick={() => void setQty(item.id, item.quantity + 1)} className="p-2 text-slate-500 hover:bg-slate-100"><Plus className="h-3.5 w-3.5" /></button></div></td><td className="p-3 text-right"><div className="flex items-center justify-end gap-1"><span className="text-slate-400">₹</span><input value={item.unit_price} onChange={e => setPrice(item.id, e.target.value)} className="w-24 rounded-lg border border-transparent px-2 py-2 text-right font-semibold outline-none hover:border-slate-200 focus:border-blue-400" />{item.price_overridden && <span className="text-[9px] font-bold text-amber-600">EDIT</span>}</div></td><td className="p-3 text-right font-black">{money(item.quantity * item.unit_price)}</td><td className="p-3"><button onClick={() => setCart(current => current.filter(x => x.id !== item.id))} className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>}
        </div>
      </section>

      <aside className="h-fit xl:sticky xl:top-4">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Bill Summary</p><h2 className="mt-1 text-xl font-black">Sale Total</h2></div>
          <div className="space-y-3 p-5"><div className="flex justify-between text-sm"><span className="text-slate-500">Items</span><span className="font-semibold">{cart.reduce((n, x) => n + x.quantity, 0)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{money(subtotal)}</span></div><div className="border-t border-dashed pt-4"><div className="flex items-end justify-between"><span className="font-bold text-slate-700">Net Amount</span><span className="text-3xl font-black tracking-tight text-slate-900">{money(subtotal)}</span></div></div></div>
          <div className="grid gap-2 border-t border-slate-200 p-5"><button disabled={saving || !cart.length} onClick={() => void save('completed')} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-40"><Check className="h-5 w-5" /> Save & Receive Payment</button><button disabled={saving || !cart.length} onClick={() => void save('draft')} className="min-h-11 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Save as Draft</button></div>
          <div className="rounded-b-3xl bg-slate-50 px-5 py-3 text-center text-[11px] text-slate-500">Invoice is saved first, then payment is recorded separately.</div>
        </section>
      </aside>
    </div>

    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5"><div><h2 className="font-bold">Recent Sales</h2><p className="text-xs text-slate-500">Latest invoices and their status</p></div><ReceiptText className="h-5 w-5 text-slate-400" /></div>{loading ? <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3">Date</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead><tbody className="divide-y">{invoices.slice(0, 15).map(invoice => <tr key={invoice.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{invoice.invoice_no}</td><td className="p-3">{invoice.parties?.name || 'Walk-in'}</td><td className="p-3 text-slate-500">{new Date(invoice.created_at).toLocaleString('en-IN')}</td><td className="p-3 text-right font-bold">{money(invoice.grand_total)}</td><td className="p-3"><Status status={invoice.status} /></td><td className="p-3 text-right">{invoice.status === 'draft' && <button onClick={() => void invoiceAction(invoice.id, 'complete')} className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Complete</button>}{invoice.status === 'completed' && <button onClick={() => { setPaymentInvoiceId(invoice.id); setPaymentOpen(true) }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Receive</button>}{invoice.status !== 'void' && <button onClick={() => void invoiceAction(invoice.id, 'void')} className="ml-1 rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Void</button>}</td></tr>)}</tbody></table>{!invoices.length && <div className="p-10 text-center text-sm text-slate-500">No sales yet.</div>}</div>}</section>
    <PaymentDialog invoiceId={paymentInvoiceId} open={paymentOpen} onClose={() => setPaymentOpen(false)} onPaymentSaved={() => void loadInvoices()} />
  </div>
}

function Status({ status }: { status: Invoice['status'] }) { const cls = status === 'completed' ? 'bg-emerald-100 text-emerald-700' : status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'; return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${cls}`}>{status}</span> }
