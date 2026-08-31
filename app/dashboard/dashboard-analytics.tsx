/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, BarChart3, ChevronRight, CircleDollarSign, Package, RefreshCw, ShoppingBag, ShoppingCart, Sparkles, WalletCards, X } from 'lucide-react'

type Day = { date: string; sales: number; purchases: number; cogs: number; expenses: number; otherIncome: number; grossProfit: number; netProfit: number; entries: number }
type Report = { period: { start: string; end: string }; summary: { sales: number; purchases: number; expense: number; costOfGoodsSold: number; grossProfit: number; netProfit: number; debtors: number; creditors: number; cash: number; bank: number; stock: number; income: number; otherIncome?: number; todaySales?: number; todayGrossProfit?: number; todayNetProfit?: number; todayExpenses?: number; todayCogs?: number; todayOtherIncome?: number }; daily: Day[]; aging?: { name: string; party_id: string; type: string; amount: number }[] }
type Detail = { type: string; rows: any[]; summary?: any }
type InvoiceItem = { id: string; product_id: string; sku: string; product_name: string; unit_name: string; quantity: number; unit_price: number; discount_amount: number; line_total: number; cost_unit_price?: number | null }
type Invoice = { id: string; invoice_no: string; status: string; subtotal: number; discount_amount: number; grand_total: number; notes?: string | null; sold_at?: string | null; created_at: string; party?: any; parties?: any; sales_invoice_items?: InvoiceItem[] }

