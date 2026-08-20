'use client'

import { useEffect, useState } from 'react'
import { FileText, RefreshCw, Search, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'

type Invoice = { id: string; invoice_no: string; status: 'draft' | 'completed' | 'void'; grand_total: number; created_at: string; parties?: { id: string; name: string; phone: string | null; party_type: string } | null }
type Payment = { id: string; invoice_id: string; payment_method: 'cash' | 'bank'; amount: number; reference_no: string | null; notes: string | null; paid_at: string; status: 'active' | 'void'; created_at: string }
type Entry = { id: string; type: 'invoice' | 'payment'; date: string; reference: string; description: string; debit: number; credit: number; balance: number }
type Data = { invoice: { id: string; invoice_no: string; status: string; grand_total: number; paid_amount: number; balance_amount: number; payment_status: 'unpaid' | 'partial' | 'paid' }; party: { name?: string; phone?: string | null } | null; payments: Payment[]; ledger: Entry[] }

const money = (v: number) => `₹${Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateTime = (v: string) => new Date(v).toLocaleString()

export default function LedgerPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selected, setSelected] = useState('')
  const [data, setData] = useState<Data | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  async function loadInvoices() {
    setLoading(true)
    try {
      const r = await fetch('/api/sales', { cache: 'no-store' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error ?? 'Unable to load sales')
      const rows = (j.invoices ?? []) as Invoice[]
      setInvoices(rows)
      if (!selected || !rows.some((x) => x.id === selected)) setSelected(rows[0]?.id ?? '')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to load sales') } finally { setLoading(false) }
  }

  async function loadLedger(id: string) {
    if (!id) { setData(null); return }
    setDetailLoading(true)
    try {
      const r = await fetch(`/api/sales/${id}/ledger`, { cache: 'no-store' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error ?? 'Unable to load ledger')
      setData(j as Data)
    } catch (e) { setData(null); toast.error(e instanceof Error ? e.message : 'Unable to load ledger') } finally { setDetailLoading(false) }
  }

  useEffect(() => { void loadInvoices() }, [])
  useEffect(() => { void loadLedger(selected) }, [selected])

  const filtered = invoices.filter((x) => { const q = search.trim().toLowerCase(); return !q || x.invoice_no.toLowerCase().includes(q) || (x.parties?.name ?? '').toLowerCase().includes(q) })

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Phase 7.3 · Sales Ledger</span><h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Sales Ledger & Payment History</h1><p className="mt-2 text-sm text-slate-500">Review invoice balances and payments recorded against each sale.</p></div>
        <button onClick={() => void loadInvoices()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice or customer" className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500" /></div></div>
        <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">{loading ? <div className="p-8 text-center text-sm text-slate-400">Loading sales…</div> : filtered.length ? filtered.map((x) => <button key={x.id} onClick={() => setSelected(x.id)} className={`block w-full p-4 text-left ${selected === x.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}><div className="flex items-center justify-between gap-3"><b className="text-sm text-slate-900">{x.invoice_no}</b><b className="text-sm">{money(x.grand_total)}</b></div><p className="mt-1 text-xs text-slate-500">{x.parties?.name ?? 'Walk-in customer'}</p><p className="mt-1 text-[11px] text-slate-400">{dateTime(x.created_at)}</p></button>) : <div className="p-8 text-center text-sm text-slate-500">No sales found.</div>}</div>
      </section>

      <section className="space-y-5">{detailLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">Loading ledger…</div> : data ? <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase text-slate-400">Invoice</p><p className="mt-1 text-lg font-bold">{money(data.invoice.grand_total)}</p><p className="text-xs text-slate-500">{data.invoice.invoice_no}</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-semibold uppercase text-emerald-600">Paid</p><p className="mt-1 text-lg font-bold text-emerald-700">{money(data.invoice.paid_amount)}</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-[10px] font-semibold uppercase text-amber-600">Balance</p><p className="mt-1 text-lg font-bold text-amber-700">{money(data.invoice.balance_amount)}</p></div><div className="rounded-2xl bg-blue-50 p-4"><p className="text-[10px] font-semibold uppercase text-blue-600">Status</p><p className="mt-1 text-lg font-bold capitalize text-blue-700">{data.invoice.payment_status}</p></div></div>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-blue-600" /><h2 className="font-semibold">Ledger</h2></div><p className="mt-1 text-xs text-slate-500">Invoice debit, payment credits, and running balance.</p></div><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Particular</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-slate-100">{data.ledger.map((e) => <tr key={e.id}><td className="px-4 py-3 text-xs text-slate-500">{dateTime(e.date)}</td><td className="px-4 py-3 font-medium">{e.description}</td><td className="px-4 py-3 text-xs text-slate-500">{e.reference || '—'}</td><td className="px-4 py-3 text-right font-semibold">{e.debit ? money(e.debit) : '—'}</td><td className="px-4 py-3 text-right font-semibold text-emerald-700">{e.credit ? money(e.credit) : '—'}</td><td className="px-4 py-3 text-right font-bold text-blue-700">{money(e.balance)}</td></tr>)}</tbody></table></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><h2 className="font-semibold">Payment History</h2><p className="mt-1 text-xs text-slate-500">Active and void payments remain visible for audit history.</p></div><div className="divide-y divide-slate-100">{data.payments.length ? data.payments.map((p) => <div key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">{p.payment_method}</span>{p.status === 'void' && <span className="ml-2 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">void</span>}<p className="mt-2 text-xs text-slate-500">{dateTime(p.paid_at)}{p.reference_no ? ` · Ref ${p.reference_no}` : ''}</p>{p.notes && <p className="mt-1 text-xs text-slate-400">{p.notes}</p>}</div><b className="text-emerald-700">{money(p.amount)}</b></div>) : <div className="p-8 text-center text-sm text-slate-500">No payments recorded for this invoice.</div>}</div></section>
      </> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><FileText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Select a sale</p></div>}</section>
    </div>
  </div>
}
