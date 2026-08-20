'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Loader2, Printer, RefreshCw, Search } from 'lucide-react'

type Payment = {
  id: string
  receipt_no: string
  payment_method: string
  amount: number
  reference_no: string | null
  paid_at: string
  status: 'active' | 'void'
  invoice_id: string
  sales_invoices: { invoice_no: string; grand_total: number }
  parties: { name: string; phone: string | null } | null
}

const money = (value: number) => `₹${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/payments?limit=100', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error ?? 'Unable to load payment history')
      setPayments(result.payments ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load payment history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return payments
    return payments.filter((payment) => [
      payment.receipt_no,
      payment.sales_invoices.invoice_no,
      payment.parties?.name,
      payment.parties?.phone,
      payment.payment_method,
      payment.reference_no,
    ].some((value) => String(value ?? '').toLowerCase().includes(q)))
  }, [payments, search])

  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Phase 7.3 · Receipts</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Payment History</h1>
            <p className="mt-1 text-sm text-slate-500">Find payments and reprint receipts.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search receipt, invoice, customer, phone or reference" className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
      </section>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-5 py-3">Receipt</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4"><div className="font-semibold text-slate-900">{payment.receipt_no}</div>{payment.reference_no && <div className="text-xs text-slate-400">Ref: {payment.reference_no}</div>}</td>
                    <td className="px-5 py-4"><div className="font-medium text-slate-800">{payment.parties?.name ?? 'Walk-in Customer'}</div>{payment.parties?.phone && <div className="text-xs text-slate-400">{payment.parties.phone}</div>}</td>
                    <td className="px-5 py-4"><div className="font-medium text-slate-800">{payment.sales_invoices.invoice_no}</div><div className="text-xs text-slate-400">Total {money(Number(payment.sales_invoices.grand_total))}</div></td>
                    <td className="px-5 py-4 capitalize text-slate-600">{payment.payment_method}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{money(Number(payment.amount))}</td>
                    <td className="px-5 py-4 text-slate-500">{dateTime(payment.paid_at)}</td>
                    <td className="px-5 py-4 text-right"><a href={`/dashboard/sales/receipts/${payment.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Printer className="h-4 w-4" /> Receipt <ExternalLink className="h-3 w-3" /></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