const money = (value: number, fraction = 0) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: fraction, maximumFractionDigits: fraction })}`
const quantity = (value: number) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })
const fullDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function periodDates(days: 7 | 14 | 30) { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - (days - 1)); return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) } }

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
    if (silent) setRefreshing(true); else setLoading(true); setError('')
    try { const { start, end } = periodDates(selectedDays); const response = await fetch(`/api/accounting/reports?start=${start}&end=${end}`, { cache: 'no-store' }); const json = await response.json(); if (!response.ok) throw new Error(json.error || 'Unable to load dashboard'); setData(json) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load dashboard') }
    finally { setLoading(false); setRefreshing(false) }
  }
  useEffect(() => { void load(7) }, [])
  const changePeriod = (value: 7 | 14 | 30) => { setDays(value); void load(value, true) }

  const trend = useMemo(() => { const rows = data?.daily || []; const map = new Map(rows.map(row => [row.date, row])); const output: Day[] = []; for (let index = days - 1; index >= 0; index -= 1) { const date = new Date(); date.setDate(date.getDate() - index); const key = date.toISOString().slice(0, 10); output.push(map.get(key) || { date: key, sales: 0, purchases: 0, cogs: 0, expenses: 0, otherIncome: 0, grossProfit: 0, netProfit: 0, entries: 0 }) } return output }, [data, days])
  const totals = useMemo(() => trend.reduce((a, r) => ({ sales: a.sales + r.sales, purchases: a.purchases + r.purchases, expenses: a.expenses + r.expenses, gross: a.gross + r.grossProfit, net: a.net + r.netProfit }), { sales: 0, purchases: 0, expenses: 0, gross: 0, net: 0 }), [trend])
  const maxChart = Math.max(1, ...trend.map(row => Math.max(row.sales, row.purchases)))
  const s = data?.summary

  async function openDetails(type: string) {
    setDetailType(type); setDetail(null); setSelectedInvoice(null); setDetailLoading(true)
    try { const { start, end } = periodDates(days); if (type === 'receivables' || type === 'payables') { const response = await fetch(`/api/accounting/reports?start=${start}&end=${end}`, { cache: 'no-store' }); const json = await response.json(); if (!response.ok) throw new Error(json.error || 'Unable to load details'); const wanted = type === 'receivables' ? 'receivable' : 'payable'; setDetail({ type, rows: (json.aging || []).filter((row: any) => row.type === wanted) }) } else { const response = await fetch(`/api/dashboard/details?type=${type}&start=${start}&end=${end}`, { cache: 'no-store' }); const json = await response.json(); if (!response.ok) throw new Error(json.error || 'Unable to load details'); setDetail(json) } }
    catch (e) { setDetail({ type, rows: [{ error: e instanceof Error ? e.message : 'Unable to load details' }] }) }
    finally { setDetailLoading(false) }
  }
  const partyName = (invoice: Invoice) => { const party = invoice.party || invoice.parties; if (Array.isArray(party)) return party[0]?.name || 'Walk-in / Other'; return party?.name || 'Walk-in / Other' }

  if (loading) return <DashboardSkeleton />
  if (error) return <section className="rounded-[26px] border border-red-200 bg-red-50 p-6"><p className="font-black text-red-900">Dashboard data unavailable</p><p className="mt-1 text-sm text-red-700">{error}</p><button onClick={() => void load(days)} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 ring-1 ring-red-200">Try again</button></section>
  if (!data || !s) return null

  const todayProfit = Number(s.todayNetProfit ?? trend.find(row => row.date === data.period.end)?.netProfit ?? 0)
  const todayGross = Number(s.todayGrossProfit ?? trend.find(row => row.date === data.period.end)?.grossProfit ?? 0)

  return <div className="space-y-5 pb-8">
    <section className="relative overflow-hidden rounded-[30px] border border-emerald-200 bg-gradient-to-br from-[#f0fbf4] via-[#e2f5e8] to-[#ccebd8] p-5 shadow-[0_14px_40px_rgba(22,101,52,.08)] sm:p-7">
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/80 blur-3xl" /><div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-emerald-800"><Sparkles className="h-3.5 w-3.5" /> Live business pulse</span><h1 className="mt-4 text-2xl font-black tracking-[-.04em] text-slate-950 sm:text-[32px]"><Greeting /> — here&apos;s your business at a glance.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Sales, inventory purchases, operating expenses and profit are separated correctly. Profit uses moving weighted-average purchase cost from completed purchases.</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600"><span className="rounded-full bg-white/85 px-3 py-1.5 ring-1 ring-emerald-100">{fullDate(data.period.start)} – {fullDate(data.period.end)}</span><span className="rounded-full bg-white/85 px-3 py-1.5 ring-1 ring-emerald-100">Live data</span></div></div><div className="flex shrink-0 flex-wrap gap-2">{[7,14,30].map(value => <button key={value} onClick={() => changePeriod(value as 7 | 14 | 30)} className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${days === value ? 'bg-slate-950 text-white shadow-md' : 'bg-white/90 text-slate-800 ring-1 ring-emerald-100 hover:bg-slate-950 hover:text-white'}`}>{value} days</button>)}<button onClick={() => void load(days, true)} disabled={refreshing} className="rounded-xl bg-white/90 p-2.5 text-slate-800 ring-1 ring-emerald-100 transition hover:bg-slate-950 hover:text-white disabled:opacity-60" title="Refresh dashboard"><RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button></div></div>
      <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><HeroMetric icon={<ShoppingCart />} label="Sales" value={s.sales} onClick={() => void openDetails('sales')} /><HeroMetric icon={<ShoppingBag />} label="Inventory purchases" value={s.purchases} onClick={() => void openDetails('purchases')} /><HeroMetric icon={<WalletCards />} label="Operating expenses" value={s.expense} onClick={() => void openDetails('expenses')} /><HeroMetric icon={<CircleDollarSign />} label="Gross profit" value={s.grossProfit} tone={s.grossProfit >= 0 ? 'positive' : 'negative'} onClick={() => void openDetails('grossprofit')} /><HeroMetric icon={<BarChart3 />} label="Net profit / loss" value={s.netProfit} tone={s.netProfit >= 0 ? 'positive' : 'negative'} onClick={() => void openDetails('netprofit')} /></div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Kpi icon={<CircleDollarSign />} label="Today&apos;s profit" value={todayProfit} hint={`Gross profit ${money(todayGross)}`} tone={todayProfit >= 0 ? 'green' : 'red'} onClick={() => void openDetails('netprofit')} featured /><Kpi icon={<ArrowUpRight />} label="Receivables" value={s.debtors} hint="Customer money due" tone="green" onClick={() => void openDetails('receivables')} /><Kpi icon={<ArrowDownRight />} label="Payables" value={s.creditors} hint="Supplier money due" tone="red" onClick={() => void openDetails('payables')} /><Kpi icon={<WalletCards />} label="Cash + Bank" value={s.cash + s.bank} hint="Liquid funds" tone="green" onClick={() => void openDetails('cashbank')} /><Kpi icon={<Package />} label="Stock at cost" value={s.stock} hint="Current inventory value" tone="green" onClick={() => void openDetails('stock')} /></section>

    <section className="grid gap-5 xl:grid-cols-[1.55fr_.9fr]"><section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-black text-slate-950">Daily sales &amp; purchases</h2></div><p className="mt-1 text-xs text-slate-500">Posted activity for the selected period.</p></div><Link href="/dashboard/analysis" className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 transition hover:text-slate-950">Full analysis <ChevronRight className="h-4 w-4" /></Link></div><div className="mt-6 flex h-[270px] items-end gap-1 overflow-x-auto pb-1">{trend.map((row,index)=><div key={row.date} className="group flex min-w-[34px] flex-1 flex-col items-center justify-end gap-2" title={`${row.date} · Sales ${money(row.sales)} · Purchases ${money(row.purchases)} · Net ${money(row.netProfit)}`}><div className="flex h-52 w-full max-w-[46px] items-end gap-1 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-100"><div className="w-1/2 rounded-t-md bg-rose-300 transition-all group-hover:bg-slate-950" style={{height:`${Math.max(row.sales?4:1,(row.sales/maxChart)*100)}%`}}/><div className="w-1/2 rounded-t-md bg-emerald-300 transition-all group-hover:bg-slate-950" style={{height:`${Math.max(row.purchases?4:1,(row.purchases/maxChart)*100)}%`}}/></div><span className={`text-[9px] font-semibold ${index%2?'text-slate-300':'text-slate-500'}`}>{shortDate(row.date)}</span></div>)}</div><div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-rose-300"/>Sales</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-300"/>Inventory purchases</span><span className="ml-auto">Period net <b className={totals.net>=0?'text-emerald-700':'text-red-600'}>{money(totals.net)}</b></span></div></section><section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">Period performance</h2><p className="mt-1 text-xs text-slate-500">{days} days · profit after cost and operating expenses</p></div><span className={`rounded-full px-3 py-1 text-[11px] font-black ${totals.sales && totals.net>=0?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>{totals.sales?`${((totals.net/totals.sales)*100).toFixed(1)}% net margin`:'0.0% net margin'}</span></div><div className="mt-6 space-y-5"><ProgressRow label="Sales" value={totals.sales} max={Math.max(totals.sales,totals.purchases,totals.expenses,1)}/><ProgressRow label="Inventory purchases" value={totals.purchases} max={Math.max(totals.sales,totals.purchases,totals.expenses,1)}/><ProgressRow label="Operating expenses" value={totals.expenses} max={Math.max(totals.sales,totals.purchases,totals.expenses,1)}/><div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Today&apos;s profit</span><span className={`text-lg font-black ${todayProfit>=0?'text-emerald-700':'text-red-600'}`}>{money(todayProfit)}</span></div><p className="mt-1 text-xs text-slate-500">Sales {money(s.todaySales||0)} · COGS {money(s.todayCogs||0)} · Expenses {money(s.todayExpenses||0)}</p></div></div></section></section>

    {detailType && <DetailModal type={detailType} detail={detail} loading={detailLoading} selectedInvoice={selectedInvoice} setSelectedInvoice={setSelectedInvoice} partyName={partyName} onClose={() => { setDetailType(null); setDetail(null); setSelectedInvoice(null) }} />}
  </div>
}

