'use client'

import { useEffect, useState } from 'react'
import { Loader2, Printer, ReceiptText } from 'lucide-react'
import toast from 'react-hot-toast'

type Party = { name: string } | null
type SalePayment = { id: string; receipt_no: string; payment_method: string; amount: number; reference_no: string | null; notes: string | null; paid_at: string; parties?: Party; sales_invoices?: { invoice_no: string } | null }
type Voucher = { id: string; voucher_no: string; voucher_type: string; payment_method: string; account_name: string | null; amount: number; reference_no: string | null; notes: string | null; paid_at: string; parties?: Party }
type Receipt = { id: string; no: string; party: string; invoice: string; method: string; account: string; amount: number; reference: string | null; notes: string | null; paid_at: string }
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function ReceiptsPage() {
  const [rows, setRows] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/vouchers?type=receipt&limit=200', { cache: 'no-store' }).then(async response => {
      const json: { error?: string; salePayments?: SalePayment[]; vouchers?: Voucher[] } = await response.json()
      if (!response.ok) toast.error(json.error || 'Unable to load receipts')
      else {
        const invoiceRows = (json.salePayments || []).map(x => ({ id: `sale-${x.id}`, no: x.receipt_no, party: x.parties?.name || 'Walk-in customer', invoice: x.sales_invoices?.invoice_no || '—', method: x.payment_method, account: x.payment_method === 'cash' ? 'Cash' : 'Bank', amount: Number(x.amount), reference: x.reference_no, notes: x.notes, paid_at: x.paid_at }))
        const voucherRows = (json.vouchers || []).filter(x => x.voucher_type === 'receipt').map(x => ({ id: `voucher-${x.id}`, no: x.voucher_no, party: x.parties?.name || 'Other / Cash Receipt', invoice: '—', method: x.payment_method, account: x.account_name || '—', amount: Number(x.amount), reference: x.reference_no, notes: x.notes, paid_at: x.paid_at }))
        setRows([...invoiceRows, ...voucherRows].sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()))
      }
      setLoading(false)
    }).catch(() => { toast.error('Unable to load receipts'); setLoading(false) })
  }, [])

  return <div className="mx-auto max-w-7xl space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ReceiptText className="h-6 w-6" /></span><div><span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Phase 12 · Accounts</span><h1 className="mt-1 text-2xl font-bold">Receipts</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Print-ready receipts for invoice collections, party advances and general cash/bank receipts.</p></div></div></section>
    {loading ? <div className="rounded-2xl border bg-white p-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" /></div> : <div className="grid gap-4 md:grid-cols-2">{rows.map(x => <article key={x.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:shadow-none"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase text-slate-400">Receipt Voucher</p><h2 className="mt-1 text-xl font-bold">{x.no}</h2></div><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-slate-50"><Printer className="h-4 w-4" /> Print</button></div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Party</span><b>{x.party}</b></div><div className="flex justify-between"><span className="text-slate-500">Invoice</span><b>{x.invoice}</b></div><div className="flex justify-between"><span className="text-slate-500">Mode</span><b className="capitalize">{x.method}</b></div><div className="flex justify-between"><span className="text-slate-500">Account</span><b>{x.account}</b></div><div className="flex justify-between"><span className="text-slate-500">Reference</span><b>{x.reference || '—'}</b></div>{x.notes && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{x.notes}</p>}<div className="border-t pt-3 flex justify-between text-lg"><span>Received</span><b>{money(x.amount)}</b></div><p className="text-xs text-slate-400">{new Date(x.paid_at).toLocaleString('en-IN')}</p></div></article>)}</div>}
  </div>
}
