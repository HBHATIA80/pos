'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, BarChart3, CircleDollarSign, CreditCard, Package, ReceiptText, RefreshCw, ShoppingBag, ShoppingCart, WalletCards, X } from 'lucide-react'
import ProfitAnalysisModal from './profit-analysis-modal'
import { useDashboardRole } from './dashboard-role-context'

type Day = { date: string; sales: number; purchases: number; expenses: number; grossProfit: number; netProfit: number }
type Report = {
  period: { start: string; end: string }
  summary: { sales: number; purchases: number; expense: number; grossProfit: number; netProfit: number; debtors: number; creditors: number; cash: number; bank: number; stock: number; costOfGoodsSold?: number; operatingExpense?: number; otherIncome?: number; todaySales?: number; todayGrossProfit?: number; todayNetProfit?: number; todayExpenses?: number; todayCogs?: number; todayOtherIncome?: number }
  daily: Day[]
  aging?: { name: string; party_id: string; type: 'receivable' | 'payable'; amount: number }[]
  topExpenses?: { name: string; amount: number }[]
  stock?: { product_id: string; name: string; sku: string | null; current_stock: number; purchase_price: number; sale_price: number; stock_cost_value: number; stock_retail_value: number }[]
}
type CardKey = 'todaySales' | 'todayProfit' | 'todayExpenses' | 'margin' | 'receivables' | 'payables' | 'cash' | 'stock'

