'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Banknote, BarChart3, ChevronRight, CreditCard, Package, RefreshCw, ShoppingCart, WalletCards, X } from 'lucide-react'

type Day = { date: string; sales: number; cashCollections: number; bankCollections: number; totalCollections: number }
type Payment = { id: string; receipt_no: string | null; payment_method: 'cash' | 'bank'; amount: number; reference_no: string | null; paid_at: string; status: string; invoice_id: string; party_name: string }
type Report = { staff: { name: string; role: string }; period: { start: string; end: string }; today: Day; totals: { sales: number; cash: number; bank: number; collections: number }; daily: Day[]; recentPayments: Payment[] }
type DetailKey = 'sales' | 'cash' | 'bank' | 'collections'

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const dateLabel = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const dateTime = (s: string) => new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function StaffDashboard() {
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [detailKey, setDetailKey] = useState<DetailKey | null>(null)

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/dashboard/staff-summary', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Unable to load staff dashboard')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load staff dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [])

  const chart = useMemo(() => data?.daily.slice(-7) ?? [], [data])
  const max = Math.max(1, ...chart.map(x => Math.max(x.sales, x.totalCollections)))

  if (loading) return <DashboardSkeleton />
  if (error) return <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6"><p className="font-bold text-amber-900">Staff dashboard unavailable</p><p className="mt-1 text-sm text-amber-700">{error}</p><button onClick={() => void load()} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-amber-900 shadow-sm">Try again</button></section>
  if (!data) return null

  const t = data.today

  return <div className="min-w-0 space-y-5 pb-8">
    <section className="relative overflow-hidden rounded-[30px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 p-5 text-emerald-950 shadow-[0_18px_45px_rgba(22,101,52,.08)] sm:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/70 blur-3xl" />
      <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <span className="inline-flex rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-emerald-800">Staff counter dashboard</span>
          <h1 className="mt-3 break-words text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">Good day, {data.staff.name || 'Team Member'}</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-900/75">A focused workspace for today&apos;s sales, collections and counter activity.</p>
        </div>
        <button onClick={() => void load(true)} disabled={refreshing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white/85 px-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-white disabled:opacity-60"><RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh</button>
      </div>
    </section>

    <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<ShoppingCart />} label="Today&apos;s sales" value={t.sales} tone="red" onClick={() => setDetailKey('sales')} />
      <Metric icon={<Banknote />} label="Cash in hand" value={t.cashCollections} tone="green" onClick={() => setDetailKey('cash')} />
      <Metric icon={<CreditCard />} label="Bank collection" value={t.bankCollections} tone="red" onClick={() => setDetailKey('bank')} />
      <Metric icon={<WalletCards />} label="Total collection" value={t.totalCollections} tone="green" onClick={() => setDetailKey('collections')} />
    </section>

    <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
      <section className="min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 shrink-0 text-emerald-700" /><h2 className="truncate text-lg font-black">Daily sales &amp; collections</h2></div><p className="mt-1 text-xs text-slate-500">Last 7 days · sales compared with money actually received.</p></div><Link href="/dashboard/sales" className="hidden shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 sm:inline-flex">Open POS <ChevronRight className="h-4 w-4" /></Link></div>
        <div className="mt-7 flex h-64 min-w-0 items-end gap-2 overflow-x-auto pb-1">{chart.map(x => <div key={x.date} className="group flex min-w-[52px] flex-1 flex-col items-center justify-end gap-2" title={`${x.date} · Sales ${money(x.sales)} · Collections ${money(x.totalCollections)}`}><div className="flex h-48 w-full max-w-[54px] items-end gap-1 rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-100"><div className="w-1/2 rounded-t-md bg-rose-300" style={{ height: `${Math.max(x.sales ? 4 : 1, x.sales / max * 100)}%` }} /><div className="w-1/2 rounded-t-md bg-emerald-300" style={{ height: `${Math.max(x.totalCollections ? 4 : 1, x.totalCollections / max * 100)}%` }} /></div><span className="text-[10px] font-semibold text-slate-500">{dateLabel(x.date)}</span></div>)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-rose-300" />Sales</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-300" />Collections</span><span className="ml-auto">7-day sales <b className="text-slate-900">{money(data.totals.sales)}</b></span></div>
      </section>

      <section className="min-w-0 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black">Today&apos;s collection split</h2><p className="mt-1 text-xs text-slate-500">Money received against sales invoices.</p>
        <div className="mt-6 space-y-4"><Split label="Cash in hand" value={t.cashCollections} total={Math.max(t.totalCollections, 1)} icon={<Banknote />} tone="green" /><Split label="Bank" value={t.bankCollections} total={Math.max(t.totalCollections, 1)} icon={<CreditCard />} tone="red" /></div>
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-950"><p className="text-xs text-emerald-700">Total collected today</p><p className="mt-1 text-2xl font-black">{money(t.totalCollections)}</p><p className="mt-1 text-[11px] text-emerald-700">Sales today: {money(t.sales)}</p></div>
      </section>
    </section>

    <section className="min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-lg font-black">Recent collections</h2><p className="mt-1 text-xs text-slate-500">Latest receipts recorded by the POS.</p></div><Link href="/dashboard/sales" className="text-xs font-bold text-emerald-700">New sale</Link></div><div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">{data.recentPayments.length ? data.recentPayments.map(p => <div key={p.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{p.payment_method === 'cash' ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{p.party_name}</p><p className="truncate text-xs text-slate-500">{p.receipt_no || 'Receipt'} · {dateTime(p.paid_at)}</p></div></div><div className="flex items-center justify-between gap-5 sm:justify-end"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{p.payment_method}</span><b className="text-base font-black">{money(p.amount)}</b></div></div>) : <div className="p-8 text-center text-sm text-slate-500">No collections recorded yet.</div>}</div></section>

    {detailKey && <DetailModal data={data} detailKey={detailKey} onClose={() => setDetailKey(null)} />}
  </div>
}

