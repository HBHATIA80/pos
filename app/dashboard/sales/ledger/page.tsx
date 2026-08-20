'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, FileText, RefreshCw, Search, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

type Invoice = {
  id: string
  invoice_no: string
  status: 'draft' | 'completed' | 'void'
  grand_total: number
  created_at: string
  parties?: { id?: string; name: string } | null
}

type LedgerEntry = {
  id: string
  type: 'invoice' | 'payment'
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
  payment_method?: 'cash' | 'bank'
  notes?: string
}

type LedgerData = {
  invoice: {
    id: string
    invoice_no: string
    status: string
    grand_total: number
    paid_amount: number
    balance_amount: number
    payment_status: 'unpaid' | 'partial' | 'paid'
    created_at: string
    completed_at: string | null
  }
  party: { id?: string; name?: string; phone?: string | null } | null
  payments: Array<{
    id: string
    payment_method: 'cash' | 'bank'
    amount: number
    reference_no: string | null
    notes: string | null
    paid_at: string
    status: string
  }>
  ledger: LedgerEntry[]
}

function money(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function Status({ status }: { status: string }) {
  const classes =
    status === 'paid'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'partial'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-slate-100 text-slate-600'

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${classes}`}>{status}</span>
}

export default function SalesLedgerPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [ledger, setLedger] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [ledgerLoading, setLedgerLoading] = useState(false)

  async function loadInvoices() {
    setLoading(true)
    const response = await fetch('/api/sales', { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    setLoading(false)

    if (!response.ok) {
      toast.error(result.error ?? 'Unable to load sales')
      return
    }

    const rows = (result.invoices ?? []) as Invoice[]
    setInvoices(rows)

    if (!selectedId && rows[0]) setSelectedId(rows[0].id)
  }

  async function loadLedger(id: string) {
    if (!id) {
      setLedger(null)
      return
    }

    setLedgerLoading(true)
    const response = await fetch(`/api/sales/${id}/ledger`, { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    setLedgerLoading(false)

    if (!response.ok) {
      setLedger(null)
      toast.error(result.error ?? 'Unable to load ledger')
      return
    }

    setLedger(result)
  }

  useEffect(() => { void loadInvoices() }, [])
  useEffect(() => { void loadLedger(selectedId) }, [selectedId])

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter((invoice) =>
      invoice.invoice_no.toLowerCase().includes(q) ||
      (invoice.parties?.name ?? '').toLowerCase().includes(q)
    )
  }, [invoices, search])

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Phase 7.3</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Sales Ledger</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Sales Ledger & Payment History</h1>
          <p className="mt-2 text-sm text-slate-500">Invoice debit, payments received, and the outstanding balance in one place.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/sales" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" /> POS
          </Link>
          <button onClick={() => void loadInvoices()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice or customer" className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="max-h-[65vh] divide-y divide-slate-100 overflow-y-auto">
            {filteredInvoices.map((invoice) => (
              <button key={invoice.id} onClick={() => setSelectedId(invoice.id)} className={`w-full p-4 text-left transition ${selectedId === invoice.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">{invoice.invoice_no}</span>
                  <span className="text-sm font-bold text-slate-900">{money(Number(invoice.grand_total))}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{invoice.parties?.name ?? 'Walk-in customer'}</p>
                <p className="mt-1 text-[11px] text-slate-400">{new Date(invoice.created_at).toLocaleString()}</p>
              </button>
            ))}
            {!loading && !filteredInvoices.length && <div className="p-8 text-center text-sm text-slate-500">No invoices found.</div>}
            {loading && <div className="p-8 text-center text-sm text-slate-400">Loading invoices…</div>}
          </div>
        </section>

        <section className="space-y-5">
          {ledgerLoading && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading ledger…</div>}

          {!ledgerLoading && ledger && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><FileText className="h-4 w-4" /> Invoice</div><p className="mt-3 text-xl font-bold text-slate-950">{money(ledger.invoice.grand_total)}</p><p className="mt-1 text-xs text-slate-500">{ledger.invoice.invoice_no}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Wallet className="h-4 w-4" /> Paid</div><p className="mt-3 text-xl font-bold text-emerald-700">{money(ledger.invoice.paid_amount)}</p><p className="mt-1 text-xs text-slate-500">Received so far</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><CreditCard className="h-4 w-4" /> Balance</div><p className="mt-3 text-xl font-bold text-amber-700">{money(ledger.invoice.balance_amount)}</p><p className="mt-1 text-xs text-slate-500">Outstanding</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p><div className="mt-4"><Status status={ledger.invoice.payment_status} /></div><p className="mt-2 text-xs text-slate-500">{ledger.party?.name ?? 'Walk-in customer'}</p></div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4 sm:p-5"><h2 className="font-semibold text-slate-900">Ledger</h2><p className="mt-1 text-xs text-slate-500">Invoice is a debit; payments are credits.</p></div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Date</th><th className="px-5 py-3">Particular</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3 text-right">Debit</th><th className="px-5 py-3 text-right">Credit</th><th className="px-5 py-3 text-right">Balance</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.ledger.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{new Date(entry.date).toLocaleString()}</td><td className="px-5 py-4 font-semibold text-slate-800">{entry.description}</td><td className="px-5 py-4 text-xs text-slate-500">{entry.reference || '—'}</td><td className="px-5 py-4 text-right font-semibold">{entry.debit ? money(entry.debit) : '—'}</td><td className="px-5 py-4 text-right font-semibold text-emerald-700">{entry.credit ? money(entry.credit) : '—'}</td><td className="px-5 py-4 text-right font-bold">{money(entry.balance)}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4 sm:p-5"><h2 className="font-semibold text-slate-900">Payment History</h2><p className="mt-1 text-xs text-slate-500">All recorded payments remain visible, including voided transactions.</p></div>
                <div className="divide-y divide-slate-100">
                  {ledger.payments.map((payment) => <div key={payment.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">{payment.payment_method}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${payment.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{payment.status}</span></div><p className="mt-2 text-xs text-slate-500">{new Date(payment.paid_at).toLocaleString()}{payment.reference_no ? ` · Ref ${payment.reference_no}` : ''}</p>{payment.notes && <p className="mt-1 text-xs text-slate-400">{payment.notes}</p>}</div><span className="text-lg font-bold text-slate-900">{money(Number(payment.amount))}</span></div>)}
                  {!ledger.payments.length && <div className="p-8 text-center text-sm text-slate-500">No payments recorded for this invoice.</div>}
                </div>
              </div>
            </>
          )}

          {!ledgerLoading && !ledger && !selectedId && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Select an invoice to view its ledger.</div>}
        </section>
      </div>
    </div>
  )
}
