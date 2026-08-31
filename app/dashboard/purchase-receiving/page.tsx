'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, ClipboardCheck, PackageCheck, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { ScrollPanel, SplitPane } from '../ui/LayoutPrimitives'
import styles from './purchase-receiving.module.css'

type Item = { id: string; product_id: string; product_name: string; sku: string; unit_name: string; quantity: number; unit_price: number; line_total: number }
type ReceiptItem = { id: string; purchase_invoice_item_id: string; expected_quantity: number; received_quantity: number; notes?: string | null }
type Receipt = { id: string; status: 'pending' | 'verified' | 'partial' | 'rejected'; received_by?: string | null; received_at?: string | null; notes?: string | null; updated_at: string; items?: ReceiptItem[] }
type Party = { id: string; name: string; phone?: string | null }
type Purchase = { id: string; invoice_no: string; status: string; grand_total: number; purchased_at?: string | null; created_at: string; party?: Party | Party[] | null; items: Item[]; receipt?: Receipt | Receipt[] | null }

type CheckRow = { expected: number; received: number; notes: string }
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const partyName = (purchase: Purchase) => Array.isArray(purchase.party) ? (purchase.party[0]?.name || 'Walk-in / Other') : (purchase.party?.name || 'Walk-in / Other')
const receiptOf = (purchase: Purchase) => Array.isArray(purchase.receipt) ? purchase.receipt[0] : purchase.receipt

