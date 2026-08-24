'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, History, PackageCheck, RefreshCw } from 'lucide-react'

type Product = {
  id: string
  sku: string
  name: string
  current_stock: number
  reorder_level: number
  catalog_units?: { short_name?: string } | null
}

type Movement = {
  id: string
  product_id: string
  movement_type: string
  quantity: number
  notes: string | null
  created_at: string
  products?: { name?: string; sku?: string } | null
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [productId, setProductId] = useState('')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    const response = await fetch('/api/inventory', { cache: 'no-store' })
    const data = await response.json()
    if (response.ok) {
      setProducts(data.products ?? [])
      setMovements(data.movements ?? [])
      if (!productId && data.products?.[0]?.id) setProductId(data.products[0].id)
    } else setMessage(data.error ?? 'Unable to load inventory')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selected = useMemo(() => products.find((item) => item.id === productId), [products, productId])
  const lowStock = products.filter((item) => Number(item.current_stock) <= Number(item.reorder_level))

  async function adjust() {
    setMessage('')
    setSaving(true)
    const response = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, direction, quantity, notes }),
    })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) return setMessage(data.error ?? 'Adjustment failed')
    setMessage(`Stock adjusted successfully: ${direction === 'in' ? '+' : '-'}${quantity}`)
    setNotes('')
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Phase 11 · Inventory Control</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Stock & adjustments</h1>
          <p className="mt-1 text-sm text-slate-500">Reconcile physical stock without changing completed sales or purchases.</p>
        </div>
        <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {message && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Active products</p><p className="mt-2 text-3xl font-bold">{products.length}</p></div>
        <div className="rounded-2xl border border-amber-200 bg-white p-5"><p className="text-sm text-slate-500">Low stock</p><p className="mt-2 text-3xl font-bold text-amber-600">{lowStock.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Recent movements</p><p className="mt-2 text-3xl font-bold">{movements.length}</p></div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><PackageCheck className="h-5 w-5" /></span><div><h2 className="font-bold">Manual stock adjustment</h2><p className="text-xs text-slate-500">Use this only after a physical count or reconciliation.</p></div></div>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Product</span><select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-500">Direction</span><select value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="in">Add stock</option><option value="out">Remove stock</option></select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-500">Quantity</span><input type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="md:col-span-3"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Reason / notes</span><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Physical count, damaged goods, correction..." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <div className="flex items-end"><button disabled={saving || !productId} onClick={adjust} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{direction === 'in' ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}{saving ? 'Saving...' : 'Apply adjustment'}</button></div>
        </div>
        {selected && <p className="mt-3 text-xs text-slate-500">Current stock: <span className="font-semibold text-slate-800">{selected.current_stock} {selected.catalog_units?.short_name ?? ''}</span> · Reorder level: {selected.reorder_level}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5"><History className="h-5 w-5 text-slate-500" /><div><h2 className="font-bold">Stock movement history</h2><p className="text-xs text-slate-500">Sales, purchases, voids and manual adjustments.</p></div></div>
        <div className="overflow-x-auto">{loading ? <div className="p-6 text-sm text-slate-500">Loading inventory...</div> : <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Movement</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Notes</th><th className="px-5 py-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{movements.map((movement) => <tr key={movement.id}><td className="px-5 py-3 font-medium">{movement.products?.name ?? 'Product'}<span className="ml-2 text-xs text-slate-400">{movement.products?.sku}</span></td><td className="px-5 py-3 capitalize">{movement.movement_type.replaceAll('_', ' ')}</td><td className="px-5 py-3 font-semibold">{movement.quantity}</td><td className="px-5 py-3 text-slate-500">{movement.notes ?? '—'}</td><td className="whitespace-nowrap px-5 py-3 text-slate-500">{new Date(movement.created_at).toLocaleString()}</td></tr>)}</tbody></table>}</div>
      </section>
    </div>
  )
}
