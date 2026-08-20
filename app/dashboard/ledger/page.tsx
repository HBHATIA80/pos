'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, FileText, RefreshCw, Search, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'

type Invoice = {
  id: string
  invoice_no: string
  status: 'draft' | 'completed' | 'void'
  party_id: string | null
  grand_total: number
  subtotal: number
  discount_amount: number
  created_at: string
  parties?: { name: string } | null
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
    status: string
    grand_total: number
    paid_amount: number
    balance_amount: number
    payment_status: 'unpaid' | 'partial' | 'paid'
    completed_at: string | null
  }
  party: { id: string; name: string; phone: string | null; party_type: string } | null
  ledger: LedgerEntry[]
}

const money = (value: number) => `₹${Number(value || 0).toFixed(2)}`

export default function LedgerPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [ledger, setLedger] = useState<LedgerResponse | null>(null)
  const [search, setSearch] = useState('')
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

    setInvoices(result.invoices ?? [])
    if (!selectedId && result.invoices?.[0]?.id) setSelectedId(result.invoices[0].id)
  }

  async function loadLedger(id: string) {
    if (!id) return
    setLedgerLoading(true)
    const response = await fetch(`/api/sales/${id}/ledger`, { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    setLedgerLoading(false)

    if (!response.ok) {
      toast.error(result.error ?? 'Unable to load ledger')
      return
    }

    setLedger(result)
  }

  useEffect(() => { void loadInvoices() }, [])
  useEffect(() => { if (selectedId) void loadLedger(selectedId) }, [selectedId])

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter((invoice) =>
      invoice.invoice_no.toLowerCase().includes(q) ||
      (invoice.parties?.name ?? '').toLowerCase().includes(q),
    )
  }, [invoices, search])

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Phase 7.3</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Sales Ledger & Payment History</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">View each sales invoice as a debit and its cash or bank payments as credits. Partial payments remain visible and the running balance is calculated from the actual transactions.</p>
          </div>
          <button onClick={() => void loadInvoices()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice or customer" className="min-h-11 w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div className="max-h-[65vh] divide-y divide-slate-100 overflow-y-auto">
            {loading && <p className="p-6 text-center text-sm text-slate-400">Loading invoices…</p>}
            {!loading && !filteredInvoices.length && <p className="p-8 text-center text-sm text-slate-500">No sales found.</p>}
            {filteredInvoices.map((invoice) => (
              <button key={invoice.id} onClick={() => setSelectedId(invoice.id)} className={`block w-full p-4 text-left transition ${selectedId === invoice.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">{invoice.invoice_no}</span>
                  <span className="text-sm font-bold">{money(invoice.grand_total)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{invoice.parties?.name ?? 'Walk-in customer'}</p>
                <p className="mt-1 text-[11px] text-slate-400">{new Date(invoice.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {ledgerLoading && <div className="p-10 text-center text-sm text-slate-400">Loading ledger…</div>}
          {!ledgerLoading && !ledger && <div className="p-10 text-center text-sm text-slate-500">Select an invoice to view its ledger.</div>}
          {!ledgerLoading && ledger && (
            <>
              <div className="border-b border-slate-200 p-4 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /><h2 className="text-lg font-bold text-slate-900">{ledger.invoice.invoice_no}</h2></div>
                    <p className="mt-1 text-sm text-slate-500">{ledger.party?.name ?? 'Walk-in customer'}{ledger.party?.phone ? ` · ${ledger.party.phone}` : ''}</p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold uppercase ${ledger.invoice.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : ledger.invoice.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{ledger.invoice.payment_status}</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Summary label="Invoice total" value={money(ledger.invoice.grand_total)} icon={<FileText className="h-4 w-4" />} />
                  <Summary label="Paid" value={money(ledger.invoice.paid_amount)} icon={<ArrowDownLeft className="h-4 w-4" />} />
                  <Summary label="Balance" value={money(ledger.invoice.balance_amount)} icon={<WalletCards className="h-4 w-4" />} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                    <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Particular</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger.ledger.map((entry) => (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{new Date(entry.date).toLocaleString()}</td>
                        <td className="px-4 py-4"><div className="flex items-center gap-2 font-semibold text-slate-800">{entry.type === 'invoice' ? <ArrowUpRight className="h-4 w-4 text-blue-600" /> : <ArrowDownLeft className="h-4 w-4 text-emerald-600" />}{entry.description}</div>{entry.payment_method && <p className="mt-1 text-xs capitalize text-slate-400">{entry.payment_method}{entry.notes ? ` · ${entry.notes}` : ''}</p>}</td>
                        <td className="px-4 py-4 text-xs text-slate-500">{entry.reference || '—'}</td>
                        <td className="px-4 py-4 text-right font-semibold">{entry.debit ? money(entry.debit) : '—'}</td>
                        <td className="px-4 py-4 text-right font-semibold text-emerald-700">{entry.credit ? money(entry.credit) : '—'}</td>
                        <td className="px-4 py-4 text-right font-bold">{money(entry.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function Summary({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{icon}{label}</div><p className="mt-2 text-xl font-bold text-slate-900">{value}</p></div>
}