export default function PurchaseReceivingPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selected, setSelected] = useState<Purchase | null>(null)
  const [rows, setRows] = useState<Record<string, CheckRow>>({})
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/purchase-receiving', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to load purchase receiving records')
      const nextPurchases = (result.purchases || []) as Purchase[]
      setPurchases(nextPurchases)
      if (selected) setSelected(nextPurchases.find(p => p.id === selected.id && receiptOf(p)?.status !== 'verified') || null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load records') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const pendingPurchases = useMemo(() => purchases.filter(purchase => receiptOf(purchase)?.status !== 'verified'), [purchases])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pendingPurchases
    return pendingPurchases.filter(p => `${p.invoice_no} ${partyName(p)}`.toLowerCase().includes(q))
  }, [pendingPurchases, query])

  const pendingCount = pendingPurchases.length

  function openPurchase(purchase: Purchase) {
    const receipt = receiptOf(purchase)
    const existing = new Map((receipt?.items || []).map(item => [item.purchase_invoice_item_id, item]))
    const next: Record<string, CheckRow> = {}
    purchase.items.forEach(item => { const saved = existing.get(item.id); next[item.id] = { expected: Number(item.quantity), received: saved ? Number(saved.received_quantity) : Number(item.quantity), notes: saved?.notes || '' } })
    setRows(next)
    setNotes(receipt?.notes || '')
    setSelected(purchase)
  }

  function updateReceived(id: string, value: string) {
    const parsed = value === '' ? 0 : Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) return
    setRows(current => ({ ...current, [id]: { ...current[id], received: parsed } }))
  }

  function setAll(value: number | 'expected') {
    setRows(current => Object.fromEntries(Object.entries(current).map(([id, row]) => [id, { ...row, received: value === 'expected' ? row.expected : value }])))
  }

  async function save() {
    if (!selected || saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/purchase-receiving', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_id: selected.id, items: Object.entries(rows).map(([purchase_invoice_item_id, row]) => ({ purchase_invoice_item_id, received_quantity: row.received, notes: row.notes || null })), notes: notes || null }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to save receiving record')
      const verified = result.receipt?.status === 'verified'
      toast.success(verified ? 'Physical receiving verified' : 'Receiving record saved')
      if (verified) {
        setSelected(null)
        setRows({})
        setNotes('')
      }
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save receiving record') }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-[1296px] space-y-[18px] pb-24">
    <section className={`${styles.receivingHero} rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 shadow-sm`}>
      <div className="flex min-h-[66px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3"><span className={`${styles.receivingHeroIcon} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100`}><ClipboardCheck className="h-6 w-6" /></span><div className="min-w-0"><h1 className="text-2xl font-black text-slate-950">Purchase Receiving</h1><p className="mt-0.5 text-sm font-semibold text-slate-950">Check the physical goods against every purchase voucher and keep a receiving record.</p></div></div>
        <div className="flex shrink-0 items-center gap-2"><span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-slate-950">{pendingCount} not verified</span><button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 shadow-sm hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Refresh</button></div>
      </div>
    </section>

    <SplitPane className={`${styles.receivingLayout} grid-cols-[minmax(0,1fr)_540px] gap-4`}>
      <section className={`${styles.receivingList} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}>
        <div className="flex h-[72px] items-center justify-between gap-3 border-b border-slate-200 px-4"><div><h2 className="text-lg font-black text-slate-950">Purchase Vouchers</h2><p className="text-xs font-semibold text-slate-950">Verify quantity received before closing the physical check.</p></div><div className="flex h-10 w-72 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 shrink-0 text-slate-950" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search invoice or supplier" className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-500" /></div></div>
        <ScrollPanel className={`${styles.receivingListBody} max-h-[calc(100vh-300px)]`}>
          {loading ? <div className="p-10 text-center text-sm font-bold text-slate-950">Loading purchase vouchers…</div> : !filtered.length ? <div className="p-10 text-center text-sm font-bold text-slate-950">No purchase vouchers found.</div> : <div>{filtered.map(purchase => { const receipt = receiptOf(purchase); return <button key={purchase.id} onClick={() => openPurchase(purchase)} className={`${styles.receivingRow} flex w-full items-center gap-3 border-b border-slate-100 bg-white px-3 py-3 text-left transition hover:bg-emerald-50/50 ${selected?.id === purchase.id ? 'bg-emerald-50 ring-inset ring-2 ring-emerald-200' : ''}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600"><ShieldAlert className="h-[18px] w-[18px]" /></span><span className="min-w-0 flex-1"><span className="flex min-w-0 flex-wrap items-center gap-2"><span className={`${styles.receivingRowInvoice} shrink-0 text-[15px] font-black`}>{purchase.invoice_no}</span><span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">Not checked</span></span><span className={`${styles.receivingRowMeta} mt-0.5 block text-xs font-semibold`}>{partyName(purchase)} · {new Date(purchase.purchased_at || purchase.created_at).toLocaleDateString('en-IN')}</span></span><span className="flex shrink-0 items-center gap-2 text-right"><span><span className="block text-sm font-black text-slate-950">{money(purchase.grand_total)}</span><span className="block text-[10px] font-black uppercase text-slate-950">{receipt?.status === 'partial' ? 'Partial' : 'Not checked'}</span></span><ChevronRight className="h-5 w-5 text-slate-950" /></span></button> })}</div>}
        </ScrollPanel>
      </section>

      <section className={`${styles.receivingDetail} rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-20 xl:self-start`}>
        {!selected ? <div className="flex min-h-[410px] flex-col items-center justify-center p-8 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><PackageCheck className="h-8 w-8" /></span><h2 className="mt-4 text-xl font-black text-slate-950">Select a purchase voucher</h2><p className="mt-1 max-w-sm text-sm font-semibold text-slate-950">Check the physical quantity received and save the verification record.</p></div> : <div><div className="border-b border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Physical Receiving</p><h2 className="mt-1 text-xl font-black text-slate-950">{selected.invoice_no}</h2><p className="text-xs font-semibold text-slate-950">{partyName(selected)} · {money(selected.grand_total)}</p></div><span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${receiptOf(selected)?.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{receiptOf(selected)?.status === 'verified' ? 'Verified' : 'Not verified'}</span></div></div><ScrollPanel className={styles.receivingDetailBody}><div className="p-4"><div className="mb-3 flex flex-wrap gap-2"><button onClick={() => setAll('expected')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm">Set all as received</button><button onClick={() => setAll(0)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm">Set all to 0</button></div><div className="overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[minmax(0,1fr)_92px_92px] bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-950"><span>Product</span><span className="text-center">Invoice Qty</span><span className="text-center">Received</span></div><div className="divide-y divide-slate-100">{selected.items.map(item => { const row = rows[item.id] || { expected: Number(item.quantity), received: Number(item.quantity), notes: '' }; const mismatch = row.received !== row.expected; return <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_92px_92px] items-center gap-2 px-3 py-3"><div className="min-w-0"><p className={`${styles.receivingProductName} truncate text-sm font-black`}>{item.product_name}</p><p className="text-[11px] font-semibold text-slate-950">{item.sku} · {item.unit_name}</p>{mismatch && <p className="mt-1 text-[10px] font-black text-amber-700">Difference: {row.received - row.expected}</p>}</div><div className="text-center text-sm font-black text-slate-950">{row.expected}</div><input type="number" min="0" step="any" value={row.received} onChange={e => updateReceived(item.id, e.target.value)} className={`h-10 w-full rounded-lg border px-2 text-center text-sm font-black text-slate-950 outline-none ${mismatch ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-white'}`} /></div> })}</div></div><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Receiving notes (short/excess/damaged items, etc.)" className="mt-3 min-h-20 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-500" /><button disabled={saving} onClick={() => void save()} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white shadow-sm disabled:opacity-60"><CheckCircle2 className="h-5 w-5" />{saving ? 'Saving…' : 'Save Physical Receiving'}</button></div></ScrollPanel></div>}
      </section>
    </SplitPane>
  </div>
}
