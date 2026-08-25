'use client'

import { useEffect, useState } from 'react'
import { FileText, Loader2, X } from 'lucide-react'

type InvoiceItem = { id: string; sku: string | null; product_name: string; unit_name: string | null; quantity: number; unit_price: number; discount_amount: number; line_total: number }
type Invoice = { id: string; invoice_no: string; kind: 'purchase' | 'sale'; status: string; party?: { id: string; name: string; phone?: string | null; party_type?: string } | null; subtotal: number; discount_amount: number; grand_total: number; notes?: string | null; date: string | null; created_at: string; items: InvoiceItem[] }
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function InvoiceViewer({ enabled }: { enabled: boolean }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return
    const mark = () => document.querySelectorAll<HTMLTableCellElement>('td').forEach((cell) => {
      const value = cell.textContent?.trim() || ''
      if (/^(PI|SI)-\d{8}$/.test(value)) {
        cell.dataset.invoiceNumber = value
        cell.style.cursor = 'pointer'
        cell.title = 'Click to view invoice'
      }
    })
    const observer = new MutationObserver(mark)
    mark()
    observer.observe(document.body, { subtree: true, childList: true, characterData: true })
    return () => observer.disconnect()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const onClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const cell = target?.closest('td') as HTMLTableCellElement | null
      const invoiceNo = cell?.dataset.invoiceNumber || ''
      if (!invoiceNo) return
      event.preventDefault(); event.stopPropagation()
      const kind = invoiceNo.startsWith('PI-') ? 'purchase' : 'sale'
      setLoading(true); setError(''); setInvoice(null)
      try {
        const response = await fetch(`/api/invoices/${kind}/${encodeURIComponent(invoiceNo)}`, { cache: 'no-store' })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || 'Unable to load invoice')
        setInvoice(body.invoice)
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load invoice') }
      finally { setLoading(false) }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [enabled])

  if (!enabled || (!invoice && !loading && !error)) return null
  const close = () => { setInvoice(null); setError('') }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><FileText className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">{invoice?.kind === 'purchase' ? 'Purchase Invoice' : 'Sales Invoice'}</p><h2 className="text-lg font-black text-slate-950">{invoice?.invoice_no || 'Invoice'}</h2></div></div><button type="button" onClick={close} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button></div>
      {loading && <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>}
      {error && !loading && <div className="p-10 text-center text-sm font-semibold text-red-600">{error}</div>}
      {invoice && !loading && <div className="overflow-y-auto p-5 sm:p-6">
        <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{invoice.kind === 'purchase' ? 'Supplier' : 'Customer'}</p><p className="mt-1 font-black text-slate-900">{invoice.party?.name || 'Walk-in / Other'}</p>{invoice.party?.phone && <p className="text-xs text-slate-500">{invoice.party.phone}</p>}</div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Date</p><p className="mt-1 font-semibold text-slate-900">{new Date(invoice.date || invoice.created_at).toLocaleString('en-IN')}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</p><span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">{invoice.status}</span></div></div>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[650px] text-sm"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Item</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Discount</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{invoice.items.map((item) => <tr key={item.id}><td className="p-3"><p className="font-bold text-slate-800">{item.product_name}</p><p className="text-xs text-slate-500">{item.sku || ''}</p></td><td className="p-3 text-center">{item.quantity} {item.unit_name || ''}</td><td className="p-3 text-right">{money(item.unit_price)}</td><td className="p-3 text-right">{money(item.discount_amount)}</td><td className="p-3 text-right font-black">{money(item.line_total)}</td></tr>)}</tbody></table></div>
        <div className="mt-5 ml-auto max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{money(invoice.subtotal)}</span></div><div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-semibold">{money(invoice.discount_amount)}</span></div><div className="flex justify-between border-t border-dashed pt-3 text-base"><span className="font-black">Grand Total</span><span className="text-xl font-black">{money(invoice.grand_total)}</span></div></div>
        {invoice.notes && <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><b>Notes:</b> {invoice.notes}</div>}
      </div>}
    </div>
  </div>
}
