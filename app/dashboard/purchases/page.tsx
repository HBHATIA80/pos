'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, History, Loader2, Minus, Plus, RefreshCw, Search, ShoppingBag, Trash2, Truck, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Product = { id: string; name: string; sku: string; barcode?: string | null; purchase_price: number; sale_price: number; current_stock: number }
type Party = { id: string; party_code?: string; name: string; phone?: string | null; party_type: 'customer' | 'supplier' | 'both' }
type Line = { product_id: string; quantity: number; unit_price: number }
type Purchase = { id: string; invoice_no: string; status: string; grand_total: number; created_at: string; purchased_at?: string | null; party?: Party | Party[] | null }

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function PriceChip({ label, value }: { label: string; value: number }) {
  return <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-950 ring-1 ring-slate-200"><span className="text-slate-700">{label}</span> {money(value)}</span>
}

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to search products')
    } finally {
      setProductLoading(false)
    }
  }

  async function searchSuppliers(q: string) {
    setSupplierLoading(true)
    try {
      const response = await fetch(`/api/pos/parties?q=${encodeURIComponent(q)}&limit=30`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to search suppliers')
      setSuppliers((result.parties || []).filter((party: Party) => party.party_type === 'supplier' || party.party_type === 'both'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to search suppliers')
    } finally {
      setSupplierLoading(false)
    }
  }

  async function loadPurchases() {
    try {
      const response = await fetch('/api/purchases', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to load purchases')
      const next = result.purchases || []
      setPurchases(next)
      setSelectedPurchaseIds(current => current.filter(id => next.some((purchase: Purchase) => purchase.id === id)))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load purchases')
    }
  }

  async function load() {
    setLoading(true)
    await Promise.all([searchProducts(''), searchSuppliers(''), loadPurchases()])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    const timer = setTimeout(() => void searchProducts(productSearch), 220)
    return () => clearTimeout(timer)
  }, [productSearch])
  useEffect(() => {
    const timer = setTimeout(() => void searchSuppliers(supplierSearch), 220)
    return () => clearTimeout(timer)
  }, [supplierSearch])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        event.preventDefault()
        productInput.current?.focus()
        setShowProductResults(true)
      }
      if (event.key === 'Escape') {
        setShowSupplierResults(false)
        setShowProductResults(false)
        setShowVouchers(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const selectedSupplier = suppliers.find(supplierItem => supplierItem.id === supplier)
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete selected purchases')
    } finally {
      setDeleting(false)
    }
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
      setLines([])
      setSupplier('')
      setSupplierSearch('')
      await loadPurchases()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save purchase')
    } finally {
      setSaving(false)
    }
  }

  const supplierName = (purchase: Purchase) => Array.isArray(purchase.party) ? (purchase.party[0]?.name || 'Walk-in / Other') : (purchase.party?.name || 'Walk-in / Other')
  const purchaseDate = (purchase: Purchase) => new Date(purchase.purchased_at || purchase.created_at).toLocaleDateString('en-IN')
  const latestPurchases = purchases.slice(0, 20)

  return <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-[1680px] flex-col gap-3 pb-28 lg:pb-3">
    <section className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-12 flex-wrap items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-3 pr-2"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-600 text-white shadow-sm ring-1 ring-slate-700/20"><ShoppingBag className="h-6 w-6 stroke-[2.5]" /></span><div className="leading-tight"><div className="text-base font-black text-black">Purchase Invoice</div><div className="text-[11px] font-bold text-slate-700">Stock Inward</div></div></div>
        <div className="hidden h-7 w-px bg-slate-200 sm:block" />
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-800">Live POS</span><span className="hidden text-xs text-slate-700 lg:inline">•</span><span className="hidden text-xs font-bold text-black lg:inline">New Purchase</span>
        <div className="ml-auto flex items-center gap-2"><button type="button" onClick={() => setShowVouchers(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-black text-black hover:bg-slate-100"><History className="h-4 w-4" />Latest 20 Vouchers</button><span className="hidden rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-black md:inline">Press <b>/</b> for products</span><button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-black hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Refresh</button></div>
      </div>
    </section>

    <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_250px]">
      <main className="flex min-h-0 min-w-0 flex-col gap-3">
        <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="grid gap-2 lg:grid-cols-[minmax(250px,.7fr)_minmax(0,1.6fr)]">
          <div className="relative"><label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black">Supplier / Party</label><div className={`flex h-11 items-center gap-2 rounded-xl border px-3 ${showSupplierResults ? 'border-slate-600 ring-2 ring-slate-200' : 'border-slate-300 bg-slate-50'}`}><Truck className="h-4 w-4 shrink-0 text-black" /><input ref={supplierInput} value={selectedSupplier?.name || supplierSearch} onChange={event => { setSupplier(''); setSupplierSearch(event.target.value); setShowSupplierResults(true) }} onFocus={() => setShowSupplierResults(true)} placeholder="Walk-in supplier / name / mobile" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-black outline-none placeholder:text-slate-600" />{supplierLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-700" />}{supplier && <button type="button" onClick={() => { setSupplier(''); setSupplierSearch('') }}><X className="h-4 w-4 text-black" /></button>}</div>{showSupplierResults && !supplier && <div className="absolute left-0 right-0 top-[64px] z-50 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl"><div className="max-h-64 overflow-y-auto">{suppliers.slice(0, 12).map(item => <button type="button" key={item.id} onMouseDown={event => event.preventDefault()} onClick={() => { setSupplier(item.id); setSupplierSearch(''); setShowSupplierResults(false) }} className="flex w-full items-center gap-2 border-b border-slate-200 px-3 py-3 text-left hover:bg-slate-100"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-black">{item.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-black">{item.name}</span><span className="block truncate text-[11px] font-bold text-slate-700">{item.party_code || 'No code'} · {item.phone || 'No mobile'}</span></span></button>)}{!suppliers.length && <div className="p-5 text-center text-sm font-bold text-black">No supplier found</div>}</div></div>}</div>
          <div className="relative"><label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black">Product / Barcode</label><div className={`flex h-11 items-center gap-2 rounded-xl border px-3 ${showProductResults ? 'border-slate-600 ring-2 ring-slate-200' : 'border-slate-300 bg-slate-50'}`}><Search className="h-5 w-5 shrink-0 text-black" /><input ref={productInput} value={productSearch} onChange={event => { setProductSearch(event.target.value); setShowProductResults(true) }} onFocus={() => setShowProductResults(true)} placeholder="Search product, SKU or barcode…" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-black outline-none placeholder:text-slate-600" />{productLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-700" />}<span className="rounded-md bg-white px-2 py-1 text-[11px] font-black text-black shadow-sm ring-1 ring-slate-200">/</span></div>{showProductResults && <div className="absolute left-0 right-0 top-[64px] z-40 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl"><div className="max-h-[55vh] overflow-y-auto">{products.slice(0, 12).map(product => <button type="button" key={product.id} onMouseDown={event => event.preventDefault()} onClick={() => addProduct(product)} className="w-full border-b border-slate-200 px-3 py-3 text-left hover:bg-slate-100"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><ShoppingBag className="h-5 w-5" /></div><div className="min-w-0 flex-1"><b className="block truncate text-sm font-black text-black">{product.name}</b><span className="mt-0.5 block truncate text-[11px] font-black text-black">SKU: {product.sku} · <span className="text-emerald-800">Qty Available: {product.current_stock}</span></span><div className="mt-2 flex flex-wrap gap-1.5"><PriceChip label="Selling" value={Number(product.sale_price)} /><PriceChip label="Purchase" value={Number(product.purchase_price)} /><PriceChip label="Last Purchase" value={Number(product.purchase_price)} /></div></div><Plus className="h-5 w-5 shrink-0 text-slate-700" /></div></button>)}{!products.length && <div className="p-6 text-center text-sm font-bold text-black">{productSearch ? 'No matching product' : 'Type to search products'}</div>}</div></div>}</div>
        </div></section>

        <section className="flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-3"><div className="flex items-center gap-2"><h2 className="text-base font-black text-black">Purchase Items</h2><span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-black text-black">{itemCount} Qty</span>{selectedSupplier && <span className="hidden text-xs font-bold text-black sm:inline">• {selectedSupplier.name}</span>}</div><button type="button" onClick={() => setLines([])} disabled={!lines.length || saving} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-black text-black disabled:opacity-40"><Trash2 className="h-4 w-4" />Clear</button></div><div className="min-h-0 flex-1 overflow-auto">{lines.length ? <table className="w-full min-w-[700px] text-sm"><thead className="sticky top-0 z-10 bg-white text-[11px] font-black uppercase tracking-wide text-black shadow-[0_1px_0_#cbd5e1]"><tr><th className="w-1/2 px-3 py-3 text-left">Product</th><th className="px-2 py-3 text-center">Qty</th><th className="px-2 py-3 text-right">Rate</th><th className="px-3 py-3 text-right">Amount</th><th className="w-8" /></tr></thead><tbody className="divide-y divide-slate-200">{lines.map(line => { const product = products.find(item => item.id === line.product_id); return <tr key={line.product_id} className="hover:bg-slate-100"><td className="px-3 py-2.5"><div className="min-w-0"><div className="truncate text-sm font-black text-black">{product?.name || 'Product'}</div><div className="truncate text-[11px] font-bold text-black">{product?.sku || ''}</div></div></td><td className="px-2 py-2.5"><div className="mx-auto flex h-8 w-[92px] items-center justify-between rounded-lg border border-slate-300 bg-white"><button type="button" onClick={() => updateQty(line.product_id, line.quantity - 1)} className="flex h-full w-7 items-center justify-center text-black hover:bg-slate-50"><Minus className="h-4 w-4" /></button><input type="number" min="1" value={line.quantity} onChange={event => updateQty(line.product_id, Number(event.target.value))} className="w-10 bg-transparent text-center text-sm font-black text-black outline-none" /><button type="button" onClick={() => updateQty(line.product_id, line.quantity + 1)} className="flex h-full w-7 items-center justify-center text-black hover:bg-slate-50"><Plus className="h-4 w-4" /></button></div></td><td className="px-2 py-2.5 text-right"><input type="number" min="0" step="0.01" value={line.unit_price} onChange={event => updatePrice(line.product_id, event.target.value)} className="h-8 w-24 rounded-lg border border-slate-300 bg-white px-2 text-right text-sm font-black text-black outline-none focus:border-slate-600" /></td><td className="px-3 py-2.5 text-right text-sm font-black text-black">{money(line.quantity * line.unit_price)}</td><td className="px-2"><button type="button" onClick={() => updateQty(line.product_id, 0)} className="rounded-md p-1 text-black hover:bg-rose-50 hover:text-rose-700"><X className="h-4 w-4" /></button></td></tr> })}</tbody></table> : <div className="flex h-full min-h-[540px] flex-col items-center justify-center px-6 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><ShoppingBag className="h-8 w-8" /></div><h3 className="mt-3 text-lg font-black text-black">Start your purchase</h3><p className="mt-1 max-w-sm text-sm font-bold text-slate-700">Search a product above or scan its barcode. Added items will appear here with quantity, rate and amount.</p><button type="button" onClick={() => productInput.current?.focus()} className="mt-4 h-10 rounded-lg bg-slate-700 px-4 text-sm font-black text-white hover:bg-slate-800">Search Products</button></div>}</div><div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><span className="font-bold text-black">{lines.length} products · {itemCount} units</span><span className="font-black text-black">Net Purchase <b className="ml-2 text-base">{money(total)}</b></span></div></section>
      </main>

      <aside className="max-xl:fixed max-xl:bottom-16 max-xl:left-2 max-xl:right-2 max-xl:z-40 xl:sticky xl:top-3 xl:self-start"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg max-xl:shadow-2xl"><div className="flex items-center justify-between bg-slate-700 px-3 py-3 text-white"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-white">Bill Summary</div><div className="mt-0.5 text-xl font-black tracking-tight text-white">{money(total)}</div></div><div className="text-right text-[10px] font-black text-white">{itemCount} items</div></div><div className="hidden space-y-2 px-3 py-3 text-sm xl:block"><div className="flex justify-between"><span className="font-bold text-black">Items</span><b className="text-black">{lines.length}</b></div><div className="flex justify-between"><span className="font-bold text-black">Quantity</span><b className="text-black">{itemCount}</b></div><div className="border-t border-dashed border-slate-300 pt-2"><div className="flex items-end justify-between"><span className="font-black text-black">Net Purchase</span><span className="text-xl font-black text-slate-700">{money(total)}</span></div></div></div><div className="border-t border-slate-200 p-2.5"><button type="button" disabled={saving || !lines.length} onClick={() => void save()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-700 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Check className="h-4 w-4" />Complete Purchase</>}</button></div></section></aside>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-300 bg-white/95 p-2 shadow-[0_-4px_18px_rgba(15,23,42,.10)] backdrop-blur sm:hidden"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wide text-black">Net Purchase</p><p className="truncate text-lg font-black text-slate-700">{money(total)} <span className="text-[11px] font-black text-black">· {itemCount} qty</span></p></div><button type="button" disabled={saving || !lines.length} onClick={() => void save()} className="min-h-11 shrink-0 rounded-xl bg-slate-700 px-4 text-xs font-black text-white disabled:opacity-40">{saving ? 'Saving…' : 'Complete Purchase'}</button></div></div>

    {showVouchers && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"><div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5"><div><h2 className="text-base font-black text-black">Latest 20 Purchase Vouchers</h2><p className="text-xs font-bold text-slate-700">Newest purchase invoices for this business</p></div><button type="button" onClick={() => setShowVouchers(false)} className="rounded-xl p-2 text-black hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="min-h-0 overflow-auto">{loading && !purchases.length ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-slate-700" /></div> : <table className="w-full min-w-[680px] text-sm"><thead className="sticky top-0 bg-slate-100 text-[11px] font-black uppercase tracking-wide text-black"><tr><th className="w-10 p-3 text-center"><input type="checkbox" checked={allDeletableSelected} onChange={toggleAllDeletable} disabled={!deletablePurchases.length} aria-label="Select all draft purchases" /></th><th className="p-3 text-left">Voucher</th><th className="p-3 text-left">Supplier</th><th className="p-3 text-left">Date</th><th className="p-3 text-right">Amount</th><th className="p-3 text-left">Status</th></tr></thead><tbody className="divide-y divide-slate-200">{latestPurchases.map(purchase => { const canDelete = purchase.status === 'draft'; return <tr key={purchase.id} className={selectedPurchaseIds.includes(purchase.id) ? 'bg-rose-50/40' : ''}><td className="p-3 text-center"><input type="checkbox" checked={selectedPurchaseIds.includes(purchase.id)} onChange={() => togglePurchase(purchase.id)} disabled={!canDelete || deleting} aria-label={`Select ${purchase.invoice_no}`} /></td><td className="p-3 font-black text-black">{purchase.invoice_no}</td><td className="max-w-[180px] truncate p-3 font-bold text-black">{supplierName(purchase)}</td><td className="whitespace-nowrap p-3 font-bold text-black">{purchaseDate(purchase)}</td><td className="p-3 text-right font-black text-black">{money(purchase.grand_total)}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${canDelete ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{purchase.status}</span></td></tr> })}</tbody></table>}{!latestPurchases.length && !loading && <div className="p-10 text-center text-sm font-bold text-black">No purchase vouchers found.</div>}</div>{selectedPurchaseIds.length > 0 && <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-3"><span className="text-xs font-bold text-black">{selectedPurchaseIds.length} draft voucher{selectedPurchaseIds.length === 1 ? '' : 's'} selected</span><button type="button" onClick={() => void deleteSelectedPurchases()} disabled={deleting} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-black text-white disabled:opacity-50"><Trash2 className="h-4 w-4" />{deleting ? 'Deleting…' : 'Delete selected'}</button></div>}</div></div>}
  </div>
}
