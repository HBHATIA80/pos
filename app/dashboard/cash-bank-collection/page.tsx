'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Banknote, CalendarDays, RefreshCw, WalletCards } from 'lucide-react'
import { useDashboardRole } from '../dashboard-role-context'

type SalePayment = { id: string; receipt_no: string; payment_method: string; amount: number; paid_at: string; parties?: { name: string } | null; sales_invoices?: { invoice_no: string } | null }
type Voucher = { id: string; voucher_no: string; voucher_type: string; payment_method: string; account_name: string | null; amount: number; paid_at: string; parties?: { name: string } | null }
type Row = { id: string; no: string; source: string; party: string; method: string; account: string; amount: number; paidAt: string }

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10) }
const label = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const localDate = (value: string) => { const d = new Date(value); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10) }

export default function CashBankCollectionPage() {
  const role = useDashboardRole()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState<'1' | '7' | 'custom'>('7')
  const [startDate, setStartDate] = useState(daysAgo(6))
  const [endDate, setEndDate] = useState(today())

  async function load(s = startDate, e = endDate, silent = false) {
    silent ? setRefreshing(true) : setLoading(true)
    try {
      const response = await fetch('/api/vouchers?type=receipt&limit=2000', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Unable to load collections')
      const saleRows = (json.salePayments || []) as SalePayment[]
      const voucherRows = (json.vouchers || []) as Voucher[]
      const mapped: Row[] = [
        ...saleRows.filter(x => x.payment_method === 'cash' || x.payment_method === 'bank').map(x => ({ id: `sale-${x.id}`, no: x.receipt_no, source: 'Sales receipt', party: x.parties?.name || 'Walk-in customer', method: x.payment_method, account: x.payment_method === 'cash' ? 'Cash' : 'Bank', amount: Number(x.amount), paidAt: x.paid_at })),
        ...voucherRows.filter(x => x.voucher_type === 'receipt' && (x.payment_method === 'cash' || x.payment_method === 'bank')).map(x => ({ id: `voucher-${x.id}`, no: x.voucher_no, source: 'Receipt voucher', party: x.parties?.name || 'Other receipt', method: x.payment_method, account: x.account_name || (x.payment_method === 'cash' ? 'Cash' : 'Bank'), amount: Number(x.amount), paidAt: x.paid_at })),
      ]
      setRows(mapped.filter(x => { const d = localDate(x.paidAt); return d >= s && d <= e }).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()))
    } catch { setRows([]) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { void load(daysAgo(6), today()) }, [])

  const totals = useMemo(() => rows.reduce((a, x) => { if (x.method === 'cash') a.cash += x.amount; if (x.method === 'bank') a.bank += x.amount; return a }, { cash: 0, bank: 0 }), [rows])
  const daily = useMemo(() => { const map = new Map<string, { cash: number; bank: number }>(); rows.forEach(x => { const d = localDate(x.paidAt); const current = map.get(d) || { cash: 0, bank: 0 }; if (x.method === 'cash') current.cash += x.amount; else if (x.method === 'bank') current.bank += x.amount; map.set(d, current) }); return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])) }, [rows])

  if (role !== 'admin') return <section className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-6"><h1 className="text-xl font-black text-red-900">Admin access required</h1><p className="mt-1 text-sm text-red-700">Cash / Bank Collection is an admin financial report.</p></section>

  function preset(value: '1' | '7') { const end = today(); const start = value === '1' ? end : daysAgo(6); setRange(value); setStartDate(start); setEndDate(end); void load(start, end, true) }

  return <main className="mx-auto max-w-7xl space-y-5 pb-8">
    <section className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-[#f4fbf6] via-white to-[#e5f5e9] p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-black text-emerald-700 hover:text-emerald-900"><ArrowLeft className="h-4 w-4" /> Dashboard</Link><div className="mt-3 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><WalletCards className="h-6 w-6" /></span><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">Accounts & Finance · Admin</p><h1 className="text-2xl font-black tracking-tight text-slate-950">Cash / Bank Collection</h1></div></div><p className="mt-3 max-w-2xl text-sm text-slate-600">Track money actually received through cash and bank collection, with day-wise totals and a transaction register.</p></div>
        <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200"><button onClick={() => preset('1')} className={`rounded-lg px-3 py-2 text-xs font-black ${range === '1' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>Today</button><button onClick={() => preset('7')} className={`rounded-lg px-3 py-2 text-xs font-black ${range === '7' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>7 Days</button><button onClick={() => setRange('custom')} className={`rounded-lg px-3 py-2 text-xs font-black ${range === 'custom' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>Custom</button></div><button onClick={() => void load(startDate, endDate, true)} disabled={refreshing} className="rounded-xl bg-white p-2.5 text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-yellow-100 disabled:opacity-50"><RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button></div>
      </div>
      {range === 'custom' && <div className="mt-5 grid gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-xs font-black uppercase tracking-wide text-slate-600">From<input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold" /></label><label className="text-xs font-black uppercase tracking-wide text-slate-600">To<input type="date" value={endDate} min={startDate} max={today()} onChange={e => setEndDate(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold" /></label><button onClick={() => void load(startDate, endDate, true)} className="h-10 rounded-xl bg-yellow-400 px-5 text-sm font-black text-slate-950">Apply dates</button></div>}
    </section>

    <section className="grid gap-4 sm:grid-cols-3"><article className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Banknote className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Cash Collection</p><p className="mt-1 text-2xl font-black text-slate-950">{money(totals.cash)}</p></div></div></article><article className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><WalletCards className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Bank Collection</p><p className="mt-1 text-2xl font-black text-slate-950">{money(totals.bank)}</p></div></div></article><article className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-600">Total Collection</p><p className="mt-1 text-3xl font-black text-slate-950">{money(totals.cash + totals.bank)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label(startDate)} – {label(endDate)}</p></article></section>

    <section className="grid gap-5 xl:grid-cols-[.8fr_1.4fr]"><article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-950">Daily collection</h2><p className="text-xs text-slate-500">Cash and bank received each day.</p></div><CalendarDays className="h-5 w-5 text-emerald-700" /></div><div className="mt-5 space-y-2">{daily.length ? daily.map(([date, value]) => <div key={date} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="flex justify-between text-xs font-black"><span>{label(date)}</span><span>{money(value.cash + value.bank)}</span></div><div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-500"><span>Cash {money(value.cash)}</span><span>Bank {money(value.bank)}</span></div></div>) : <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">No cash or bank collections in this period.</p>}</div></article><article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="text-lg font-black text-slate-950">Collection register</h2><p className="text-xs text-slate-500">Every cash/bank receipt included in the selected period.</p></div>{loading ? <div className="mt-5 animate-pulse rounded-2xl bg-slate-100 p-10" /> : <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Receipt</th><th className="p-3 text-left">Party</th><th className="p-3 text-left">Mode</th><th className="p-3 text-left">Account</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(x => <tr key={x.id} className="hover:bg-yellow-50"><td className="p-3 whitespace-nowrap">{new Date(x.paidAt).toLocaleDateString('en-IN')}</td><td className="p-3 font-black">{x.no}<span className="ml-2 text-[10px] font-semibold text-slate-400">{x.source}</span></td><td className="p-3 font-semibold">{x.party}</td><td className="p-3 capitalize">{x.method}</td><td className="p-3">{x.account}</td><td className="p-3 text-right font-black">{money(x.amount)}</td></tr>)}{!rows.length && <tr><td colSpan={6} className="p-10 text-center text-sm font-semibold text-slate-500">No collections found.</td></tr>}</tbody></table></div>}</article></section>
  </main>
}