function DetailModal({ data, detailKey, onClose }: { data: Report; detailKey: DetailKey; onClose: () => void }) {
  const title = detailKey === 'sales' ? 'Today&apos;s sales' : detailKey === 'cash' ? 'Cash collections' : detailKey === 'bank' ? 'Bank collections' : 'Total collections'
  const value = detailKey === 'sales' ? data.today.sales : detailKey === 'cash' ? data.today.cashCollections : detailKey === 'bank' ? data.today.bankCollections : data.today.totalCollections
  const payments = detailKey === 'cash' ? data.recentPayments.filter(p => p.payment_method === 'cash') : detailKey === 'bank' ? data.recentPayments.filter(p => p.payment_method === 'bank') : data.recentPayments
  const rows = data.daily.slice().reverse()

  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="flex min-h-0 w-full max-w-[1100px] max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Staff dashboard detail</p><h2 className="truncate text-xl font-black text-slate-950">{title}</h2></div><button onClick={onClose} aria-label="Close" className="shrink-0 rounded-xl bg-emerald-700 p-2 text-white hover:bg-emerald-800"><X className="h-5 w-5" /></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3"><Summary label="Today" value={money(value)} /><Summary label="7-day sales" value={money(data.totals.sales)} /><Summary label="7-day collections" value={money(data.totals.collections)} /></div>
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200"><div className="border-b border-slate-100 bg-slate-50 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Daily activity</h3></div><div className="max-h-[280px] overflow-auto"><table className="min-w-[620px] w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">Cash</th><th className="p-3 text-right">Bank</th><th className="p-3 text-right">Collection</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.date}><td className="p-3 font-semibold">{dateLabel(row.date)}</td><td className="p-3 text-right">{money(row.sales)}</td><td className="p-3 text-right">{money(row.cashCollections)}</td><td className="p-3 text-right">{money(row.bankCollections)}</td><td className="p-3 text-right font-black">{money(row.totalCollections)}</td></tr>)}</tbody></table></div></section>
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200"><div className="border-b border-slate-100 bg-slate-50 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Receipt activity</h3></div><div className="max-h-[300px] overflow-auto"><table className="min-w-[760px] w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Receipt</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Method</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.map(p => <tr key={p.id}><td className="p-3 font-semibold">{p.party_name}</td><td className="p-3">{p.receipt_no || '—'}</td><td className="p-3 whitespace-nowrap">{dateTime(p.paid_at)}</td><td className="p-3 uppercase text-xs font-bold">{p.payment_method}</td><td className="p-3 text-right font-black">{money(p.amount)}</td></tr>)}{!payments.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No matching receipt activity.</td></tr>}</tbody></table></div></section>
      </div>
    </div>
  </div>
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div> }
function Metric({ icon, label, value, tone, onClick }: { icon: ReactNode; label: string; value: number; tone: 'green' | 'red'; onClick: () => void }) { const bg = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'; return <button type="button" onClick={onClick} className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>{icon}</span><p className="mt-3 text-[11px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{money(value)}</p><span className="mt-2 block text-[11px] font-bold text-emerald-700 opacity-70 group-hover:opacity-100">View full details →</span></button> }
function Split({ label, value, total, icon, tone }: { label: string; value: number; total: number; icon: ReactNode; tone: 'green' | 'red' }) { return <div><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-bold text-slate-700"><span className={tone === 'green' ? 'text-emerald-600' : 'text-rose-500'}>{icon}</span>{label}</span><b>{money(value)}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone === 'green' ? 'bg-emerald-300' : 'bg-rose-300'}`} style={{ width: `${Math.min(100, value / total * 100)}%` }} /></div></div> }
function DashboardSkeleton() { return <div className="space-y-5"><div className="h-48 animate-pulse rounded-[30px] bg-slate-100" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div><div className="h-80 animate-pulse rounded-[26px] bg-slate-100" /></div> }
