'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, BarChart3, CircleDollarSign, Package, RefreshCw, ShoppingCart, WalletCards } from 'lucide-react'

type Day = { date: string; sales: number; purchases: number; expenses: number; grossProfit: number; netProfit: number }
type Report = {
  period: { start: string; end: string }
  summary: { sales: number; purchases: number; expense: number; grossProfit: number; netProfit: number; debtors: number; creditors: number; cash: number; bank: number; stock: number; todaySales?: number; todayGrossProfit?: number; todayNetProfit?: number; todayExpenses?: number }
  daily: Day[]
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const fullDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const todayISO = () => new Date().toISOString().slice(0, 10)
function defaultStart(days: number) { const date = new Date(); date.setDate(date.getDate() - (days - 1)); return date.toISOString().slice(0, 10) }

export default function DashboardPage() {
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState<'7' | '14' | '30' | 'custom'>('7')
  const [startDate, setStartDate] = useState(defaultStart(7))
  const [endDate, setEndDate] = useState(todayISO())
  const [error, setError] = useState('')

  async function load(start = startDate, end = endDate, silent = false) {
    silent ? setRefreshing(true) : setLoading(true); setError('')
    try {
      if (!start || !end || start > end) throw new Error('Please select a valid date range')
      const response = await fetch(`/api/accounting/reports?start=${start}&end=${end}`, { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error || 'Unable to load dashboard')
      setData(json)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load dashboard') }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { void load(defaultStart(7), todayISO()) }, [])
  function selectPreset(days: 7 | 14 | 30) { const start = defaultStart(days); const end = todayISO(); setRange(String(days) as '7' | '14' | '30'); setStartDate(start); setEndDate(end); void load(start, end, true) }
  function applyCustomRange() { setRange('custom'); void load(startDate, endDate, true) }

  const trend = useMemo(() => data?.daily || [], [data])
  const maxValue = Math.max(1, ...trend.map(row => Math.max(row.sales, row.purchases)))
  const s = data?.summary
  const selectedDays = data ? Math.max(1, Math.round((new Date(`${data.period.end}T12:00:00`).getTime() - new Date(`${data.period.start}T12:00:00`).getTime()) / 86400000) + 1) : 7
  const todaySales = Number(s?.todaySales ?? trend.at(-1)?.sales ?? 0)
  const todayGross = Number(s?.todayGrossProfit ?? trend.at(-1)?.grossProfit ?? 0)
  const todayNet = Number(s?.todayNetProfit ?? trend.at(-1)?.netProfit ?? 0)
  const todayExpenses = Number(s?.todayExpenses ?? trend.at(-1)?.expenses ?? 0)
  const margin = s?.sales ? (Number(s.netProfit) / Number(s.sales)) * 100 : 0

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-100" />)}</div>
  if (error || !s || !data) return <section className="rounded-3xl border border-red-200 bg-red-50 p-6"><h2 className="font-black text-red-900">Dashboard data unavailable</h2><p className="mt-1 text-sm text-red-700">{error || 'Unable to load business data.'}</p><button onClick={() => void load()} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-red-200">Try again</button></section>

  return <main className="min-w-0 space-y-5 overflow-x-hidden pb-8">
    <section className="relative overflow-hidden rounded-[30px] border border-emerald-200 bg-gradient-to-br from-[#f4fbf6] via-white to-[#e5f5e9] p-5 shadow-sm sm:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0"><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Admin business dashboard</span><h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Business at a glance</h1><p className="mt-1 max-w-2xl text-sm text-slate-600">Monitor sales, profitability, cash position, working capital and inventory for better decisions.</p><p className="mt-3 text-xs font-bold text-slate-500">{fullDate(data.period.start)} – {fullDate(data.period.end)} · Live data</p></div>
        <div className="flex flex-wrap items-end gap-2"><div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">{[7,14,30].map(value => <button key={value} onClick={() => selectPreset(value as 7 | 14 | 30)} className={`rounded-lg px-3 py-2 text-xs font-black transition ${range === String(value) ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-yellow-100 hover:text-slate-950'}`}>{value}D</button>)}<button onClick={() => setRange('custom')} className={`rounded-lg px-3 py-2 text-xs font-black transition ${range === 'custom' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-yellow-100 hover:text-slate-950'}`}>Custom</button></div><button onClick={() => void load(startDate, endDate, true)} disabled={refreshing} className="rounded-xl bg-white p-2.5 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-yellow-100 hover:text-slate-950 disabled:opacity-60"><RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button></div>
      </div>
      {range === 'custom' && <div className="relative mt-5 flex flex-col gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 sm:flex-row sm:items-end"><label className="flex-1 text-xs font-black uppercase tracking-wide text-slate-600">From<input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" /></label><label className="flex-1 text-xs font-black uppercase tracking-wide text-slate-600">To<input type="date" value={endDate} min={startDate} max={todayISO()} onChange={e => setEndDate(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" /></label><button onClick={applyCustomRange} className="h-10 rounded-xl bg-yellow-400 px-5 text-sm font-black text-slate-950 transition hover:bg-yellow-300">Apply dates</button></div>}
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<ShoppingCart />} label="Today’s Sales" value={todaySales} subtitle="Sales recorded today" tone="amber" /><Metric icon={<CircleDollarSign />} label="Today’s Net Profit" value={todayNet} subtitle={`Gross profit ${money(todayGross)}`} tone={todayNet >= 0 ? 'green' : 'red'} /><Metric icon={<WalletCards />} label="Today’s Expenses" value={todayExpenses} subtitle="Operating expenses today" tone="red" /><Metric icon={<BarChart3 />} label="Net Margin" value={margin} percent subtitle={`${selectedDays}-day business margin`} tone={margin >= 0 ? 'blue' : 'red'} /></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<ArrowUpRight />} label="Receivables" value={s.debtors} subtitle="Customer money due" tone="orange" /><Metric icon={<ArrowDownRight />} label="Payables" value={s.creditors} subtitle="Supplier money due" tone="red" /><Metric icon={<WalletCards />} label="Cash + Bank" value={Number(s.cash) + Number(s.bank)} subtitle={`Cash ${money(s.cash)} · Bank ${money(s.bank)}`} tone="green" /><Metric icon={<Package />} label="Stock at Cost" value={s.stock} subtitle="Current inventory value" tone="green" /></section>

    <section className="grid gap-5 xl:grid-cols-[1.5fr_.9fr]"><section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-black text-slate-950">Sales & purchases</h2></div><p className="mt-1 text-xs text-slate-500">Daily activity for the selected date range.</p></div><span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-500">{selectedDays} days</span></div><div className="mt-7 flex h-64 items-end gap-1 overflow-x-auto pb-1">{trend.map((row, i) => <div key={row.date} className="group flex min-w-[34px] cursor-pointer flex-1 flex-col items-center justify-end gap-2 rounded-xl px-0.5 py-1 transition hover:bg-yellow-100" title={`${row.date}: Sales ${money(row.sales)}, Purchases ${money(row.purchases)}`}><div className="flex h-48 w-full max-w-12 items-end gap-1 rounded-xl bg-slate-50 p-1 transition group-hover:bg-yellow-200"><div className="w-1/2 rounded-t-md bg-amber-300 transition group-hover:bg-yellow-500" style={{ height: `${Math.max(row.sales ? 4 : 1, row.sales / maxValue * 100)}%` }} /><div className="w-1/2 rounded-t-md bg-emerald-300 transition group-hover:bg-yellow-500" style={{ height: `${Math.max(row.purchases ? 4 : 1, row.purchases / maxValue * 100)}%` }} /></div><span className="text-[9px] font-semibold text-slate-500 transition group-hover:font-black group-hover:text-slate-950">{dateLabel(row.date)}</span></div>)}</div><div className="mt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-500"><span>🟨 Sales</span><span>🟩 Purchases</span><span className="ml-auto">Period sales <b className="text-slate-900">{money(s.sales)}</b></span></div></section><section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-black text-slate-950">Decision snapshot</h2><p className="mt-1 text-xs text-slate-500">Numbers worth reviewing for this period.</p><div className="mt-5 space-y-3"><Insight label="Gross profit" value={s.grossProfit} positive={s.grossProfit >= 0} /><Insight label="Net profit" value={s.netProfit} positive={s.netProfit >= 0} /><Insight label="Receivables" value={s.debtors} positive={false} /><Insight label="Payables" value={s.creditors} positive={false} /><Insight label="Inventory" value={s.stock} positive={true} /></div></section></section>

    <section className="grid gap-5 md:grid-cols-3"><ActionCard icon={<ShoppingCart />} title="Sales" text="Review sales and invoices" href="/sales" /><ActionCard icon={<Package />} title="Inventory" text="Review stock and low-stock items" href="/inventory" /><ActionCard icon={<WalletCards />} title="Accounts" text="Review expenses and cash position" href="/accounting" /></section>
  </main>
}

function Metric({ icon, label, value, subtitle, tone, percent = false }: { icon: React.ReactNode; label: string; value: number; subtitle: string; tone: 'amber' | 'green' | 'red' | 'blue' | 'orange'; percent?: boolean }) { const tones = { amber: 'border-amber-200 bg-amber-50 text-amber-700', green: 'border-emerald-200 bg-emerald-50 text-emerald-700', red: 'border-red-200 bg-red-50 text-red-700', blue: 'border-sky-200 bg-sky-50 text-sky-700', orange: 'border-orange-200 bg-orange-50 text-orange-700' }; return <article className={`rounded-[24px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-300 hover:bg-yellow-50 hover:shadow-md ${tones[tone]}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] opacity-75">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{percent ? `${Number(value || 0).toFixed(1)}%` : money(value)}</p><p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80">{icon}</span></div></article> }
function Insight({ label, value, positive }: { label: string; value: number; positive: boolean }) { return <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-yellow-200 hover:bg-yellow-50"><span className="text-sm font-semibold text-slate-600">{label}</span><span className={`font-black ${positive ? 'text-emerald-700' : 'text-slate-950'}`}>{money(value)}</span></div> }
function ActionCard({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) { return <a href={href} className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-300 hover:bg-yellow-50 hover:shadow-md"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-yellow-200 group-hover:text-slate-950">{icon}</span><div><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">{text}</p></div></div><p className="mt-4 text-xs font-black text-emerald-700 group-hover:text-slate-950">Open section →</p></a> }
