'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Minus, Plus, RefreshCw, Search, ShoppingBag, Trash2, Truck, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Product = { id: string; name: string; sku: string; barcode?: string | null; purchase_price: number; current_stock: number }
type Party = { id: string; party_code?: string; name: string; phone?: string | null; party_type: 'customer' | 'supplier' | 'both' }
type Line = { product_id: string; quantity: number; unit_price: number }
type Purchase = { id: string; invoice_no: string; status: string; grand_total: number; created_at: string; party?: Party | Party[] | null }

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Party[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [supplier, setSupplier] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [productLoading, setProductLoading] = useState(false)
  const [supplierLoading, setSupplierLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSupplierResults, setShowSupplierResults] = useState(false)
  const [showProductResults, setShowProductResults] = useState(false)
  const productInput = useRef<HTMLInputElement>(null)
  const supplierInput = useRef<HTMLInputElement>(null)

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

  async function searchSuppliers(q: string) {
    setSupplierLoading(true)
    try {
      const response = await fetch(`/api/pos/parties?q=${encodeURIComponent(q)}&limit=30`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to search suppliers')
      setSuppliers((result.parties || []).filter((p: Party) => p.party_type === 'supplier' || p.party_type === 'both'))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to search suppliers') }
    finally { setSupplierLoading(false) }
  }

  async function loadPurchases() {
    const response = await fetch('/api/purchases', { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (response.ok) setPurchases(result.purchases || [])
  }

  async function load() {
    setLoading(true)
    await Promise.all([searchProducts(''), searchSuppliers(''), loadPurchases()])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { const t = setTimeout(() => void searchProducts(productSearch), 220); return () => clearTimeout(t) }, [productSearch])
  useEffect(() => { const t = setTimeout(() => void searchSuppliers(supplierSearch), 220); return () => clearTimeout(t) }, [supplierSearch])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) { event.preventDefault(); productInput.current?.focus() }
      if (event.key === 'Escape') { setShowSupplierResults(false); setShowProductResults(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const selectedSupplier = suppliers.find(s => s.id === supplier)
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0), [lines])
  const itemCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines])

  function addProduct(product: Product) {
    setLines(current => {
      const found = current.find(line => line.product_id === product.id)
      if (found) return current.map(line => line.product_id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      return [...current, { product_id: product.id, quantity: 1, unit_price: Number(product.purchase_price || 0) }]
    })
    setProductSearch('')
    setShowProductResults(false)
    requestAnimationFrame(() => productInput.current?.focus())
  }

  function updateQty(id: string, quantity: number) {
    if (quantity <= 0) return setLines(current => current.filter(line => line.product_id !== id))
    setLines(current => current.map(line => line.product_id === id ? { ...line, quantity } : line))
  }

  function updatePrice(id: string, value: string) {
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric < 0) return
    setLines(current => current.map(line => line.product_id === id ? { ...line, unit_price: numeric } : line))
  }

  async function save() {
    if (!lines.length) return toast.error('Add at least one product')
    setSaving(true)
    try {
      const response = await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ party_id: supplier || null, items: lines }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to create purchase')
      const id = result.purchase?.id
      if (!id) throw new Error('Purchase was created but invoice ID was not returned')
      const complete = await fetch('/api/purchases', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'complete' }) })
      const completeResult = await complete.json().catch(() => ({}))
      if (!complete.ok) throw new Error(completeResult.error || 'Unable to complete purchase')
      toast.success('Purchase completed — stock updated')
      setLines([]); setSupplier(''); setSupplierSearch(''); await loadPurchases()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save purchase') }
    finally { setSaving(false) }
  }

  const supplierName = (purchase: Purchase) => {
    if (Array.isArray(purchase.party)) return purchase.party[0]?.name || 'Walk-in / Other'
    return purchase.party?.name || 'Walk-in / Other'
  }

  return <div className="mx-auto max-w-[1500px] space-y-4 pb-8">
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><ShoppingBag className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Purchase Invoice</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Fast Purchase Entry</h1><p className="mt-1 text-sm text-slate-500">Choose a supplier, search products, enter quantity and purchase rate, then complete.</p></div></div>
        <div className="flex items-center gap-2"><span className="hidden rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:inline">Press <b>/</b> to search products</span><button onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
      </div>
    </section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
            <div className="relative">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Supplier / Party</label>
              <div className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 ${showSupplierResults ? 'border-violet-500 ring-4 ring-violet-50' : 'border-slate-200'}`}><Truck className="h-5 w-5 shrink-0 text-slate-400" /><input ref={supplierInput} value={selectedSupplier ? selectedSupplier.name : supplierSearch} onChange={e => { setSupplier(''); setSupplierSearch(e.target.value); setShowSupplierResults(true) }} onFocus={() => setShowSupplierResults(true)} placeholder="Walk-in supplier — type name, code or mobile" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />{supplierLoading && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}{supplier && <button onClick={() => { setSupplier(''); setSupplierSearch(''); supplierInput.current?.focus() }}><X className="h-4 w-4 text-slate-400" /></button>}</div>
              {showSupplierResults && !supplier && <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-72 overflow-y-auto">{suppliers.length ? suppliers.slice(0, 10).map(s => <button key={s.id} onMouseDown={e => e.preventDefault()} onClick={() => { setSupplier(s.id); setSupplierSearch(''); setShowSupplierResults(false) }} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-violet-50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">{s.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{s.name}</span><span className="block truncate text-xs text-slate-500">{s.party_code || 'No code'} · {s.phone || 'No mobile'} · {s.party_type}</span></span></button>) : <div className="p-5 text-center text-sm text-slate-500">No supplier found</div>}</div><div className="border-t bg-slate-50 px-4 py-2 text-[11px] text-slate-500">Search by supplier name, party code or mobile number</div></div>}
            </div>
            <div className="relative">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Add Product</label>
              <div className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 ${showProductResults ? 'border-violet-500 ring-4 ring-violet-50' : 'border-slate-200'}`}><Search className="h-5 w-5 shrink-0 text-slate-400" /><input ref={productInput} value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowProductResults(true) }} onFocus={() => setShowProductResults(true)} placeholder="Search product, SKU or barcode…" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />{productLoading && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}<span className="hidden rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-slate-500 sm:inline">/</span></div>
              {showProductResults && <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-80 overflow-y-auto">{products.slice(0, 10).map(p => <button key={p.id} onMouseDown={e => e.preventDefault()} onClick={() => addProduct(p)} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-violet-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">{p.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{p.name}</span><span className="block truncate text-xs text-slate-500">{p.sku} · Stock {p.current_stock}</span></span><span className="text-sm font-black text-slate-900">{money(p.purchase_price)}</span></button>)}{!products.length && <div className="p-6 text-center text-sm text-slate-500">Start typing to find a product</div>}</div></div>}
            </div>
          </div>
          {selectedSupplier && <div className="mt-3 flex items-center justify-between rounded-2xl bg-violet-50 px-4 py-2.5 text-sm"><span className="font-semibold text-violet-800">Supplier: {selectedSupplier.name}</span><span className="text-violet-600">{selectedSupplier.phone || selectedSupplier.party_code}</span></div>}
        </div>

        <div className="p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Purchase Items</h2><p className="text-xs text-slate-500">{lines.length} line{lines.length === 1 ? '' : 's'} · edit quantity and rate directly</p></div>{lines.length > 0 && <button onClick={() => setLines([])} className="text-xs font-semibold text-red-600 hover:underline">Clear all</button>}</div>
          {lines.length === 0 ? <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center"><ShoppingBag className="h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-600">No items added</p><p className="mt-1 max-w-sm text-sm text-slate-400">Search by product name, SKU or barcode above and select a product to start the purchase.</p></div> : <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Item</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Purchase Rate</th><th className="p-3 text-right">Amount</th><th className="w-10 p-3" /></tr></thead><tbody className="divide-y divide-slate-100">{lines.map(line => { const product = products.find(p => p.id === line.product_id); return <tr key={line.product_id} className="hover:bg-slate-50/70"><td className="p-3"><p className="font-bold text-slate-800">{product?.name || 'Product'}</p><p className="mt-0.5 text-xs text-slate-500">{product?.sku} · Current stock {product?.current_stock ?? 0}</p></td><td className="p-3"><div className="mx-auto flex w-fit items-center rounded-xl border border-slate-200"><button onClick={() => updateQty(line.product_id, line.quantity - 1)} className="p-2 text-slate-500 hover:bg-slate-100"><Minus className="h-3.5 w-3.5" /></button><input value={line.quantity} onChange={e => updateQty(line.product_id, Number(e.target.value))} className="w-14 border-x border-slate-200 py-2 text-center text-sm font-bold outline-none" /><button onClick={() => updateQty(line.product_id, line.quantity + 1)} className="p-2 text-slate-500 hover:bg-slate-100"><Plus className="h-3.5 w-3.5" /></button></div></td><td className="p-3 text-right"><div className="flex items-center justify-end gap-1"><span className="text-slate-400">₹</span><input value={line.unit_price} onChange={e => updatePrice(line.product_id, e.target.value)} className="w-28 rounded-lg border border-transparent px-2 py-2 text-right font-semibold outline-none hover:border-slate-200 focus:border-violet-400" /></div></td><td className="p-3 text-right font-black">{money(line.quantity * line.unit_price)}</td><td className="p-3"><button onClick={() => setLines(current => current.filter(x => x.product_id !== line.product_id))} className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr> })}</tbody></table></div>}
        </div>
      </section>

      <aside className="h-fit xl:sticky xl:top-4">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Purchase Summary</p><h2 className="mt-1 text-xl font-black">Stock Inward</h2></div>
          <div className="space-y-3 p-5"><div className="flex justify-between text-sm"><span className="text-slate-500">Line items</span><span className="font-semibold">{lines.length}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Total quantity</span><span className="font-semibold">{itemCount}</span></div><div className="border-t border-dashed pt-4"><div className="flex items-end justify-between"><span className="font-bold text-slate-700">Net Purchase</span><span className="text-3xl font-black tracking-tight text-slate-900">{money(total)}</span></div></div></div>
          <div className="border-t border-slate-200 p-5"><button disabled={saving || !lines.length} onClick={() => void save()} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-base font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-40">{saving ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving…</> : <><Check className="h-5 w-5" /> Complete Purchase</>}</button></div>
          <div className="rounded-b-3xl bg-slate-50 px-5 py-3 text-center text-[11px] text-slate-500">Completing the purchase updates stock and records the inventory movement.</div>
        </section>
      </aside>
    </div>

    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5"><div><h2 className="font-bold">Recent Purchases</h2><p className="text-xs text-slate-500">Latest supplier invoices</p></div><ShoppingBag className="h-5 w-5 text-slate-400" /></div>{loading ? <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Invoice</th><th className="p-3">Supplier</th><th className="p-3">Date</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{purchases.slice(0, 15).map(p => <tr key={p.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{p.invoice_no}</td><td className="p-3">{supplierName(p)}</td><td className="p-3 text-slate-500">{new Date(p.created_at).toLocaleString('en-IN')}</td><td className="p-3 text-right font-bold">{money(p.grand_total)}</td><td className="p-3"><span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">{p.status}</span></td></tr>)}</tbody></table>{!purchases.length && <div className="p-10 text-center text-sm text-slate-500">No purchases yet.</div>}</div>}</section>
  </div>
}
