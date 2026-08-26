'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, History, Loader2, Minus, Plus, RefreshCw, Search, ShoppingBag, Trash2, Truck, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Product = { id: string; name: string; sku: string; barcode?: string | null; purchase_price: number; current_stock: number }
type Party = { id: string; party_code?: string; name: string; phone?: string | null; party_type: 'customer' | 'supplier' | 'both' }
type Line = { product_id: string; quantity: number; unit_price: number }
type Purchase = { id: string; invoice_no: string; status: string; grand_total: number; created_at: string; purchased_at?: string | null; party?: Party | Party[] | null }

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Party[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([])
  const [supplier, setSupplier] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [productLoading, setProductLoading] = useState(false)
  const [supplierLoading, setSupplierLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showSupplierResults, setShowSupplierResults] = useState(false)
  const [showProductResults, setShowProductResults] = useState(false)
  const [showVouchers, setShowVouchers] = useState(false)
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
    if (response.ok) {
      setPurchases(result.purchases || [])
      setSelectedPurchaseIds(current => current.filter(id => (result.purchases || []).some((purchase: Purchase) => purchase.id === id)))
    }
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
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) { event.preventDefault(); productInput.current?.focus(); setShowProductResults(true) }
      if (event.key === 'Escape') { setShowSupplierResults(false); setShowProductResults(false); setShowVouchers(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const selectedSupplier = suppliers.find(s => s.id === supplier)
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0), [lines])
  const itemCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines])
  const deletablePurchases = useMemo(() => purchases.filter(purchase => purchase.status === 'draft'), [purchases])
  const allDeletableSelected = deletablePurchases.length > 0 && deletablePurchases.every(purchase => selectedPurchaseIds.includes(purchase.id))

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

  function togglePurchase(id: string) {
    const purchase = purchases.find(item => item.id === id)
    if (!purchase || purchase.status !== 'draft') return toast.error('Only draft purchases can be deleted safely')
    setSelectedPurchaseIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }

  function toggleAllDeletable() {
    setSelectedPurchaseIds(current => allDeletableSelected ? current.filter(id => !deletablePurchases.some(purchase => purchase.id === id)) : Array.from(new Set([...current, ...deletablePurchases.map(purchase => purchase.id)])))
  }

  async function deleteSelectedPurchases() {
    if (!selectedPurchaseIds.length || deleting) return
    const selected = purchases.filter(purchase => selectedPurchaseIds.includes(purchase.id))
    if (!window.confirm(`Delete ${selected.length} selected draft purchase${selected.length === 1 ? '' : 's'}?\n\nCompleted purchases are protected.`)) return
    setDeleting(true)
    try {
      const response = await fetch('/api/purchases', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedPurchaseIds }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to delete selected purchases')
      toast.success(`${result.deleted ?? selectedPurchaseIds.length} purchase${(result.deleted ?? selectedPurchaseIds.length) === 1 ? '' : 's'} deleted`)
      setSelectedPurchaseIds([])
      await loadPurchases()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to delete selected purchases') }
    finally { setDeleting(false) }
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

  const supplierName = (purchase: Purchase) => Array.isArray(purchase.party) ? (purchase.party[0]?.name || 'Walk-in / Other') : (purchase.party?.name || 'Walk-in / Other')
  const purchaseDate = (purchase: Purchase) => new Date(purchase.purchased_at || purchase.created_at).toLocaleDateString('en-IN')
  const latestPurchases = purchases.slice(0, 20)

  return <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-[1680px] flex-col gap-3 pb-28 lg:pb-3">
    <section className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-12 flex-wrap items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-2 pr-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white"><ShoppingBag className="h-4 w-4" /></span><div className="leading-tight"><div className="text-sm font-black text-slate-900">Purchase Invoice</div><div className="text-[10px] text-slate-500">Stock Inward</div></div></div>
        <div className="hidden h-7 w-px bg-slate-200 sm:block" />
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">Live POS</span><span className="hidden text-xs text-slate-400 lg:inline">•</span><span className="hidden text-xs text-slate-500 lg:inline">New Purchase</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setShowVouchers(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-black text-violet-700 hover:bg-violet-100"><History className="h-3.5 w-3.5" />Latest 20 Vouchers</button>
          <span className="hidden rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500 md:inline">Press <b>/</b> for products</span>
          <button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
        </div>
      </div>
    </section>

    <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_250px]">
      <main className="flex min-h-0 min-w-0 flex-col gap-3">
        <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="grid gap-2 lg:grid-cols-[minmax(250px,.7fr)_minmax(0,1.6fr)]">
          <div className="relative"><label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Supplier / Party</label><div className={`flex h-11 items-center gap-2 rounded-xl border px-3 ${showSupplierResults ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200 bg-slate-50'}`}><Truck className="h-4 w-4 shrink-0 text-slate-400" /><input ref={supplierInput} value={selectedSupplier?.name || supplierSearch} onChange={e => { setSupplier(''); setSupplierSearch(e.target.value); setShowSupplierResults(true) }} onFocus={() => setShowSupplierResults(true)} placeholder="Walk-in supplier / name / mobile" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />{supplierLoading && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}{supplier && <button type="button" onClick={() => { setSupplier(''); setSupplierSearch('') }}><X className="h-4 w-4 text-slate-400" /></button>}</div>{showSupplierResults && !supplier && <div className="absolute left-0 right-0 top-[62px] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-64 overflow-y-auto">{suppliers.slice(0, 12).map(s => <button type="button" key={s.id} onMouseDown={e => e.preventDefault()} onClick={() => { setSupplier(s.id); setSupplierSearch(''); setShowSupplierResults(false) }} className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-violet-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-[10px] font-black text-violet-700">{s.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900">{s.name}</span><span className="block truncate text-[10px] text-slate-500">{s.party_code || 'No code'} · {s.phone || 'No mobile'}</span></span></button>)}{!suppliers.length && <div className="p-5 text-center text-xs text-slate-500">No supplier found</div>}</div></div>}</div>
          <div className="relative"><label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Product / Barcode</label><div className={`flex h-11 items-center gap-2 rounded-xl border px-3 ${showProductResults ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200 bg-slate-50'}`}><Search className="h-4 w-4 shrink-0 text-slate-400" /><input ref={productInput} value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowProductResults(true) }} onFocus={() => setShowProductResults(true)} placeholder="Search product, SKU or barcode…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />{productLoading && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}<span className="rounded-md bg-white px-1.5 py-1 text-[10px] font-bold text-slate-400 shadow-sm">/</span></div>{showProductResults && <div className="absolute left-0 right-0 top-[62px] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"><div className="max-h-[52vh] overflow-y-auto">{products.slice(0, 12).map(p => <button type="button" key={p.id} onMouseDown={e => e.preventDefault()} onClick={() => addProduct(p)} className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-violet-50"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><ShoppingBag className="h-4 w-4" /></div><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-900">{p.name}</b><small className="block truncate text-[10px] text-slate-500">{p.sku} · Stock {p.current_stock}</small></span><span className="text-xs font-black">{money(p.purchase_price)}</span><Plus className="h-4 w-4 text-violet-600" /></button>)}{!products.length && <div className="p-6 text-center text-xs text-slate-500">{productSearch ? 'No matching product' : 'Type to search products'}</div>}</div></div>}</div>
        </div></section>

        <section className="flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2.5"><div className="flex items-center gap-2"><h2 className="text-sm font-black text-slate-900">Purchase Items</h2><span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700">{itemCount} Qty</span>{selectedSupplier && <span className="hidden text-[11px] text-slate-500 sm:inline">• {selectedSupplier.name}</span>}</div><button type="button" onClick={() => setLines([])} disabled={!lines.length || saving} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-bold text-rose-600 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Clear</button></div>
          <div className="min-h-0 flex-1 overflow-auto">{lines.length ? <table className="w-full min-w-[700px] text-sm"><thead className="sticky top-0 z-10 bg-white text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]"><tr><th className="w-1/2 px-3 py-2 text-left">Product</th><th className="px-2 py-2 text-center">Qty</th><th className="px-2 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th><th className="w-8" /></tr></thead><tbody className="divide-y divide-slate-100">{lines.map(line => { const product = products.find(p => p.id === line.product_id); return <tr key={line.product_id} className="hover:bg-violet-50/40"><td className="px-3 py-2"><div className="min-w-0"><div className="truncate text-xs font-bold text-slate-900">{product?.name || 'Product'}</div><div className="truncate text-[10px] text-slate-500">{product?.sku || ''}</div></div></td><td className="px-2 py-2"><div className="mx-auto flex h-8 w-[92px] items-center justify-between rounded-lg border border-slate-200 bg-white"><button type="button" onClick={() => updateQty(line.product_id, line.quantity - 1)} className="flex h-full w-7 items-center justify-center text-slate-500 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button><input type="number" min="1" value={line.quantity} onChange={e => updateQty(line.product_id, Number(e.target.value))} className="w-10 bg-transparent text-center text-xs font-black outline-none" /><button type="button" onClick={() => updateQty(line.product_id, line.quantity + 1)} className="flex h-full w-7 items-center justify-center text-violet-600 hover:bg-violet-50"><Plus className="h-3.5 w-3.5" /></button></div></td><td className="px-2 py-2 text-right"><input type="number" min="0" step="0.01" value={line.unit_price} onChange={e => updatePrice(line.product_id, e.target.value)} className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 text-right text-xs font-bold outline-none focus:border-violet-500" /></td><td className="px-3 py-2 text-right text-xs font-black">{money(line.quantity * line.unit_price)}</td><td className="px-2"><button type="button" onClick={() => updateQty(line.product_id, 0)} className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button></td></tr> })}</tbody></table> : <div className="flex h-full min-h-[540px] flex-col items-center justify-center px-6 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><ShoppingBag className="h-7 w-7" /></div><h3 className="mt-3 text-base font-black text-slate-800">Start your purchase</h3><p className="mt-1 max-w-sm text-xs text-slate-500">Search a product above or scan its barcode. Added items will appear here with quantity, rate and amount.</p><button type="button" onClick={() => productInput.current?.focus()} className="mt-4 h-9 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700">Search Products</button></div>}</div>
          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span className="text-slate-500">{lines.length} products · {itemCount} units</span><span className="font-black text-slate-900">Net Purchase <b className="ml-2 text-sm">{money(total)}</b></span></div>
        </section>
      </main>

      <aside className="max-xl:fixed max-xl:bottom-16 max-xl:left-2 max-xl:right-2 max-xl:z-40 xl:sticky xl:top-3 xl:self-start"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg max-xl:shadow-2xl"><div className="flex items-center justify-between bg-violet-700 px-3 py-2.5 text-white"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">Bill Summary</div><div className="mt-0.5 text-xl font-black tracking-tight">{money(total)}</div></div><div className="text-right text-[9px] text-violet-100">{itemCount} items</div></div><div className="hidden space-y-2 px-3 py-3 text-xs xl:block"><div className="flex justify-between"><span className="text-slate-500">Items</span><b>{lines.length}</b></div><div className="flex justify-between"><span className="text-slate-500">Quantity</span><b>{itemCount}</b></div><div className="border-t border-dashed border-slate-200 pt-2"><div className="flex items-end justify-between"><span className="font-bold text-slate-700">Net Purchase</span><span className="text-xl font-black text-violet-700">{money(total)}</span></div></div></div><div className="border-t border-slate-200 p-2.5"><button type="button" disabled={saving || !lines.length} onClick={() => void save()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-black text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Check className="h-4 w-4" />Complete Purchase</>}</button></div></section></aside>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-2 shadow-[0_-4px_18px_rgba(15,23,42,.10)] backdrop-blur sm:hidden"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Net Purchase</p><p className="truncate text-lg font-black text-violet-700">{money(total)} <span className="text-[10px] font-semibold text-slate-400">· {itemCount} qty</span></p></div><button type="button" disabled={saving || !lines.length} onClick={() => void save()} className="min-h-11 shrink-0 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-40">{saving ? 'Saving…' : 'Complete Purchase'}</button></div></div>

    {showVouchers && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"><div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5"><div><h2 className="text-base font-black text-slate-900">Latest 20 Purchase Vouchers</h2><p className="text-[11px] text-slate-500">Newest purchase invoices for this business</p></div><button type="button" onClick={() => setShowVouchers(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="min-h-0 overflow-auto">{loading && !purchases.length ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div> : <table className="w-full min-w-[680px] text-xs"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="w-10 p-2 text-center"><input type="checkbox" checked={allDeletableSelected} onChange={toggleAllDeletable} disabled={!deletablePurchases.length} aria-label="Select all draft purchases" /></th><th className="p-2 text-left">Voucher</th><th className="p-2 text-left">Supplier</th><th className="p-2 text-left">Date</th><th className="p-2 text-right">Amount</th><th className="p-2 text-left">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{latestPurchases.map(p => { const canDelete = p.status === 'draft'; return <tr key={p.id} className={selectedPurchaseIds.includes(p.id) ? 'bg-rose-50/40' : ''}><td className="p-2 text-center"><input type="checkbox" checked={selectedPurchaseIds.includes(p.id)} onChange={() => togglePurchase(p.id)} disabled={!canDelete || deleting} aria-label={`Select ${p.invoice_no}`} /></td><td className="p-2 font-bold">{p.invoice_no}</td><td className="max-w-[180px] truncate p-2">{supplierName(p)}</td><td className="whitespace-nowrap p-2 text-slate-500">{purchaseDate(p)}</td><td className="p-2 text-right font-bold">{money(p.grand_total)}</td><td className="p-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${canDelete ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.status}</span></td></tr> })}</tbody></table>}{!latestPurchases.length && !loading && <div className="p-10 text-center text-sm text-slate-500">No purchase vouchers found.</div>}</div>{selectedPurchaseIds.length > 0 && <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-3"><span className="text-xs font-semibold text-slate-600">{selectedPurchaseIds.length} draft voucher{selectedPurchaseIds.length === 1 ? '' : 's'} selected</span><button type="button" onClick={() => void deleteSelectedPurchases()} disabled={deleting} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{deleting ? 'Deleting…' : 'Delete selected'}</button></div>}</div></div>}
  </div>
}