function Greeting(){const hour=new Date().getHours();return <>{hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'}</>}
function HeroMetric({icon,label,value,tone='default',onClick}:{icon:ReactNode;label:string;value:number;tone?:'default'|'positive'|'negative';onClick:()=>void}){return <button onClick={onClick} className="group min-h-[112px] rounded-2xl border border-white/80 bg-white/70 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-950 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-950/30"><div className="flex items-start justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-white/10 group-hover:text-white">{icon}</span><ChevronRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-white"/></div><p className="mt-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-500 transition-colors group-hover:text-slate-300">{label}</p><p className={`mt-1 text-xl font-black transition-colors group-hover:text-white ${tone==='negative'?'text-red-600':tone==='positive'?'text-emerald-700':'text-slate-950'}`}>{money(value)}</p></button>}
function Kpi({icon,label,value,hint,tone,onClick,featured=false}:{icon:ReactNode;label:string;value:number;hint:string;tone:'green'|'red';onClick:()=>void;featured?:boolean}){return <button onClick={onClick} className={`group rounded-[22px] border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-950/20 ${featured?'border-emerald-200 bg-emerald-50/70':'border-slate-200 bg-white'}`}><div className="flex items-start justify-between"><span className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${tone==='red'?'bg-red-50 text-red-700 group-hover:bg-white/10 group-hover:text-white':'bg-emerald-50 text-emerald-700 group-hover:bg-white/10 group-hover:text-white'}`}>{icon}</span><ChevronRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-white"/></div><p className="mt-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-500 transition-colors group-hover:text-slate-300">{label}</p><p className={`mt-1 text-xl font-black transition-colors group-hover:text-white ${tone==='red'&&value>0?'text-red-600':'text-slate-950'}`}>{money(value)}</p><p className="mt-1 text-[11px] text-slate-500 transition-colors group-hover:text-slate-300">{hint}</p></button>}
function ProgressRow({label,value,max}:{label:string;value:number;max:number}){const width=Math.min(100,Math.max(0,(value/max)*100));return <div><div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600"><span>{label}</span><span>{money(value)}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-400 transition-all" style={{width:`${width}%`}}/></div></div>}

function DetailModal({type,detail,loading,selectedInvoice,setSelectedInvoice,partyName,onClose}:{type:string;detail:Detail|null;loading:boolean;selectedInvoice:Invoice|null;setSelectedInvoice:(invoice:Invoice|null)=>void;partyName:(invoice:Invoice)=>string;onClose:()=>void}){const title=type==='grossprofit'?'Gross profit':type==='netprofit'?'Net profit / loss':type==='sales'?'Sales invoices':type==='purchases'?'Purchase invoices':type==='expenses'?'Operating expenses':type==='stock'?'Stock at cost':type==='cashbank'?'Cash & bank activity':type==='receivables'?'Receivables':'Payables';return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-2 backdrop-blur-sm sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="flex max-h-[82vh] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xl"><div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5 sm:px-5"><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-700">Dashboard details</p><h2 className="mt-0.5 truncate text-base font-black text-slate-950">{selectedInvoice?selectedInvoice.invoice_no:title}</h2>{selectedInvoice&&<p className="truncate text-[10px] text-slate-500">{partyName(selectedInvoice)} · {formatDateTime(selectedInvoice.sold_at||selectedInvoice.created_at)}</p>}</div><button onClick={onClose} className="ml-3 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-950 hover:text-white" aria-label="Close"><X className="h-4 w-4"/></button></div>{selectedInvoice?<InvoiceProfit invoice={selectedInvoice} onBack={()=>setSelectedInvoice(null)}/>:<div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">{loading?<div className="grid place-items-center py-20 text-sm font-semibold text-slate-500"><RefreshCw className="mb-2 h-5 w-5 animate-spin text-emerald-600"/>Loading details…</div>:detail?.rows?.[0]?.error?<div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{detail.rows[0].error}</div>:<DetailRows type={type} rows={detail?.rows||[]} setSelectedInvoice={setSelectedInvoice}/>}</div>}</div></div>}

function DetailRows({type,rows,setSelectedInvoice}:{type:string;rows:any[];setSelectedInvoice:(invoice:Invoice|null)=>void}){if(!rows.length)return <div className="grid place-items-center py-16 text-center"><p className="font-black text-slate-800">No records found</p><p className="mt-1 text-sm text-slate-500">There is no data for this period.</p></div>;if(type==='grossprofit'||type==='netprofit')return <div className="overflow-hidden rounded-xl border border-slate-200"><div className="hidden grid-cols-[1.2fr_1fr_.7fr_.7fr] gap-3 bg-slate-50 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 sm:grid"><span>Invoice</span><span>Party / date</span><span className="text-right">Sales</span><span className="text-right">Profit / loss</span></div>{rows.map((row,index)=>row.kind==='sale'?<button key={`${row.id}-${index}`} onClick={()=>setSelectedInvoice(row.invoice)} className="group grid w-full gap-1.5 border-b border-slate-100 px-3 py-3 text-left transition last:border-0 hover:bg-slate-950 hover:text-white sm:grid-cols-[1.2fr_1fr_.7fr_.7fr] sm:items-center sm:gap-3"><div><p className="text-sm font-black underline decoration-emerald-400 underline-offset-2">{row.invoice_no}</p><p className="mt-0.5 text-[10px] text-slate-500 group-hover:text-slate-300">Click for item-wise weighted cost</p></div><div className="text-[11px]"><p className="font-semibold">{Array.isArray(row.party)?row.party[0]?.name:row.party?.name||'Walk-in / Other'}</p><p className="mt-0.5 text-slate-500 group-hover:text-slate-300">{formatDateTime(row.date)}</p></div><div className="text-right text-sm font-bold">{money(row.sales)}</div><div className={`text-right text-sm font-black ${row.gross_profit>=0?'text-emerald-600':'text-red-600'}`}>{money(row.gross_profit)}</div></button>:<div key={`${row.id}-${index}`} className="grid gap-1.5 border-b border-slate-100 px-3 py-3 sm:grid-cols-[1.2fr_1fr_.7fr_.7fr] sm:items-center sm:gap-3"><div className="text-sm font-black">{row.reference_id||'Expense'}</div><div className="text-[11px] text-slate-500">{row.account||row.description}</div><div/><div className="text-right text-sm font-black text-red-600">{money(-Math.abs(row.amount||0))}</div></div>)}</div>;
if(type==='sales'||type==='purchases')return <div className="space-y-1.5">{rows.map(row=><div key={row.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-950 hover:text-white"><div><p className="text-sm font-black">{row.invoice_no}</p><p className="mt-0.5 text-[11px] text-slate-500">{row.party?.name||(Array.isArray(row.parties)?row.parties[0]?.name:row.parties?.name)||'Walk-in / Other'} · {formatDateTime(row.sold_at||row.purchased_at||row.created_at)}</p></div><p className="text-sm font-black">{money(row.grand_total)}</p></div>)}</div>;
if(type==='expenses')return <div className="space-y-1.5">{rows.map(row=><div key={row.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-950 hover:text-white"><div><p className="text-sm font-black">{row.expense_no||row.category}</p><p className="mt-0.5 text-[11px] text-slate-500">{row.description||'Operating expense'} · {formatDateTime(row.expense_date||row.created_at)}</p></div><p className="text-sm font-black text-red-600">{money(row.amount)}</p></div>)}</div>;
if(type==='stock')return <div className="overflow-hidden rounded-xl border border-slate-200"><table className="w-full table-fixed text-xs"><colgroup><col className="w-[45%]"/><col className="w-[15%]"/><col className="w-[20%]"/><col className="w-[20%]"/></colgroup><thead className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-2.5 text-left">Product</th><th className="px-3 py-2.5 text-right">Qty</th><th className="px-3 py-2.5 text-right">Purchase / pc</th><th className="px-3 py-2.5 text-right">Stock cost</th></tr></thead><tbody>{rows.map(row=><tr key={row.product_id} className="border-t border-slate-100 hover:bg-slate-950 hover:text-white"><td className="px-3 py-2.5 font-bold break-words">{row.name}<div className="text-[10px] text-slate-500">{row.sku}</div></td><td className="px-3 py-2.5 text-right font-bold">{quantity(row.current_stock)}</td><td className="px-3 py-2.5 text-right">{money(row.purchase_price,2)}</td><td className="px-3 py-2.5 text-right font-black">{money(row.stock_cost_value)}</td></tr>)}</tbody></table></div>;
if(type==='receivables'||type==='payables')return <div className="space-y-1.5">{rows.map(row=><div key={row.party_id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-black">{row.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{type==='receivables'?'Customer money due':'Supplier money due'}</p></div><p className="text-sm font-black">{money(row.amount)}</p></div>)}</div>;
return <div className="space-y-1.5">{rows.map(row=><div key={row.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-black">{row.account||row.description||'Cash / Bank'}</p><p className="mt-0.5 text-[11px] text-slate-500">{row.reference_id||row.voucher_no||formatDateTime(row.entry_date)}</p></div><p className="text-sm font-black">{money((row.debit||0)-(row.credit||0))}</p></div>)}</div>}

function InvoiceProfit({invoice,onBack}:{invoice:Invoice;onBack:()=>void}){
  const items=invoice.sales_invoice_items||[]
  const totalQty=items.reduce((sum,item)=>sum+Number(item.quantity||0),0)
  const totalSales=items.reduce((sum,item)=>sum+Number(item.line_total||0),0)
  const totalCost=items.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(item.cost_unit_price||0),0)
  const totalProfit=totalSales-totalCost

  return <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
    <button onClick={onBack} className="mb-3 rounded-lg px-2.5 py-1.5 text-[11px] font-black text-slate-600 transition hover:bg-slate-950 hover:text-white">← Back to invoices</button>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <SummaryBox label="Total qty" value={quantity(totalQty)}/>
      <SummaryBox label="Sell value" value={money(totalSales)}/>
      <SummaryBox label="Weighted cost" value={money(totalCost)}/>
      <SummaryBox label="Total profit / loss" value={money(totalProfit)} negative={totalProfit<0}/>
    </div>

    {/* Compact accounting table: fixed columns, no horizontal scrolling. */}
    <div className="mt-3 w-full min-w-0 overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full min-w-0 table-fixed border-collapse text-[11px] leading-4 sm:text-[12px]">
        <colgroup>
          <col style={{ width: '34%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '17%' }} />
        </colgroup>
        <thead className="bg-slate-50 text-[8px] font-black uppercase tracking-[.04em] text-slate-600 sm:text-[9px]">
          <tr>
            <th className="min-w-0 px-2 py-2 text-left sm:px-2.5">ITEM</th>
            <th className="min-w-0 px-0.5 py-2 text-center sm:px-1">QTY</th>
            <th className="min-w-0 px-0.5 py-2 text-right sm:px-1.5">BUY / PC</th>
            <th className="min-w-0 px-0.5 py-2 text-right sm:px-1.5">SELL / PC</th>
            <th className="min-w-0 px-0.5 py-2 text-right sm:px-1.5">P/L / PC</th>
            <th className="min-w-0 px-1 py-2 text-right sm:px-1.5">TOTAL P/L</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item=>{
            const qty=Number(item.quantity||0)
            const sellPc=qty?Number(item.line_total||0)/qty:0
            const costPc=Number(item.cost_unit_price||0)
            const perPc=sellPc-costPc
            const total=perPc*qty
            return <tr key={item.id} className="border-t border-slate-100 align-middle transition hover:bg-slate-950 hover:text-white">
              <td className="min-w-0 px-2 py-2 sm:px-2.5 sm:py-2.5">
                <p className="break-words [overflow-wrap:anywhere] text-[11px] font-black leading-[1.25] sm:text-[12px]">{item.product_name}</p>
                <p className="mt-0.5 break-words text-[8px] leading-3 text-slate-500 sm:text-[9px]">{item.sku} · {item.unit_name}</p>
              </td>
              <td className="min-w-0 px-0.5 py-2 text-center text-[11px] font-black sm:px-1 sm:text-[12px]">{quantity(qty)}</td>
              <td className="min-w-0 px-0.5 py-2 text-right text-[10px] font-semibold whitespace-nowrap sm:px-1.5 sm:text-[11px]">{money(costPc,2)}</td>
              <td className="min-w-0 px-0.5 py-2 text-right text-[10px] font-semibold whitespace-nowrap sm:px-1.5 sm:text-[11px]">{money(sellPc,2)}</td>
              <td className={`min-w-0 px-0.5 py-2 text-right text-[10px] font-black whitespace-nowrap sm:px-1.5 sm:text-[11px] ${perPc>=0?'text-emerald-600':'text-red-600'}`}>{money(perPc,2)}</td>
              <td className={`min-w-0 px-1 py-2 text-right text-[10px] font-black whitespace-nowrap sm:px-1.5 sm:text-[11px] ${total>=0?'text-emerald-600':'text-red-600'}`}>{money(total,2)}</td>
            </tr>
          })}
        </tbody>
      </table>
    </div>

    <p className="mt-2 text-[9px] leading-4 text-slate-500 sm:text-[10px]">Purchase cost is the moving weighted-average cost available at the sale date, based on completed purchase invoices. Sale-line discounts are included in the effective selling price per piece.</p>
  </div>
}

function SummaryBox({label,value,negative=false}:{label:string;value:string;negative?:boolean}){return <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 sm:px-3 sm:py-2.5"><p className="truncate text-[8px] font-black uppercase tracking-wider text-slate-500 sm:text-[9px]">{label}</p><p className={`mt-0.5 truncate text-sm font-black sm:text-base ${negative?'text-red-600':'text-slate-950'}`}>{value}</p></div>}
function DashboardSkeleton(){return <div className="space-y-5"><div className="h-[330px] animate-pulse rounded-[30px] bg-slate-100"/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[1,2,3,4,5].map(i=><div key={i} className="h-32 animate-pulse rounded-[22px] bg-slate-100"/>)}</div><div className="h-80 animate-pulse rounded-[26px] bg-slate-100"/></div>}
