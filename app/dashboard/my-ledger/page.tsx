'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'

type Item = { id: string; product_name: string; sku: string; quantity: number; unit_price: number; line_total: number }
type Purchase = { id: string; invoice_no: string; date: string; status: string; grand_total: number; paid_amount: number; balance_amount: number; items: Item[] }
type Entry = { id: string; type: 'purchase' | 'payment'; date: string; reference: string; description: string; debit: number; credit: number; balance: number }
type LedgerData = { customer: { name: string }; summary: { purchase_count: number; purchase_total: number; paid_total: number; outstanding_total: number }; purchases: Purchase[]; entries: Entry[] }

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function MyLedgerPage() {
  const [data, setData] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const response = await fetch('/api/customer/ledger', { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(body.error ?? 'Unable to load ledger')
      setLoading(false)
      return
    }
    setData(body)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  return <div className="mx-auto max-w-7xl space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Customer Portal · Ledger</span><h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">My Ledger</h1><p className="mt-2 text-sm text-slate-500">Delivered purchases enter this ledger. Payments reduce the outstanding balance.</p></div>
        <div className="flex gap-2"><Link href="/dashboard/orders" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Shop & Orders</Link><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
      </div>
    </section>

    {loading ? <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading ledger…</section> : data ? <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p><p className="mt-2 font-semibold text-slate-900">{data.customer.name}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Delivered purchases</p><p className="mt-2 text-2xl font-bold text-slate-900">{data.summary.purchase_count}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purchase total</p><p className="mt-2 text-2xl font-bold text-slate-900">{money(data.summary.purchase_total)}</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Outstanding</p><p className="mt-2 text-2xl font-bold text-blue-700">{money(data.summary.outstanding_total)}</p></div></section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4"><WalletCards className="h-5 w-5 text-blue-600" /><h2 className="font-semibold text-slate-900">Running ledger</h2></div>{!data.entries.length ? <div className="p-10 text-center text-sm text-slate-500">No delivered purchases have entered your ledger yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Description</th><th className="px-5 py-3 text-right">Debit</th><th className="px-5 py-3 text-right">Credit</th><th className="px-5 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-slate-100">{data.entries.map((entry) => <tr key={entry.id}><td className="px-5 py-3 text-slate-500">{new Date(entry.date).toLocaleString()}</td><td className="px-5 py-3 font-medium text-slate-900">{entry.reference || '—'}</td><td className="px-5 py-3">{entry.description}</td><td className="px-5 py-3 text-right font-medium">{entry.debit ? money(entry.debit) : '—'}</td><td className="px-5 py-3 text-right font-medium text-green-700">{entry.credit ? money(entry.credit) : '—'}</td><td className="px-5 py-3 text-right font-bold">{money(entry.balance)}</td></tr>)}</tbody></table></div>}</section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Previous purchases</h2><p className="mt-1 text-xs text-slate-500">Only delivered customer orders appear here.</p></div>{!data.purchases.length ? <div className="p-10 text-center text-sm text-slate-500">No delivered purchases yet.</div> : <div className="divide-y divide-slate-100">{data.purchases.map((purchase) => <div key={purchase.id} className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{purchase.invoice_no}</p><p className="mt-1 text-xs text-slate-500">{new Date(purchase.date).toLocaleString()} · {purchase.status}</p></div><div className="text-left sm:text-right"><p className="font-bold text-slate-900">{money(purchase.grand_total)}</p><p className="text-xs text-slate-500">Paid {money(purchase.paid_amount)} · Balance {money(purchase.balance_amount)}</p></div></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{purchase.items.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-medium text-slate-900">{item.product_name}</p><p className="mt-1 text-xs text-slate-500">{item.sku} · Qty {Number(item.quantity)} · {money(item.unit_price)}</p></div>)}</div></div>)}</div>}</section>
    </> : null}
  </div>
}
