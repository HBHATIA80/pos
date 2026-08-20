'use client'

import { useEffect, useState } from 'react'
import { FileText, RefreshCw, Search, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'

type Invoice = {
  id: string
  invoice_no: string
  status: 'draft' | 'completed' | 'void'
  party_id: string | null
  subtotal: number
  discount_amount: number
  grand_total: number
  notes: string | null
  sold_at: string | null
  completed_at: string | null
  created_at: string
  parties?: { id: string; name: string; phone: string | null; party_type: string } | null
}

type Payment = {
  id: string
  invoice_id: string
  payment_method: 'cash' | 'bank'
  amount: number
  reference_no: string | null
  notes: string | null
  paid_at: string
  status: 'active' | 'void'
  created_at: string
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

type LedgerResponse = {
  invoice: {
    id: string
    invoice_no: string
    status: 'draft' | 'completed' | 'void'
    party_id: string | null
    subtotal: number
    discount_amount: number
    grand_total: number
    paid_amount: number
    balance_amount: number
    payment_status: 'unpaid' | 'partial' | 'paid'
    notes: string | null
    sold_at: string | null
    completed_at: string | null
    created_at: string
  }
  party: { id: string; name: string; phone: string | null; party_type: string } | null
  payments: Payment[]
  ledger: LedgerEntry[]
}

function money(value: number) {
  return `₹${Number(value ?? 0).toFixed(2)}`
}

function dateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function StatusPill({ status }: { status: LedgerResponse['invoice']['payment_status'] }) {
  const label = status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid'
  const className =
    status === 'paid'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'partial'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-slate-100 text-slate-600'

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>
}

export default function LedgerPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [ledger, setLedger] = useState<LedgerResponse | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [ledgerLoading, setLedgerLoading] = useState(false)

  async function loadInvoices() {
    setLoading(true)

    try {
      const response = await fetch('/api/sales', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) throw new Error(result.error ?? 'Unable to load sales')

      const nextInvoices = (result.invoices ?? []) as Invoice[]
      setInvoices(nextInvoices)

      if (selectedInvoiceId && nextInvoices.some((invoice) => invoice.id === selectedInvoiceId)) {
        return
      }

      if (nextInvoices[0]) setSelectedInvoiceId(nextInvoices[0].id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load sales')
    } finally {
      setLoading(false)
    }
  }

  async function loadLedger(invoiceId: string) {
    if (!invoiceId) {
      setLedger(null)
      return
    }

    setLedgerLoading(true)

    try {
      const response = await fetch(`/api/sales/${invoiceId}/ledger`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) throw new Error(result.error ?? 'Unable to load ledger')

      setLedger(result as LedgerResponse)
    } catch (error) {
      setLedger(null)
      toast.error(error instanceof Error ? error.message : 'Unable to load ledger')
    } finally {
      setLedgerLoading(false)
    }
  }

  useEffect(() => {
    void loadInvoices()
  }, [])

  useEffect(() => {
    if (selectedInvoiceId) void loadLedger(selectedInvoiceId)
  }, [selectedInvoiceId])

  const filteredInvoices = invoices.filter((invoice) => {
    const q = search.trim().toLowerCase()
    if (!q) return true

    return [
      invoice.invoice_no,
      invoice.parties?.name ?? '',
      invoice.parties?.phone ?? '',
    ].some((value) => value.toLowerCase().includes(q))
  })

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Phase 7.3 · Sales Ledger</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Sales Ledger & Payment History</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Review invoice balances and the payments recorded against each completed sale. Invoice amounts are debits; received payments are credits.</p>
          </div>
          <button onClick={() => void loadInvoices()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoice or customer"
                className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading sales…</div>
            ) : filteredInvoices.length ? (
              filteredInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  onClick={() => setSelectedInvoiceId(invoice.id)}
                  className={`block w-full p-4 text-left transition ${selectedInvoiceId === invoice.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{invoice.invoice_no}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{invoice.parties?.name ?? 'Walk-in customer'}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-900">{money(invoice.grand_total)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">{dateTime(invoice.completed_at ?? invoice.created_at)}</span>
                    <span className="text-[11px] font-medium capitalize text-slate-500">{invoice.status}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">No sales found.</div>
            )}
          </div>
        </section>

        <section className="space-y-5">
          {ledgerLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">Loading ledger…</div>
          ) : !ledger ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">Select a sale</p>
              <p className="mt-1 text-xs text-slate-400">Choose an invoice from the list to view its ledger.</p>
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">{ledger.invoice.invoice_no}</h2>
                    <p className="mt-1 text-sm text-slate-500">{ledger.party?.name ?? 'Walk-in customer'}{ledger.party?.phone ? ` · ${ledger.party.phone}` : ''}</p>
                  </div>
                  <StatusPill status={ledger.invoice.payment_status} />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Invoice</p><p className="mt-1 text-base font-bold text-slate-900">{money(ledger.invoice.grand_total)}</p></div>
                  <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Paid</p><p className="mt-1 text-base font-bold text-emerald-700">{money(ledger.invoice.paid_amount)}</p></div>
                  <div className="rounded-2xl bg-amber-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Balance</p><p className="mt-1 text-base font-bold text-amber-700">{money(ledger.invoice.balance_amount)}</p></div>
                  <div className="rounded-2xl bg-blue-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">Entries</p><p className="mt-1 text-base font-bold text-blue-700">{ledger.ledger.length}</p></div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-blue-600" /><h2 className="font-semibold text-slate-900">Ledger</h2></div>
                  <p className="mt-1 text-xs text-slate-500">Invoice debit and payment credits with running balance.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                      <tr><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Particular</th><th className="px-4 py-3 font-semibold">Reference</th><th className="px-4 py-3 text-right font-semibold">Debit</th><th className="px-4 py-3 text-right font-semibold">Credit</th><th className="px-4 py-3 text-right font-semibold">Balance</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.ledger.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3 text-slate-500">{dateTime(entry.date)}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{entry.description}</td>
                          <td className="px-4 py-3 text-slate-500">{entry.reference || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{entry.debit ? money(entry.debit) : '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">{entry.credit ? money(entry.credit) : '—'}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700">{money(entry.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-900">Payment History</h2><p className="mt-1 text-xs text-slate-500">All active and void payment records remain visible for audit history.</p></div>
                <div className="divide-y divide-slate-100">
                  {ledger.payments.length ? ledger.payments.map((payment) => (
                    <div key={payment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-600">{payment.payment_method}</span>{payment.status === 'void' && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">void</span>}</div>
                        <p className="mt-2 text-xs text-slate-500">{dateTime(payment.paid_at)}{payment.reference_no ? ` · Ref ${payment.reference_no}` : ''}</p>
                        {payment.notes && <p className="mt-1 text-xs text-slate-500">{payment.notes}</p>}
                      </div>
                      <p className={`text-base font-bold ${payment.status === 'void' ? 'text-slate-400 line-through' : 'text-emerald-700'}`}>{money(payment.amount)}</p>
                    </div>
                  )) : <div className="p-8 text-center text-sm text-slate-500">No payments recorded for this invoice.</div>}
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