const money = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const todayISO = () => new Date().toISOString().slice(0, 10)
const dateLabel = (v: string) => new Date(`${v}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const fullDate = (v: string) => new Date(`${v}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
function defaultStart(days: number) { const d = new Date(); d.setDate(d.getDate() - (days - 1)); return d.toISOString().slice(0, 10) }

export default function DashboardPage() {
  const role = useDashboardRole()
  const isStaff = role === 'staff'
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState<'7' | '14' | '30' | 'custom'>('7')
  const [startDate, setStartDate] = useState(defaultStart(7))
  const [endDate, setEndDate] = useState(todayISO())
  const [error, setError] = useState('')
  const [activeCard, setActiveCard] = useState<CardKey | null>(null)

  async function load(start = startDate, end = endDate, silent = false) {
    silent ? setRefreshing(true) : setLoading(true)
    setError('')
    try {
      if (!start || !end || start > end) throw new Error('Please select a valid date range')
      const response = await fetch(`/api/accounting/reports?start=${start}&end=${end}`, { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error || 'Unable to load dashboard')
      setData(json)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load dashboard') }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { void load(defaultStart(7), todayISO()) }, [])

  const trend = useMemo(() => data?.daily || [], [data])
  const s = data?.summary
  const selectedDays = data ? Math.max(1, Math.round((new Date(`${data.period.end}T12:00:00`).getTime() - new Date(`${data.period.start}T12:00:00`).getTime()) / 86400000) + 1) : 7
  const todaySales = Number(s?.todaySales ?? trend.at(-1)?.sales ?? 0)
  const todayGross = Number(s?.todayGrossProfit ?? trend.at(-1)?.grossProfit ?? 0)
  const todayNet = Number(s?.todayNetProfit ?? trend.at(-1)?.netProfit ?? 0)
  const todayExpenses = Number(s?.todayExpenses ?? trend.at(-1)?.expenses ?? 0)
  const netMargin = s?.sales ? Number(s.netProfit) / Number(s.sales) * 100 : 0
  const maxValue = Math.max(1, ...trend.map(x => Math.max(x.sales, x.purchases)))

  function preset(days: 7 | 14 | 30) { const start = defaultStart(days); const end = todayISO(); setRange(String(days) as typeof range); setStartDate(start); setEndDate(end); void load(start, end, true) }
  function applyCustom() { setRange('custom'); void load(startDate, endDate, true) }

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: isStaff ? 7 : 8 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-100" />)}</div>
  if (!data || !s || error) return <section className="rounded-3xl border border-red-200 bg-red-50 p-6"><h2 className="font-black text-red-900">Dashboard data unavailable</h2><p className="mt-1 text-sm text-red-700">{error || 'Unable to load business data.'}</p><button onClick={() => void load()} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-red-200">Try again</button></section>

  return <>
    <main className="min-w-0 space-y-5 overflow-x-hidden pb-8">
      <section className="relative overflow-hidden rounded-[30px] border border-emerald-200 bg-gradient-to-br from-[#f4fbf6] via-white to-[#e5f5e9] p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">{isStaff ? 'Staff business dashboard' : 'Admin business dashboard'}</span><h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Business at a glance</h1><p className="mt-1 max-w-2xl text-sm text-slate-600">Monitor sales, cash position, working capital and inventory for better decisions.</p><p className="mt-3 text-xs font-bold text-slate-500">{fullDate(data.period.start)} – {fullDate(data.period.end)} · Live data</p></div>
          <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">{[7,14,30].map(v => <button key={v} onClick={() => preset(v as 7|14|30)} className={`rounded-lg px-3 py-2 text-xs font-black transition ${range === String(v) ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-yellow-100 hover:text-emerald-700'}`}>{v}D</button>)}<button onClick={() => setRange('custom')} className={`rounded-lg px-3 py-2 text-xs font-black transition ${range === 'custom' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-yellow-100 hover:text-emerald-700'}`}>Custom</button></div><button onClick={() => void load(startDate, endDate, true)} disabled={refreshing} className="rounded-xl bg-white p-2.5 text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-yellow-100 hover:text-emerald-700 disabled:opacity-50"><RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button></div>
        </div>
        {range === 'custom' && <div className="relative mt-5 grid gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-xs font-black uppercase tracking-wide text-slate-600">From<input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-yellow-400" /></label><label className="text-xs font-black uppercase tracking-wide text-slate-600">To<input type="date" value={endDate} min={startDate} max={todayISO()} onChange={e => setEndDate(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-yellow-400" /></label><button onClick={applyCustom} className="h-10 rounded-xl bg-yellow-400 px-5 text-sm font-black text-slate-950 hover:bg-yellow-300">Apply dates</button></div>}
      </section>

      <section className="dashboard-quick-actions grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <QuickAction href="/dashboard/sales" icon={<ShoppingCart />} title="Sales" subtitle="New sale" />
        <QuickAction href="/dashboard/purchases" icon={<ShoppingBag />} title="Purchase" subtitle="Stock inward" />
        <QuickAction href="/dashboard/receipts" icon={<ReceiptText />} title="Payment Received" subtitle="Receive money" />
        <QuickAction href="/dashboard/payments" icon={<CreditCard />} title="Payment Made" subtitle="Pay supplier / expense" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ShoppingCart />} label="Today’s Sales" value={todaySales} subtitle="Click to review sales performance" tone="amber" onClick={() => setActiveCard('todaySales')} />
        {!isStaff && <Metric icon={<CircleDollarSign />} label="Today’s Net Profit" value={todayNet} subtitle="Click for product, category, invoice & party profit" tone={todayNet >= 0 ? 'green' : 'red'} onClick={() => setActiveCard('todayProfit')} />}
        <Metric icon={<WalletCards />} label="Today’s Expenses" value={todayExpenses} subtitle="Click to review expense drivers" tone="red" onClick={() => setActiveCard('todayExpenses')} />
        <Metric icon={<BarChart3 />} label="Net Margin" value={netMargin} percent subtitle={`${selectedDays}-day business margin`} tone={netMargin >= 0 ? 'blue' : 'red'} onClick={() => setActiveCard('margin')} />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ArrowUpRight />} label="Receivables" value={s.debtors} subtitle="Customer money due" tone="orange" onClick={() => setActiveCard('receivables')} />
        <Metric icon={<ArrowDownRight />} label="Payables" value={s.creditors} subtitle="Supplier money due" tone="red" onClick={() => setActiveCard('payables')} />
        <Metric icon={<WalletCards />} label="Cash + Bank" value={Number(s.cash) + Number(s.bank)} subtitle={`Cash ${money(s.cash)} · Bank ${money(s.bank)}`} tone="green" onClick={() => setActiveCard('cash')} />
        <Metric icon={<Package />} label="Stock at Cost" value={s.stock} subtitle="Current inventory value" tone="green" onClick={() => setActiveCard('stock')} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_.9fr]">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-black text-slate-950">Sales & purchases</h2></div><p className="mt-1 text-xs text-slate-500">Daily activity. Hover a day to see its profit.</p></div><span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-500">{selectedDays} days</span></div><div className="mt-7 flex h-64 items-end gap-1 overflow-x-auto">{trend.map(row => <div key={row.date} className="group flex min-w-[34px] flex-1 flex-col items-center justify-end gap-2 rounded-xl px-0.5 py-1 hover:bg-yellow-100" title={`${row.date}: Sales ${money(row.sales)}, Purchases ${money(row.purchases)}, Net profit ${money(row.netProfit)}`}><div className="flex h-48 w-full max-w-12 items-end gap-1 rounded-xl bg-slate-50 p-1 group-hover:bg-yellow-200"><div className="w-1/2 rounded-t-md bg-amber-300 group-hover:bg-yellow-500" style={{height:`${Math.max(row.sales ? 4 : 1,row.sales/maxValue*100)}%`}}/><div className="w-1/2 rounded-t-md bg-emerald-300 group-hover:bg-yellow-500" style={{height:`${Math.max(row.purchases ? 4 : 1,row.purchases/maxValue*100)}%`}}/></div><span className="text-[9px] font-semibold text-slate-500 group-hover:font-black group-hover:text-emerald-700">{dateLabel(row.date)}</span></div>)}</div><div className="mt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-500"><span>🟨 Sales</span><span>🟩 Purchases</span><span className="ml-auto">Period sales <b className="text-slate-900">{money(s.sales)}</b></span></div></section>
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-black text-slate-950">Decision snapshot</h2><p className="mt-1 text-xs text-slate-500">Numbers worth reviewing first.</p><div className="mt-5 space-y-3"><Insight label="Gross profit" value={s.grossProfit} positive={s.grossProfit >= 0}/><Insight label="Net profit" value={s.netProfit} positive={s.netProfit >= 0}/><Insight label="Receivables" value={s.debtors}/><Insight label="Payables" value={s.creditors}/><Insight label="Inventory" value={s.stock} positive/></div></section>
      </section>
    </main>

    {!isStaff && activeCard === 'todayProfit' && <ProfitAnalysisModal start={data.period.start} end={data.period.end} onClose={() => setActiveCard(null)} />}
    {activeCard && activeCard !== 'todayProfit' && <SimpleDetail card={activeCard} data={data} todaySales={todaySales} todayNet={todayNet} todayExpenses={todayExpenses} margin={netMargin} onClose={() => setActiveCard(null)} />}
  </>
}

function QuickAction({ href, icon, title, subtitle }: { href: string; icon: ReactNode; title: string; subtitle: string }) {
  return <Link href={href} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-300 hover:bg-yellow-50 hover:shadow-md sm:p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition group-hover:bg-yellow-100"><span className="h-5 w-5">{icon}</span></span><span className="min-w-0"><span className="block truncate text-sm font-black text-slate-950">{title}</span><span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">{subtitle}</span></span></Link>
}

function Metric({ icon, label, value, subtitle, tone, percent, onClick }: { icon: ReactNode; label: string; value: number; subtitle: string; tone: 'amber'|'green'|'red'|'blue'|'orange'; percent?: boolean; onClick: () => void }) {
  const tones = { amber:'border-amber-200 bg-amber-50', green:'border-emerald-200 bg-emerald-50', red:'border-red-200 bg-red-50', blue:'border-sky-200 bg-sky-50', orange:'border-orange-200 bg-orange-50' }
  return <button type="button" onClick={onClick} className={`group w-full rounded-[24px] border p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-yellow-300 hover:bg-yellow-50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 ${tones[tone]}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-600">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{percent ? `${value.toFixed(1)}%` : money(value)}</p><p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-emerald-700 transition group-hover:bg-yellow-200">{icon}</span></div><p className="mt-3 text-[10px] font-black uppercase tracking-wide text-emerald-700 opacity-0 transition group-hover:opacity-100">View details →</p></button>
}

function Insight({ label, value, positive }: { label: string; value: number; positive?: boolean }) { return <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-yellow-200 hover:bg-yellow-50"><span className="text-sm font-semibold text-slate-600">{label}</span><span className={`font-black ${positive ? 'text-emerald-700' : 'text-slate-950'}`}>{money(value)}</span></div> }

function SimpleDetail({ card, data, todaySales, todayNet, todayExpenses, margin, onClose }: { card: CardKey; data: Report; todaySales: number; todayNet: number; todayExpenses: number; margin: number; onClose: () => void }) {
  const titles: Record<CardKey,string> = { todaySales:'Today’s Sales', todayProfit:'Today’s Net Profit', todayExpenses:'Today’s Expenses', margin:'Net Margin', receivables:'Receivables', payables:'Payables', cash:'Cash + Bank', stock:'Stock at Cost' }
  const rows = card === 'receivables' ? (data.aging || []).filter(x => x.type === 'receivable') : card === 'payables' ? (data.aging || []).filter(x => x.type === 'payable') : []
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="flex max-h-[calc(100vh-24px)] w-[min(900px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Dashboard detail</p><h2 className="mt-1 text-2xl font-black text-slate-950">{titles[card]}</h2></div><button onClick={onClose} className="rounded-xl bg-emerald-700 p-2 text-white hover:bg-emerald-800"><X className="h-5 w-5"/></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{(card==='todaySales'||card==='todayExpenses'||card==='margin') && <div className="grid gap-3 sm:grid-cols-3"><Box label="Sales" value={todaySales}/><Box label="Expenses" value={todayExpenses}/><Box label="Net margin" value={margin} percent/></div>}{card==='todaySales' && <Note text="Review individual sales invoices from the Sales screen for transaction-level detail."/>}{card==='todayExpenses' && <ExpenseList rows={data.topExpenses || []}/>} {card==='margin' && <Note text={`Net margin is ${margin.toFixed(1)}% for the selected period. Product-level profitability is available from the Net Profit card.`}/>} {(card==='receivables'||card==='payables') && <PartyList rows={rows}/>} {card==='cash' && <div className="grid gap-3 sm:grid-cols-3"><Box label="Cash" value={data.summary.cash}/><Box label="Bank" value={data.summary.bank}/><Box label="Total liquidity" value={Number(data.summary.cash)+Number(data.summary.bank)}/></div>} {card==='stock' && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-black uppercase text-emerald-700">Current stock at cost</p><p className="mt-2 text-3xl font-black">{money(data.summary.stock)}</p><p className="mt-1 text-xs text-slate-500">Open Inventory for full product-level stock detail.</p></div>} {card==='todayProfit' && <div className="text-sm text-slate-500">Profit Analysis opens separately.</div>}</div></div></div>
}
function Box({label,value,percent}:{label:string;value:number;percent?:boolean}){return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{percent?`${value.toFixed(1)}%`:money(value)}</p></div>}
function Note({text}:{text:string}){return <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-slate-700">{text}</div>}
function ExpenseList({rows}:{rows:{name:string;amount:number}[]}){return <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[520px] text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="p-3 text-left">Expense</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(r=><tr key={r.name} className="hover:bg-yellow-50"><td className="p-3 font-semibold">{r.name}</td><td className="p-3 text-right font-black">{money(r.amount)}</td></tr>)}</tbody></table></div>}
function PartyList({rows}:{rows:{name:string;amount:number}[]}){return <div className="max-h-[55vh] overflow-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[520px] text-sm"><thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="p-3 text-left">Party</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(r=><tr key={`${r.name}-${r.amount}`} className="hover:bg-yellow-50"><td className="p-3 font-semibold">{r.name}</td><td className="p-3 text-right font-black">{money(r.amount)}</td></tr>)}</tbody></table></div>}
