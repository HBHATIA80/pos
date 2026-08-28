'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ClipboardList, Download, Filter, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'

type RecordType = 'all' | 'sales' | 'purchases' | 'payments' | 'receipts' | 'expenses' | 'parties'
type Row = { id: string; type: Exclude<RecordType, 'all'>; number: string; party: string; date: string; amount: number; status: string; method: string; description: string }
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const labels: Record<RecordType, string> = { all: 'All records', sales: 'Sales invoices', purchases: 'Purchase invoices', payments: 'Payment vouchers', receipts: 'Receipt vouchers', expenses: 'Expenses', parties: 'Parties' }

export default function RecordsPage() {
  const [type, setType] = useState<RecordType>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type, limit: '1000' })
      if (from) params.set('from', from); if (to) params.set('to', to); if (minAmount) params.set('min_amount', minAmount); if (maxAmount) params.set('max_amount', maxAmount); if (q.trim()) params.set('q', q.trim())
      const response = await fetch(`/api/records?${params.toString()}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to load records')
      setRows(body.records ?? []); setTotalAmount(Number(body.totalAmount) || 0)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load records') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [type])

  const summary = useMemo(() => rows.reduce<Record<string, number>>((acc, row) => { acc[row.type] = (acc[row.type] || 0) + 1; return acc }, {}), [rows])

  function exportCsv() {
    const header = ['Type', 'Number', 'Party', 'Date', 'Amount', 'Status', 'Method', 'Description']
    const lines = [header, ...rows.map(row => [labels[row.type], row.number, row.party, new Date(row.date).toLocaleString('en-IN'), row.amount.toFixed(2), row.status, row.method, row.description])]
    const csv = lines.map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `bizybuk-records-${new Date().toISOString().slice(0,10)}.csv`; anchor.click(); URL.revokeObjectURL(url)
  }

  return <div className="mx-auto max-w-7xl space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ClipboardList className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[.15em] text-blue-700">Business records</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950">Records & Filters</h1><p className="mt-1 text-sm text-slate-600">Find sales, purchases, payments, receipts, expenses and parties in one searchable view.</p></div></div><button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button></div></section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><Filter className="h-5 w-5 text-blue-700" /><h2 className="text-lg font-extrabold text-slate-950">Filter records</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"><label className="xl:col-span-2"><span className="mb-1 block text-sm font-bold text-slate-700">Record type</span><select value={type} onChange={e => setType(e.target.value as RecordType)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-950">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="mb-1 block text-sm font-bold text-slate-700">From</span><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-3 font-semibold text-slate-950" /></div></label><label><span className="mb-1 block text-sm font-bold text-slate-700">To</span><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-3 font-semibold text-slate-950" /></div></label><label><span className="mb-1 block text-sm font-bold text-slate-700">Min amount</span><input type="number" min="0" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="₹ 0" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-950" /></label><label><span className="mb-1 block text-sm font-bold text-slate-700">Max amount</span><input type="number" min="0" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="No limit" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-950" /></label><label className="sm:col-span-2 xl:col-span-2"><span className="mb-1 block text-sm font-bold text-slate-700">Search</span><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void load() }} placeholder="Invoice, voucher, party, notes…" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 font-semibold text-slate-950" /></div></label></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{Object.entries(summary).map(([key, count]) => <span key={key} className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">{labels[key as RecordType]}: {count}</span>)}</div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 font-extrabold text-white hover:bg-blue-700 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Loading…' : 'Apply filters'}</button></div></section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-extrabold text-slate-950">{labels[type]}</h2><p className="text-sm font-medium text-slate-600">{rows.length.toLocaleString('en-IN')} matching records</p></div><div className="rounded-xl bg-blue-50 px-4 py-2 text-right"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Visible amount total</p><p className="text-xl font-black text-blue-700">{money(totalAmount)}</p></div></div><div className="overflow-x-auto"><table><thead><tr><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Number</th><th className="px-4 py-3 text-left">Party / Category</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Method</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Status</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="px-4 py-12 text-center font-semibold text-slate-600">Loading records…</td></tr> : rows.length ? rows.map(row => <tr key={row.id}><td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700">{labels[row.type]}</span></td><td className="px-4 py-3 font-extrabold text-slate-950">{row.number}</td><td className="px-4 py-3"><div className="font-bold text-slate-950">{row.party}</div><div className="mt-0.5 text-sm font-medium text-slate-600">{row.description}</div></td><td className="px-4 py-3 whitespace-nowrap">{new Date(row.date).toLocaleDateString('en-IN')}</td><td className="px-4 py-3 capitalize">{row.method}</td><td className="px-4 py-3 text-right font-extrabold text-slate-950">{row.amount ? money(row.amount) : '—'}</td><td className="px-4 py-3 capitalize">{row.status}</td></tr>) : <tr><td colSpan={7} className="px-4 py-12 text-center"><SlidersHorizontal className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 font-bold text-slate-700">No records match these filters.</p><p className="mt-1 text-sm text-slate-600">Try a wider date range, amount range or search term.</p></td></tr>}</tbody></table></div></section>
  </div>
}
