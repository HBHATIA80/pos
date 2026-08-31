/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react'

type Day = {
  date: string
  sales: number
  purchases: number
  cogs: number
  expenses: number
  otherIncome: number
  grossProfit: number
  netProfit: number
  entries: number
}

type Report = {
  period: { start: string; end: string }
  summary: {
    sales: number
    purchases: number
    expense: number
    costOfGoodsSold: number
    grossProfit: number
    netProfit: number
    debtors: number
    creditors: number
    cash: number
    bank: number
    stock: number
    income: number
    otherIncome?: number
  }
  daily: Day[]
  aging?: { name: string; party_id: string; type: string; amount: number }[]
}

type Detail = { type: string; rows: any[]; summary?: any }

type InvoiceItem = {
  id: string
  product_id: string
  sku: string
  product_name: string
  unit_name: string
  quantity: number
  unit_price: number
  discount_amount: number
  line_total: number
  cost_unit_price?: number | null
}

type Invoice = {
  id: string
  invoice_no: string
  status: string
  subtotal: number
  discount_amount: number
  grand_total: number
  notes?: string | null
  sold_at?: string | null
  purchased_at?: string | null
  completed_at?: string | null
  created_at: string
  party?: { id: string; name: string; phone?: string | null; party_type?: string } | Array<{ id: string; name: string }> | null
  parties?: { id: string; name: string; phone?: string | null; party_type?: string } | null
  sales_invoice_items?: InvoiceItem[]
  purchase_invoice_items?: InvoiceItem[]
}

