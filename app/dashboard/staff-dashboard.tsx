'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Banknote, BarChart3, ChevronRight, CreditCard, Package, RefreshCw, ShoppingCart, WalletCards } from 'lucide-react'

type Day = { date: string; sales: number; cashCollections: number; bankCollections: number; totalCollections: number }
type Payment = { id: string; receipt_no: string | null; payment_method: 'cash' | 'bank'; amount: number; reference_no: string | null; paid_at: string; status: string; invoice_id: string; party_name: string }
type Report = { staff: { name: string; role: string }; period: { start: string; end: string }; today: Day; totals: { sales: number; cash: number; bank: number; collections: number }; daily: Day[]; recentPayments: Payment[] }

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const dateLabel = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const percent = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0

export default function StaffDashboard() {
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
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
    }
  }

  useEffect(() => { void load() }, [])

  const chart = useMemo(() => data?.daily.slice(-7) ?? [], [data])
  const max = Math.max(1, ...chart.map((item) => Math.max(item.sales, item.totalCollections)))

  if (loading) return <StaffDashboardSkeleton />
  if (error) return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <p className="font-black text-amber-950">Staff dashboard unavailable</p>
      <p className="mt-1 text-sm text-amber-800">{error}</p>
      <button onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-950 shadow-sm ring-1 ring-amber-200 hover:bg-amber-100">
        <RefreshCw className="h-4 w-4" /> Try again
      </button>
    </section>
  )
  if (!data) return null

  const today = data.today
  const cashShare = percent(today.cashCollections, today.totalCollections)
  const bankShare = percent(today.bankCollections, today.totalCollections)

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-300" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="relative flex flex-col gap-6 p-5 sm:p-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-emerald-800 ring-1 ring-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Staff workspace
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Live today</span>
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-[-.035em] text-slate-950 sm:text-3xl">Good day, {data.staff.name || 'Team Member'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your counter performance at a glance — sales entered, collections received, and the latest receipts.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">Today&apos;s activity</span>
              <span className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">Last 7 days: {money(data.totals.sales)} sales</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/sales" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition hover:bg-slate-800">
              <ShoppingCart className="h-4 w-4" /> Open POS
            </Link>
            <button onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ShoppingCart />} label="Today&apos;s sales" value={today.sales} tone="red" />
        <Metric icon={<Banknote />} label="Cash collected" value={today.cashCollections} tone="green" />
        <Metric icon={<CreditCard />} label="Bank collected" value={today.bankCollections} tone="blue" />
        <Metric icon={<WalletCards />} label="Total collected" value={today.totalCollections} tone="green" featured />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,.85fr)]">
        <section className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-black text-slate-950">Sales & collections</h2></div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Last 7 days · sales compared with money actually received.</p>
            </div>
            <Link href="/dashboard/sales" className="inline-flex items-center gap-1 self-start text-xs font-black text-emerald-700 hover:text-slate-950">Open POS <ChevronRight className="h-4 w-4" /></Link>
          </div>

          <div className="mt-7 flex h-64 items-end gap-2 overflow-x-auto pb-1">
            {chart.map((item) => (
              <div key={item.date} className="group flex min-w-[48px] flex-1 flex-col items-center justify-end gap-2" title={`${item.date} · Sales ${money(item.sales)} · Collections ${money(item.totalCollections)}`}>
                <div className="flex h-48 w-full max-w-[58px] items-end gap-1 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-100">
                  <div className="w-1/2 rounded-t-md bg-rose-300 transition-all group-hover:bg-rose-400" style={{ height: `${Math.max(item.sales ? 4 : 1, item.sales / max * 100)}%` }} />
                  <div className="w-1/2 rounded-t-md bg-emerald-300 transition-all group-hover:bg-emerald-400" style={{ height: `${Math.max(item.totalCollections ? 4 : 1, item.totalCollections / max * 100)}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-500">{dateLabel(item.date)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-rose-300" /> Sales</span>
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-300" /> Collections</span>
            <span className="sm:ml-auto">7-day sales <b className="text-slate-950">{money(data.totals.sales)}</b></span>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Today</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Collection mix</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">How today&apos;s received money is split between cash and bank.</p>
          </div>

          <div className="mt-7 space-y-6">
            <Split label="Cash" value={today.cashCollections} share={cashShare} total={Math.max(today.totalCollections, 1)} icon={<Banknote />} tone="green" />
            <Split label="Bank" value={today.bankCollections} share={bankShare} total={Math.max(today.totalCollections, 1)} icon={<CreditCard />} tone="blue" />
          </div>

          <div className="mt-7 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-emerald-700">Total collected today</span><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100">100%</span></div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{money(today.totalCollections)}</p>
            <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-500"><span>Sales today</span><b className="text-slate-800">{money(today.sales)}</b></div>
          </div>
        </section>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><div className="flex items-center gap-2"><ReceiptIcon /><h2 className="text-lg font-black text-slate-950">Recent collections</h2></div><p className="mt-1 text-xs text-slate-500">Latest receipts recorded by the POS.</p></div>
          <Link href="/dashboard/sales" className="inline-flex items-center gap-1 self-start rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100">New sale <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="divide-y divide-slate-100">
          {data.recentPayments.length ? data.recentPayments.map((payment) => (
            <div key={payment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${payment.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
                  {payment.payment_method === 'cash' ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                </span>
                <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{payment.party_name}</p><p className="truncate text-xs text-slate-500">{payment.receipt_no || 'Receipt'} · {new Date(payment.paid_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>
              </div>
              <div className="flex items-center justify-between gap-5 sm:justify-end"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${payment.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{payment.payment_method}</span><b className="text-base font-black text-slate-950">{money(payment.amount)}</b></div>
            </div>
          )) : <div className="p-10 text-center text-sm text-slate-500">No collections recorded yet.</div>}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <QuickAction href="/dashboard/sales" icon={<ShoppingCart />} title="Create sale" text="Open the POS and issue a new invoice." />
        <QuickAction href="/dashboard/inventory" icon={<Package />} title="Check inventory" text="Review stock before serving customers." />
        <QuickAction href="/dashboard/parties" icon={<WalletCards />} title="Customer accounts" text="Open customer balances and history." />
      </section>
    </div>
  )
}

function StaffDashboardSkeleton() {
  return <div className="space-y-5"><div className="h-52 animate-pulse rounded-[30px] bg-slate-100" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div><div className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]"><div className="h-[390px] animate-pulse rounded-[28px] bg-slate-100" /><div className="h-[390px] animate-pulse rounded-[28px] bg-slate-100" /></div></div>
}

function Metric({ icon, label, value, tone, featured = false }: { icon: ReactNode; label: string; value: number; tone: 'green' | 'red' | 'blue'; featured?: boolean }) {
  const iconClass = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'blue' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-600'
  return <div className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${featured ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>{icon}</span><p className="mt-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{money(value)}</p></div>
}

function Split({ label, value, share, total, icon, tone }: { label: string; value: number; share: number; total: number; icon: ReactNode; tone: 'green' | 'blue' }) {
  const color = tone === 'green' ? 'text-emerald-700 bg-emerald-300' : 'text-sky-700 bg-sky-300'
  return <div><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-bold text-slate-700"><span className={tone === 'green' ? 'text-emerald-600' : 'text-sky-600'}>{icon}</span>{label}</span><div className="text-right"><b className="text-slate-950">{money(value)}</b><span className="ml-2 text-[11px] font-semibold text-slate-400">{share}%</span></div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color.split(' ')[1]}`} style={{ width: `${Math.min(100, total ? value / total * 100 : 0)}%` }} /></div></div>
}

function QuickAction({ href, icon, title, text }: { href: string; icon: ReactNode; title: string; text: string }) {
  return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">{icon}</span><p className="mt-3 text-sm font-black text-slate-950">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></Link>
}

function ReceiptIcon() {
  return <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><WalletCards className="h-4 w-4" /></span>
}
