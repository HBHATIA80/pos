'use client'

import { useEffect, useState } from 'react'
import { Loader2, Printer } from 'lucide-react'

type Receipt = {
  id: string
  receipt_no: string
  payment_method: string
  amount: number
  reference_no: string | null
  notes: string | null
  paid_at: string
  invoice_id: string
  sales_invoices: { invoice_no: string; grand_total: number; party_id: string | null }
  parties: { id: string; name: string; phone: string | null } | null
}

const money = (value: number) => `₹${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void params.then(async ({ id }) => {
      try {
        const response = await fetch(`/api/payments/${id}/receipt`, { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error ?? 'Unable to load receipt')
        setReceipt(result.receipt ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load receipt')
      }
    })
  }, [params])

  if (error) return <main className="mx-auto max-w-xl p-6 text-center text-sm text-red-600">{error}</main>
  if (!receipt) return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></main>

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8 print:max-w-none print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
          <Printer className="h-4 w-4" /> Print Receipt
        </button>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:shadow-none sm:p-10">
        <header className="border-b border-slate-200 pb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Payment Receipt</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{receipt.receipt_no}</h1>
          <p className="mt-2 text-sm text-slate-500">{dateTime(receipt.paid_at)}</p>
        </header>

        <section className="grid gap-5 border-b border-slate-200 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Received From</p>
            <p className="mt-1 font-semibold text-slate-900">{receipt.parties?.name ?? 'Walk-in Customer'}</p>
            {receipt.parties?.phone && <p className="text-sm text-slate-500">{receipt.parties.phone}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice</p>
            <p className="mt-1 font-semibold text-slate-900">{receipt.sales_invoices.invoice_no}</p>
            <p className="text-sm text-slate-500">Invoice total {money(Number(receipt.sales_invoices.grand_total))}</p>
          </div>
        </section>

        <section className="py-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount Received</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{money(Number(receipt.amount))}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Method</p>
              <p className="mt-2 font-semibold capitalize text-slate-900">{receipt.payment_method}</p>
            </div>
          </div>
        </section>

        {(receipt.reference_no || receipt.notes) && (
          <section className="border-t border-slate-200 pt-5 text-sm">
            {receipt.reference_no && <p><span className="font-semibold text-slate-700">Reference:</span> {receipt.reference_no}</p>}
            {receipt.notes && <p className="mt-2"><span className="font-semibold text-slate-700">Notes:</span> {receipt.notes}</p>}
          </section>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
          Payment recorded against invoice {receipt.sales_invoices.invoice_no}.
        </footer>
      </article>
    </main>
  )
}