const money = (value: number, fraction = 0) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: fraction })}`
const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const fullDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function periodDates(days: 7 | 14 | 30) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export default function DashboardAnalytics() {
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [days, setDays] = useState<7 | 14 | 30>(7)
  const [error, setError] = useState('')
  const [detailType, setDetailType] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  async function load(selectedDays = days, silent = false) {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const { start, end } = periodDates(selectedDays)
      const response = await fetch(`/api/accounting/reports?start=${start}&end=${end}`, { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Unable to load dashboard')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load(7)
  }, [])

  const changePeriod = (value: 7 | 14 | 30) => {
    setDays(value)
    void load(value, true)
  }

  const trend = useMemo(() => {
    const rows = data?.daily || []
    const map = new Map(rows.map(row => [row.date, row]))
    const output: Day[] = []
    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date()
      date.setDate(date.getDate() - index)
      const key = date.toISOString().slice(0, 10)
      output.push(map.get(key) || {
        date: key,
        sales: 0,
        purchases: 0,
        cogs: 0,
        expenses: 0,
        otherIncome: 0,
        grossProfit: 0,
        netProfit: 0,
        entries: 0,
      })
    }
    return output
  }, [data, days])

  const totals = useMemo(() => trend.reduce((acc, row) => ({
    sales: acc.sales + row.sales,
    purchases: acc.purchases + row.purchases,
    expenses: acc.expenses + row.expenses,
    gross: acc.gross + row.grossProfit,
    net: acc.net + row.netProfit,
  }), { sales: 0, purchases: 0, expenses: 0, gross: 0, net: 0 }), [trend])

  const maxChart = Math.max(1, ...trend.map(row => Math.max(row.sales, row.purchases)))
  const margin = totals.sales ? (totals.net / totals.sales) * 100 : 0
  const s = data?.summary

  async function openDetails(type: string) {
    setDetailType(type)
    setDetail(null)
    setSelectedInvoice(null)
    setDetailLoading(true)
    try {
      const { start, end } = periodDates(days)
      if (type === 'receivables' || type === 'payables') {
        const response = await fetch(`/api/accounting/reports?start=${start}&end=${end}`, { cache: 'no-store' })
        const json = await response.json()
        if (!response.ok) throw new Error(json.error || 'Unable to load details')
        const wanted = type === 'receivables' ? 'receivable' : 'payable'
        setDetail({ type, rows: (json.aging || []).filter((row: any) => row.type === wanted) })
      } else {
        const response = await fetch(`/api/dashboard/details?type=${type}&start=${start}&end=${end}`, { cache: 'no-store' })
        const json = await response.json()
        if (!response.ok) throw new Error(json.error || 'Unable to load details')
        setDetail(json)
      }
    } catch (e) {
      setDetail({ type, rows: [{ error: e instanceof Error ? e.message : 'Unable to load details' }] })
    } finally {
      setDetailLoading(false)
    }
  }

  function partyName(invoice: Invoice) {
    const party = invoice.party || invoice.parties
    if (Array.isArray(party)) return party[0]?.name || 'Walk-in / Other'
    return party?.name || 'Walk-in / Other'
  }

  if (loading) return <DashboardSkeleton />
  if (error) return (
    <section className="rounded-[24px] border border-red-200 bg-red-50 p-6">
      <p className="font-black text-red-900">Dashboard data unavailable</p>
      <p className="mt-1 text-sm text-red-700">{error}</p>
      <button onClick={() => void load(days)} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-red-200">Try again</button>
    </section>
  )
  if (!data || !s) return null

  return <div className="space-y-5 pb-6">
    <section className="relative overflow-hidden rounded-[28px] border border-emerald-200 bg-gradient-to-br from-[#eaf8ef] via-[#dff4e6] to-[#ccebd7] p-5 shadow-sm sm:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/75 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-emerald-800">
            <Sparkles className="h-3.5 w-3.5" /> Live business pulse
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-[-.035em] text-slate-950 sm:text-3xl">
            <Greeting /> — here&apos;s your business at a glance.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Sales, inventory purchases, operating expenses and profit are shown separately. Stock purchases do not directly reduce Profit &amp; Loss until the goods are sold.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-emerald-100">{fullDate(data.period.start)} – {fullDate(data.period.end)}</span>
            <span className="rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-emerald-100">Live data</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {[7, 14, 30].map(value => (
            <button key={value} onClick={() => changePeriod(value as 7 | 14 | 30)} className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${days === value ? 'bg-slate-950 text-white shadow-sm' : 'bg-white/80 text-slate-700 ring-1 ring-emerald-100 hover:bg-white'}`}>
              {value} days
            </button>
          ))}
          <button onClick={() => void load(days, true)} disabled={refreshing} className="rounded-xl bg-white/80 p-2.5 text-slate-700 ring-1 ring-emerald-100 hover:bg-white disabled:opacity-60" title="Refresh dashboard">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <HeroMetric icon={<ShoppingCart />} label="Sales" value={s.sales} onClick={() => void openDetails('sales')} />
        <HeroMetric icon={<ShoppingBag />} label="Inventory purchases" value={s.purchases} onClick={() => void openDetails('purchases')} />
        <HeroMetric icon={<WalletCards />} label="Operating expenses" value={s.expense} onClick={() => void openDetails('expenses')} />
        <HeroMetric icon={<CircleDollarSign />} label="Gross profit" value={s.grossProfit} tone={s.grossProfit >= 0 ? 'positive' : 'negative'} onClick={() => void openDetails('grossprofit')} />
        <HeroMetric icon={<BarChart3 />} label="Net profit / loss" value={s.netProfit} tone={s.netProfit >= 0 ? 'positive' : 'negative'} onClick={() => void openDetails('netprofit')} />
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={<ArrowUpRight />} label="Receivables" value={s.debtors} hint="Customer money due" tone="green" onClick={() => void openDetails('receivables')} />
      <Kpi icon={<ArrowDownRight />} label="Payables" value={s.creditors} hint="Supplier money due" tone="red" onClick={() => void openDetails('payables')} />
      <Kpi icon={<WalletCards />} label="Cash + Bank" value={s.cash + s.bank} hint="Liquid funds" tone="green" onClick={() => void openDetails('cashbank')} />
      <Kpi icon={<Package />} label="Stock at cost" value={s.stock} hint="Current inventory value" tone="green" onClick={() => void openDetails('stock')} />
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.55fr_.9fr]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-black text-slate-950">Daily sales &amp; purchases</h2></div>
            <p className="mt-1 text-xs text-slate-500">Posted activity for the selected period.</p>
          </div>
          <Link href="/dashboard/analysis" className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">Full analysis <ChevronRight className="h-4 w-4" /></Link>
        </div>

        <div className="mt-6 flex h-[270px] items-end gap-1 overflow-x-auto pb-1">
          {trend.map((row, index) => (
            <div key={row.date} className="group flex min-w-[34px] flex-1 flex-col items-center justify-end gap-2" title={`${row.date} · Sales ${money(row.sales)} · Purchases ${money(row.purchases)} · Net ${money(row.netProfit)}`}>
              <div className="flex h-52 w-full max-w-[46px] items-end gap-1 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-100">
                <div className="w-1/2 rounded-t-md bg-rose-300 transition-all group-hover:bg-rose-400" style={{ height: `${Math.max(row.sales ? 4 : 1, (row.sales / maxChart) * 100)}%` }} />
                <div className="w-1/2 rounded-t-md bg-emerald-300 transition-all group-hover:bg-emerald-400" style={{ height: `${Math.max(row.purchases ? 4 : 1, (row.purchases / maxChart) * 100)}%` }} />
              </div>
              <span className={`text-[9px] font-semibold ${index % 2 ? 'text-slate-300' : 'text-slate-500'}`}>{shortDate(row.date)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-rose-300" /> Sales</span>
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-300" /> Inventory purchases</span>
          <span className="ml-auto">Net <b className={totals.net >= 0 ? 'text-emerald-700' : 'text-red-600'}>{money(totals.net)}</b></span>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-black text-slate-950">Period performance</h2><p className="mt-1 text-xs text-slate-500">Last {days} days</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{margin.toFixed(1)}% net margin</span>
        </div>
        <div className="mt-6 space-y-5">
          <Progress label="Sales" value={totals.sales} max={Math.max(totals.sales, totals.purchases, totals.expenses, 1)} tone="rose" />
          <Progress label="Inventory purchases" value={totals.purchases} max={Math.max(totals.sales, totals.purchases, totals.expenses, 1)} tone="green" />
          <Progress label="Operating expenses" value={totals.expenses} max={Math.max(totals.sales, totals.purchases, totals.expenses, 1)} tone="slate" />
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-600">Gross profit</span><b className={`text-lg font-black ${totals.gross >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{money(totals.gross)}</b></div>
            <p className="mt-1 text-xs text-slate-500">Sales less cost of goods actually sold.</p>
          </div>
          <div className={`rounded-2xl p-4 ${totals.net >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-700">Net profit / loss</span><b className={`text-lg font-black ${totals.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{money(totals.net)}</b></div>
            <p className="mt-1 text-xs text-slate-500">Gross profit + other income − operating expenses.</p>
          </div>
        </div>
      </section>
    </section>

    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-black text-slate-950">Business health</h2></div><p className="mt-1 text-xs text-slate-500">Current balances from the same accounting data used across the dashboard.</p></div>
        <Link href="/dashboard/ledger" className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">Open ledger <ChevronRight className="h-4 w-4" /></Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Health label="Customer receivables" value={s.debtors} hint="Outstanding customer balances" tone="green" />
        <Health label="Supplier payables" value={s.creditors} hint="Outstanding supplier balances" tone="red" />
        <Health label="Inventory value" value={s.stock} hint="Current stock at cost" tone="green" />
      </div>
    </section>

    {detailType && <DetailModal detailType={detailType} detail={detail} loading={detailLoading} selectedInvoice={selectedInvoice} onClose={() => { setDetailType(null); setDetail(null); setSelectedInvoice(null) }} onInvoice={setSelectedInvoice} onBack={() => setSelectedInvoice(null)} onPrint={(invoice) => printInvoice(invoice)} partyName={partyName} />}
  </div>
}

function Greeting() {
  const [text, setText] = useState('Good day')
  useEffect(() => {
    const update = () => {
      const hour = new Date().getHours()
      setText(hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night')
    }
    update()
    const timer = window.setInterval(update, 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return <>{text}</>
}

function HeroMetric({ icon, label, value, tone = 'neutral', onClick }: { icon: ReactNode; label: string; value: number; tone?: 'neutral' | 'positive' | 'negative'; onClick: () => void }) {
  return <button onClick={onClick} className="group rounded-2xl border border-white/70 bg-white/65 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/85">
    <div className="flex items-center justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-100">{icon}</span><ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" /></div>
    <p className="mt-3 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{label}</p>
    <p className={`mt-1 text-xl font-black tracking-tight ${tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-red-600' : 'text-slate-950'}`}>{money(value)}</p>
  </button>
}

function Kpi({ icon, label, value, hint, tone, onClick }: { icon: ReactNode; label: string; value: number; hint: string; tone: 'green' | 'red'; onClick: () => void }) {
  return <button onClick={onClick} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5">
    <div className="flex items-center justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{icon}</span><ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-600" /></div>
    <p className="mt-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{money(value)}</p>
    <p className="mt-1 text-[11px] text-slate-500">{hint} · <span className="font-bold text-emerald-700">View details</span></p>
  </button>
}

function Progress({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'rose' | 'green' | 'slate' }) {
  const width = Math.min(100, Math.max(0, (value / max) * 100))
  const bar = tone === 'rose' ? 'bg-rose-300' : tone === 'green' ? 'bg-emerald-300' : 'bg-slate-300'
  return <div><div className="flex items-center justify-between text-sm"><span className="font-bold text-slate-700">{label}</span><b className="text-slate-950">{money(value)}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} /></div></div>
}

function Health({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: 'green' | 'red' }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-slate-700">{label}</span><span className={`h-2.5 w-2.5 rounded-full ${tone === 'green' ? 'bg-emerald-400' : 'bg-rose-400'}`} /></div><p className="mt-2 text-xl font-black text-slate-950">{money(value)}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></div>
}

function DashboardSkeleton() {
  return <div className="space-y-5"><section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><div className="h-6 w-52 animate-pulse rounded bg-slate-100" /><div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" /><div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div></section><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div><div className="h-80 animate-pulse rounded-[24px] bg-slate-100" /></div>
}

function DetailModal({ detailType, detail, loading, selectedInvoice, onClose, onInvoice, onBack, onPrint, partyName }: { detailType: string; detail: Detail | null; loading: boolean; selectedInvoice: Invoice | null; onClose: () => void; onInvoice: (invoice: Invoice) => void; onBack: () => void; onPrint: (invoice: Invoice) => void; partyName: (invoice: Invoice) => string }) {
  const title = detailType === 'receivables' ? 'Receivables' : detailType === 'payables' ? 'Payables' : detailType === 'cashbank' ? 'Cash & Bank' : detailType === 'stock' ? 'Stock at cost' : detailType === 'grossprofit' ? 'Gross profit' : detailType === 'netprofit' ? 'Net profit / loss' : detailType === 'purchases' ? 'Inventory purchases' : detailType === 'expenses' ? 'Operating expenses' : 'Sales'
  const rows = detail?.rows || []
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-700">Dashboard details</p><h2 className="mt-1 text-xl font-black text-slate-950">{selectedInvoice ? selectedInvoice.invoice_no : title}</h2></div><button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"><X className="h-5 w-5" /></button></div>
      <div className="min-h-0 flex-1 overflow-auto p-5 sm:p-6">
        {selectedInvoice ? <InvoiceDetail invoice={selectedInvoice} partyName={partyName} onBack={onBack} onPrint={onPrint} /> : loading ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : !rows.length ? <div className="rounded-2xl bg-slate-50 p-10 text-center text-sm text-slate-500">No records found for this period.</div> : rows[0]?.error ? <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">{rows[0].error}</div> : <DetailRows type={detailType} rows={rows} onInvoice={onInvoice} />}
      </div>
    </div>
  </div>
}

function DetailRows({ type, rows, onInvoice }: { type: string; rows: any[]; onInvoice: (invoice: Invoice) => void }) {
  if (type === 'sales' || type === 'purchases') return <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="divide-y divide-slate-100">{rows.map((row, index) => { const invoice = row as Invoice; return <button key={invoice.id || index} onClick={() => onInvoice(invoice)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{invoice.invoice_no}</p><p className="mt-1 truncate text-xs text-slate-500">{partyLabel(invoice)} · {formatDateTime(invoice.sold_at || invoice.purchased_at || invoice.created_at)}</p></div><div className="shrink-0 text-right"><p className="text-sm font-black text-slate-950">{money(Number(invoice.grand_total))}</p><span className="text-[10px] font-bold uppercase text-slate-400">{invoice.status}</span></div></button> })}</div></div>
  if (type === 'receivables' || type === 'payables') return <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="grid grid-cols-[1fr_auto] bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500"><span>Party</span><span>Balance</span></div><div className="divide-y divide-slate-100">{rows.map((row, index) => <div key={row.party_id || index} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3"><div><p className="text-sm font-bold text-slate-900">{row.name}</p><p className="text-xs text-slate-500">{type === 'receivables' ? 'Customer' : 'Supplier'}</p></div><b className={type === 'receivables' ? 'text-emerald-700' : 'text-rose-600'}>{money(Number(row.amount))}</b></div>)}</div></div>
  if (type === 'stock') return <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500"><span>Product</span><span>Stock</span><span>Value</span></div><div className="divide-y divide-slate-100">{rows.map((row, index) => <div key={row.product_id || index} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3"><div><p className="text-sm font-bold text-slate-900">{row.name}</p><p className="text-xs text-slate-500">{row.sku || 'No SKU'}</p></div><span className="text-sm text-slate-600">{Number(row.current_stock || 0).toLocaleString('en-IN')}</span><b>{money(Number(row.stock_cost_value || 0))}</b></div>)}</div></div>
  if (type === 'expenses') return <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="divide-y divide-slate-100">{rows.map((row, index) => <div key={row.id || index} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{row.description || row.category || 'Expense'}</p><p className="mt-1 text-xs text-slate-500">{row.expense_no || 'Expense'} · {formatDateTime(row.expense_date)}</p></div><b className="shrink-0 text-rose-600">{money(Number(row.amount))}</b></div>)}</div></div>
  if (type === 'cashbank') return <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="divide-y divide-slate-100">{rows.map((row, index) => <div key={row.id || index} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{row.account || 'Cash / Bank'}</p><p className="mt-1 truncate text-xs text-slate-500">{row.voucher_no || row.narration || 'Ledger entry'} · {formatDateTime(row.entry_date)}</p></div><b className="shrink-0">{money(Number(row.debit || 0) - Number(row.credit || 0))}</b></div>)}</div></div>
  return <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="divide-y divide-slate-100">{rows.map((row, index) => <div key={row.id || index} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{row.invoice_no || row.account || row.description || 'Entry'}</p><p className="mt-1 truncate text-xs text-slate-500">{row.party?.name || row.reference_id || row.description || ''} · {formatDateTime(row.date)}</p></div><b className={Number(row.gross_profit ?? row.netProfit ?? row.amount ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{money(Number(row.gross_profit ?? row.netProfit ?? row.amount ?? 0))}</b></div>)}</div></div>
}

function InvoiceDetail({ invoice, partyName, onBack, onPrint }: { invoice: Invoice; partyName: (invoice: Invoice) => string; onBack: () => void; onPrint: (invoice: Invoice) => void }) {
  const items = invoice.sales_invoice_items || invoice.purchase_invoice_items || []
  const isSale = Boolean(invoice.sales_invoice_items)
  return <div className="space-y-5"><button onClick={onBack} className="text-xs font-black text-emerald-700">← Back to list</button><div className="grid gap-4 sm:grid-cols-3"><Info label="Invoice" value={invoice.invoice_no} /><Info label={isSale ? 'Customer' : 'Supplier'} value={partyName(invoice)} /><Info label="Date" value={formatDateTime(invoice.sold_at || invoice.purchased_at || invoice.created_at)} /></div><div className="overflow-hidden rounded-2xl border border-slate-200"><div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500"><span>Item</span><span>Qty</span><span>Total</span></div><div className="divide-y divide-slate-100">{items.map(item => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3"><div><p className="text-sm font-bold text-slate-900">{item.product_name}</p><p className="text-xs text-slate-500">{item.sku || 'No SKU'} · {money(Number(item.unit_price), 2)} / {item.unit_name || 'unit'}</p></div><span className="text-sm text-slate-600">{item.quantity}</span><b>{money(Number(item.line_total), 2)}</b></div>)}</div></div><div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><p className="text-xs text-slate-500">Status</p><p className="mt-1 text-sm font-black uppercase text-slate-900">{invoice.status}</p></div><div className="text-right"><p className="text-xs text-slate-500">Grand total</p><p className="mt-1 text-2xl font-black text-slate-950">{money(Number(invoice.grand_total), 2)}</p></div></div><button onClick={() => onPrint(invoice)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800">Print invoice</button></div>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p></div> }
function partyLabel(invoice: Invoice) { const party = invoice.party || invoice.parties; if (Array.isArray(party)) return party[0]?.name || 'Walk-in / Other'; return party?.name || 'Walk-in / Other' }
function formatDateTime(value: string | null | undefined) { if (!value) return '—'; return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

function printInvoice(invoice: Invoice) {
  const items = invoice.sales_invoice_items || invoice.purchase_invoice_items || []
  const isSale = Boolean(invoice.sales_invoice_items)
  const party = partyLabel(invoice)
  const lines = items.map(item => `<div class="line"><span>${escapeHtml(item.product_name)} × ${item.quantity}</span><span>₹${Number(item.line_total || 0).toLocaleString('en-IN')}</span></div>`).join('')
  const html = `<!doctype html><html><head><title>${escapeHtml(invoice.invoice_no)}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{margin:0 0 4px;font-size:24px}.head{display:flex;justify-content:space-between;margin-bottom:24px}p{margin:5px 0;color:#555}.line{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:10px 0}.total{font-size:18px;font-weight:700;border-top:2px solid #111;margin-top:12px;padding-top:12px}</style></head><body><div class="head"><div><h1>${isSale ? 'Sales Invoice' : 'Purchase Invoice'}</h1><p>${escapeHtml(invoice.invoice_no)}</p></div><div style="text-align:right"><p>${formatDateTime(invoice.sold_at || invoice.purchased_at || invoice.created_at)}</p><p>${escapeHtml(invoice.status)}</p></div></div><p><b>${isSale ? 'Customer' : 'Supplier'}:</b> ${escapeHtml(party)}</p><div style="margin-top:18px">${lines}</div><div class="total">Total: ₹${Number(invoice.grand_total || 0).toLocaleString('en-IN')}</div><script>window.onload=()=>window.print()</script></body></html>`
  const win = window.open('', '_blank', 'width=800,height=900')
  if (win) { win.document.write(html); win.document.close() }
}
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char)) }
