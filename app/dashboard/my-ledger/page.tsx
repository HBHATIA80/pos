'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, Loader2, Plus, ReceiptText, RefreshCw, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'

type Shop = { business_id: string; party_id: string; is_primary: boolean; business: { id: string; name: string; code: string | null; phone: string | null; address: string | null } | null; party: { id: string; name: string; phone: string | null } | null }
type Item = { id: string; product_name: string; sku: string; quantity: number; unit_price: number; line_total: number }
type Invoice = { id: string; invoice_no: string; date: string; status: string; order_channel?: string | null; grand_total: number; paid_amount: number; balance_amount: number; items: Item[] }
type Payment = { id: string; invoice_id: string; invoice_no: string | null; receipt_no: string | null; payment_method: string; amount: number; reference_no: string | null; paid_at: string; notes: string | null }
type Entry = { id: string; type: 'purchase' | 'payment'; date: string; reference: string; description: string; debit: number; credit: number; balance: number }
type LedgerData = { customer: { name: string; party_id: string | null }; shop: { id: string; name: string; code: string | null }; summary: { purchase_count: number; purchase_total: number; paid_total: number; outstanding_total: number }; invoices: Invoice[]; payments: Payment[]; entries: Entry[] }

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN') }

export default function MyLedgerPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedShopId, setSelectedShopId] = useState('')
  const [data, setData] = useState<LedgerData | null>(null)
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [shopCode, setShopCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [tab, setTab] = useState<'ledger' | 'invoices' | 'payments'>('ledger')

  async function loadShops(selectId?: string) {
    setLoadingShops(true)
    try {
      const response = await fetch('/api/customer/shops', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load shops')
      const nextShops = body.shops ?? []
      setShops(nextShops)
      if (nextShops.length && !selectedShopId) setSelectedShopId(selectId || nextShops[0].business_id)
      else if (selectId) setSelectedShopId(selectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load shops')
    } finally { setLoadingShops(false) }
  }

  async function loadLedger(nextShopId = selectedShopId, nextFrom = fromDate, nextTo = toDate) {
    if (!nextShopId) return
    setLoadingLedger(true); setError('')
    try {
      const params = new URLSearchParams({ business_id: nextShopId })
      if (nextFrom) params.set('from', nextFrom)
      if (nextTo) params.set('to', nextTo)
      const response = await fetch(`/api/customer/ledger?${params.toString()}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load shop ledger')
      setData(body)
    } catch (err) {
      setData(null); setError(err instanceof Error ? err.message : 'Unable to load shop ledger')
    } finally { setLoadingLedger(false) }
  }

  async function joinShop() {
    const code = shopCode.trim().toUpperCase()
    if (!code) return toast.error('Enter a shop code')
    setJoining(true)
    try {
      const response = await fetch('/api/customer/shops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shop_code: code }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to join shop')
      setShopCode('')
      const businessId = body.shop?.business_id
      toast.success('Shop added to your customer account')
      await loadShops(businessId)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to join shop') }
    finally { setJoining(false) }
  }

  useEffect(() => { void loadShops() }, [])
  useEffect(() => { if (selectedShopId) void loadLedger(selectedShopId, '', '') }, [selectedShopId])

  const selectedShop = useMemo(() => shops.find((shop) => shop.business_id === selectedShopId) ?? null, [shops, selectedShopId])

  if (loadingShops) return <div className="mx-auto flex min-h-64 max-w-7xl items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Customer Portal</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">My Shops & Ledgers</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">One customer account can belong to multiple shops. Select a shop to see only that shop's ledger, invoices and payments.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/orders" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Shop & Orders</Link>
            <button type="button" onClick={() => void loadLedger()} disabled={loadingLedger || !selectedShopId} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loadingLedger ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-600" /><h2 className="font-semibold text-slate-900">Your Shops</h2></div>
          {!shops.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">You are not connected to any shop yet.</p> : <div className="grid gap-3 sm:grid-cols-2">{shops.map((shop) => <button type="button" key={shop.business_id} onClick={() => { setSelectedShopId(shop.business_id); setTab('ledger') }} className={`rounded-2xl border p-4 text-left transition ${selectedShopId === shop.business_id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{shop.business?.name}</p><p className="mt-1 text-xs text-slate-500">{shop.business?.code || 'No shop code'}</p></div>{selectedShopId === shop.business_id && <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />}</div><p className="mt-3 text-xs text-slate-500">Customer: {shop.party?.name || '—'}</p></button>)}</div>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2"><Plus className="h-5 w-5 text-blue-600" /><h2 className="font-semibold text-slate-900">Add Another Shop</h2></div>
          <p className="mb-4 text-xs leading-5 text-slate-500">Ask the shop owner for their shop code. Your same login will be linked to that shop as a customer.</p>
          <div className="flex gap-2"><input value={shopCode} onChange={(event) => setShopCode(event.target.value.toUpperCase())} placeholder="SHOP-XXXXXXXX" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><button type="button" onClick={() => void joinShop()} disabled={joining} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</button></div>
        </div>
      </section>

      {selectedShop && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Selected Shop</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{selectedShop.business?.name}</h2><p className="mt-1 text-sm text-slate-500">{selectedShop.business?.code} · Customer account: {selectedShop.party?.name}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setTab('ledger')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${tab === 'ledger' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}><WalletCards className="h-4 w-4" /> Ledger</button><button type="button" onClick={() => setTab('invoices')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${tab === 'invoices' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}><ReceiptText className="h-4 w-4" /> Invoices</button><button type="button" onClick={() => setTab('payments')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${tab === 'payments' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}><CheckCircle2 className="h-4 w-4" /> Payments</button></div>
        </div>
      </section>}

      {error && <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</section>}
      {loadingLedger && <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" /><p className="mt-3">Loading {selectedShop?.business?.name || 'shop'} records…</p></section>}

      {!loadingLedger && data && <>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p><p className="mt-2 truncate font-semibold text-slate-900">{data.customer.name}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoices</p><p className="mt-2 text-2xl font-bold text-slate-900">{data.summary.purchase_count}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purchase Total</p><p className="mt-2 text-2xl font-bold text-slate-900">{money(data.summary.purchase_total)}</p><p className="mt-1 text-xs text-slate-400">Paid {money(data.summary.paid_total)}</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Outstanding</p><p className="mt-2 text-2xl font-bold text-blue-700">{money(data.summary.outstanding_total)}</p></div></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-blue-600" /><h2 className="font-semibold text-slate-900">Date Range</h2></div><p className="mt-1 text-xs text-slate-500">Filter this shop only. Opening balance is carried into the selected period.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-sm font-medium text-slate-700">From<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-sm font-medium text-slate-700">To<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><button type="button" onClick={() => void loadLedger()} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white">Apply</button><button type="button" onClick={() => { setFromDate(''); setToDate(''); void loadLedger(selectedShopId, '', '') }} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Clear</button></div></div></section>

        {tab === 'ledger' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">{data.shop.name} · Running Ledger</h2><p className="mt-1 text-xs text-slate-500">Purchases increase the balance; payments reduce it. Only this shop's transactions are shown.</p></div>{!data.entries.length ? <div className="p-10 text-center text-sm text-slate-500">No ledger entries for this period.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Description</th><th className="px-5 py-3 text-right">Debit</th><th className="px-5 py-3 text-right">Credit</th><th className="px-5 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-slate-100">{data.entries.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDate(entry.date)}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${entry.type === 'payment' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{entry.type === 'payment' ? 'Payment' : 'Invoice'}</span></td><td className="px-5 py-3 font-medium text-slate-900">{entry.reference || '—'}</td><td className="px-5 py-3 text-slate-600">{entry.description}</td><td className="px-5 py-3 text-right font-medium">{entry.debit ? money(entry.debit) : '—'}</td><td className="px-5 py-3 text-right font-medium text-green-700">{entry.credit ? money(entry.credit) : '—'}</td><td className="px-5 py-3 text-right font-bold">{money(entry.balance)}</td></tr>)}</tbody></table></div>}</section>}

        {tab === 'invoices' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Invoices from {data.shop.name}</h2><p className="mt-1 text-xs text-slate-500">Only invoices belonging to this shop and your customer party are visible.</p></div>{!data.invoices.length ? <div className="p-10 text-center text-sm text-slate-500">No invoices found for this period.</div> : <div className="divide-y divide-slate-100">{data.invoices.map((invoice) => <div key={invoice.id} className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{invoice.invoice_no}</p><p className="mt-1 text-xs text-slate-500">{formatDate(invoice.date)} · {invoice.status}</p></div><div className="text-left sm:text-right"><p className="font-bold text-slate-900">{money(invoice.grand_total)}</p><p className="text-xs text-slate-500">Paid {money(invoice.paid_amount)} · Balance {money(invoice.balance_amount)}</p></div></div>{invoice.items?.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{invoice.items.map((item) => <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="font-medium text-slate-900">{item.product_name}</p><p className="mt-1 text-xs text-slate-500">{item.sku} · Qty {Number(item.quantity)} · {money(item.unit_price)}</p><p className="mt-2 text-xs font-semibold text-slate-700">{money(item.line_total)}</p></div>)}</div>}</div>)}</div>}</section>}

        {tab === 'payments' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Payments to {data.shop.name}</h2><p className="mt-1 text-xs text-slate-500">Payment history and receipt/reference details for this shop only.</p></div>{!data.payments.length ? <div className="p-10 text-center text-sm text-slate-500">No payments found for this period.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Receipt</th><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{data.payments.map((payment) => <tr key={payment.id}><td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDate(payment.paid_at)}</td><td className="px-5 py-3 font-medium text-slate-900">{payment.receipt_no || '—'}</td><td className="px-5 py-3 text-slate-700">{payment.invoice_no || '—'}</td><td className="px-5 py-3 capitalize text-slate-600">{payment.payment_method}</td><td className="px-5 py-3 text-slate-500">{payment.reference_no || '—'}</td><td className="px-5 py-3 text-right font-bold text-green-700">{money(payment.amount)}</td></tr>)}</tbody></table></div>}</section>}
      </>}
    </div>
  )
}
