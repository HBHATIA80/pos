'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Edit3, FileText, Loader2, MessageCircle, Plus, Save, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { buildInvoicePdf } from './invoice-pdf'

type InvoiceItem = { id: string; product_id: string; sku: string | null; product_name: string; unit_name: string | null; quantity: number; unit_price: number; discount_amount: number; line_total: number }
type Invoice = { id: string; invoice_no: string; kind: 'purchase' | 'sale'; status: string; party_id?: string | null; party?: { id: string; name: string; phone?: string | null; party_type?: string } | null; subtotal: number; discount_amount: number; grand_total: number; notes?: string | null; date: string | null; created_at: string; items: InvoiceItem[] }
type EditLine = { product_id: string; product_name: string; sku: string | null; unit_name: string | null; quantity: number; unit_price: number; discount_amount: number }
type Product = { id: string; sku: string; name: string; unit_id: string; purchase_price: number; sale_price: number; catalog_units?: { short_name?: string | null } | null }

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const localDateTime = (value: string | null) => { const d = value ? new Date(value) : new Date(); const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }

function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

export default function InvoiceViewer({ enabled }: { enabled: boolean }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [editLines, setEditLines] = useState<EditLine[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [editDate, setEditDate] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const mark = () => document.querySelectorAll<HTMLTableCellElement>('td').forEach((cell) => {
      const value = cell.textContent?.trim() || ''
      if (/^(PI|SI)-\d{8,}$/.test(value)) { cell.dataset.invoiceNumber = value; cell.style.cursor = 'pointer'; cell.title = 'Click to view and edit invoice'; cell.style.color = 'rgb(22 101 52)'; cell.style.textDecoration = 'underline'; cell.style.textUnderlineOffset = '2px' }
    })
    const observer = new MutationObserver(mark); mark(); observer.observe(document.body, { subtree: true, childList: true, characterData: true }); return () => observer.disconnect()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const onClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const linked = target?.closest('[data-invoice-number]') as HTMLElement | null
      const cell = target?.closest('td') as HTMLTableCellElement | null
      const invoiceNo = linked?.dataset.invoiceNumber || cell?.dataset.invoiceNumber || ''
      if (!invoiceNo) return
      event.preventDefault(); event.stopPropagation()
      const kind = invoiceNo.startsWith('PI-') ? 'purchase' : 'sale'
      setLoading(true); setError(''); setInvoice(null); setEditing(false)
      try {
        const response = await fetch(`/api/invoices/${kind}/${encodeURIComponent(invoiceNo)}`, { cache: 'no-store' })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || 'Unable to load invoice')
        setInvoice(body.invoice as Invoice)
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load invoice') } finally { setLoading(false) }
    }
    document.addEventListener('click', onClick, true); return () => document.removeEventListener('click', onClick, true)
  }, [enabled])

  const close = () => { if (!saving && !pdfBusy) { setInvoice(null); setError(''); setEditing(false) } }
  const beginEdit = () => {
    if (!invoice) return
    setEditLines(invoice.items.map((item) => ({ product_id: item.product_id, product_name: item.product_name, sku: item.sku, unit_name: item.unit_name, quantity: Number(item.quantity), unit_price: Number(item.unit_price), discount_amount: Number(item.discount_amount) })))
    setEditNotes(invoice.notes || ''); setEditDate(localDateTime(invoice.date || invoice.created_at)); setProductSearch(''); setEditing(true)
  }
  const editSubtotal = useMemo(() => editLines.reduce((sum, item) => sum + item.quantity * item.unit_price, 0), [editLines])
  const editDiscount = useMemo(() => editLines.reduce((sum, item) => sum + item.discount_amount, 0), [editLines])
  const editTotal = editSubtotal - editDiscount

  async function searchProducts(value: string) {
    setProductSearch(value); if (value.trim().length < 2) { setProducts([]); return }
    setProductsLoading(true)
    try { const response = await fetch(`/api/catalog?entity=products&q=${encodeURIComponent(value.trim())}&limit=20`, { cache: 'no-store' }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to search products'); setProducts(body.products || []) }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to search products') }
    finally { setProductsLoading(false) }
  }

  function addProduct(product: Product) {
    setEditLines((current) => {
      const existing = current.findIndex((line) => line.product_id === product.id)
      if (existing >= 0) return current.map((line, i) => i === existing ? { ...line, quantity: line.quantity + 1 } : line)
      return [...current, { product_id: product.id, product_name: product.name, sku: product.sku, unit_name: product.catalog_units?.short_name || 'unit', quantity: 1, unit_price: Number(invoice?.kind === 'purchase' ? product.purchase_price : product.sale_price), discount_amount: 0 }]
    })
    setProductSearch(''); setProducts([])
  }

  function updateLine(index: number, field: 'quantity' | 'unit_price' | 'discount_amount', value: string) {
    const numeric = Number(value); if (!Number.isFinite(numeric) || numeric < 0) return
    setEditLines((current) => current.map((line, i) => i === index ? { ...line, [field]: numeric } : line))
  }

  function downloadPdfFile(currentInvoice: Invoice) {
    const blob = buildInvoicePdf(currentInvoice)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `${currentInvoice.invoice_no}.pdf`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
  }

  async function downloadPdf() {
    if (!invoice) return
    setPdfBusy(true)
    try { downloadPdfFile(invoice); toast.success('Invoice PDF downloaded') }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to create invoice PDF') }
    finally { setPdfBusy(false) }
  }

  async function sharePdfToWhatsApp() {
    if (!invoice) return
    const phone = normalizeWhatsAppPhone(invoice.party?.phone || '')
    if (!phone) return toast.error('This party has no valid contact number')
    setPdfBusy(true)
    try {
      const blob = buildInvoicePdf(invoice)
      const file = new File([blob], `${invoice.invoice_no}.pdf`, { type: 'application/pdf' })
      const text = `BIZYBUK.IN ${invoice.kind === 'purchase' ? 'Purchase' : 'Sales'} Invoice ${invoice.invoice_no} - ${money(invoice.grand_total)}`
      const canFileShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare && navigator.canShare({ files: [file] })
      if (canFileShare) {
        await navigator.share({ title: invoice.invoice_no, text, files: [file] })
        toast.success('Share sheet opened. Choose WhatsApp to send the PDF.')
        return
      }
      downloadPdfFile(invoice)
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text + '\n\nThe invoice PDF has been downloaded. Attach the PDF in this WhatsApp chat.')}`, '_blank', 'noopener,noreferrer')
      toast.success('PDF downloaded and WhatsApp opened')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast.error(err instanceof Error ? err.message : 'Unable to share invoice PDF')
    } finally { setPdfBusy(false) }
  }

  async function saveEdit() {
    if (!invoice || !editLines.length) return toast.error('Invoice must contain at least one item')
    if (editLines.some((line) => line.quantity <= 0)) return toast.error('Quantity must be greater than zero')
    if (editLines.some((line) => line.discount_amount > line.quantity * line.unit_price)) return toast.error('Discount cannot exceed line value')
    setSaving(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.kind}/${encodeURIComponent(invoice.invoice_no)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ party_id: invoice.party_id || null, notes: editNotes, date: new Date(editDate).toISOString(), items: editLines.map((line) => ({ product_id: line.product_id, quantity: line.quantity, unit_price: line.unit_price, discount_amount: line.discount_amount })) }) })
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Unable to save invoice')
      toast.success(`${invoice.kind === 'sale' ? 'Sales' : 'Purchase'} invoice updated`); setEditing(false)
      const refreshed = await fetch(`/api/invoices/${invoice.kind}/${encodeURIComponent(invoice.invoice_no)}`, { cache: 'no-store' }); const refreshedBody = await refreshed.json().catch(() => ({})); if (refreshed.ok) setInvoice(refreshedBody.invoice)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to save invoice') } finally { setSaving(false) }
  }

  if (!enabled || (!invoice && !loading && !error)) return null

  return <div className="biz-invoice-viewer fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <div className="flex max-h-[calc(100vh-32px)] w-full max-w-[1280px] min-h-0 flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700"><FileText className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-green-700">{invoice?.kind === 'purchase' ? 'Purchase Invoice' : 'Sales Invoice'}</p><h2 className="truncate text-lg font-black text-slate-950">{invoice?.invoice_no || 'Invoice'}</h2></div></div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {invoice && !editing && <button type="button" onClick={beginEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4" /> Edit</button>}
          {invoice && !editing && <button type="button" onClick={() => void downloadPdf()} disabled={pdfBusy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download className="h-4 w-4" /> Download PDF</button>}
          {invoice && !editing && <button type="button" onClick={() => void sharePdfToWhatsApp()} disabled={pdfBusy} className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-3 py-2 text-sm font-black text-white hover:bg-green-800 disabled:opacity-50"><MessageCircle className="h-4 w-4" /> Share PDF to WhatsApp</button>}
          {editing && <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>}
          <button type="button" onClick={close} disabled={saving || pdfBusy} aria-label="Close invoice" className="rounded-xl bg-green-700 p-2 text-white hover:bg-green-800 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
      </div>

      {loading && <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-green-700" /></div>}
      {error && !loading && <div className="p-10 text-center text-sm font-semibold text-red-600">{error}</div>}

      {invoice && !loading && <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-5 sm:p-6">
        <div className="grid gap-3 rounded-2xl border border-green-100 bg-green-50/60 p-4 sm:grid-cols-[1.3fr_1fr_0.8fr]">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{invoice.kind === 'purchase' ? 'Supplier' : 'Customer'}</p><p className="mt-1 font-black text-slate-900">{invoice.party?.name || 'Walk-in / Other'}</p>{invoice.party?.phone && <p className="text-xs font-medium text-slate-500">{invoice.party.phone}</p>}</div>
          <div>{editing ? <><label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Invoice Date & Time</label><input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="mt-1 w-full rounded-lg border border-green-200 bg-white px-2 py-2 text-sm font-semibold outline-none focus:border-green-600" /></> : <><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Date</p><p className="mt-1 font-semibold text-slate-900">{new Date(invoice.date || invoice.created_at).toLocaleString('en-IN')}</p></>}</div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</p><span className="mt-1 inline-flex rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black uppercase text-green-800">{invoice.status}</span></div>
        </div>

        {editing && <div className="relative mt-4 rounded-2xl border border-slate-200 bg-white p-3"><label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">Add item</label><div className="flex items-center gap-2"><div className="relative flex-1"><input value={productSearch} onChange={(e) => void searchProducts(e.target.value)} placeholder="Search product by name or SKU..." className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-green-600" />{productSearch.length >= 2 && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">{productsLoading ? <div className="p-3 text-sm text-slate-500">Searching...</div> : products.length ? products.map((product) => <button key={product.id} type="button" onClick={() => addProduct(product)} className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 text-left hover:bg-green-50"><span><b>{product.name}</b><span className="ml-2 text-xs text-slate-500">{product.sku}</span></span><span className="text-xs font-bold text-slate-600">{money(invoice.kind === 'purchase' ? product.purchase_price : product.sale_price)}</span></button>) : <div className="p-3 text-sm text-slate-500">No products found</div>}</div>}</div><span className="inline-flex h-10 items-center gap-1 rounded-xl bg-green-50 px-3 text-xs font-bold text-green-800"><Plus className="h-4 w-4" /> Add</span></div></div>}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Item</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Discount</th><th className="p-3 text-right">Amount</th>{editing && <th className="w-10 p-3" />}</tr></thead>
            <tbody className="divide-y divide-slate-100">{editing ? editLines.map((item, index) => <tr key={`${item.product_id}-${index}`}><td className="p-3"><p className="font-bold text-slate-800">{item.product_name}</p><p className="text-xs text-slate-500">{item.sku || ''}</p></td><td className="p-3"><input type="number" min="0.001" step="any" value={item.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-center outline-none focus:border-green-600" /></td><td className="p-3 text-right"><input type="number" min="0" step="any" value={item.unit_price} onChange={(e) => updateLine(index, 'unit_price', e.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right outline-none focus:border-green-600" /></td><td className="p-3 text-right"><input type="number" min="0" step="any" value={item.discount_amount} onChange={(e) => updateLine(index, 'discount_amount', e.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right outline-none focus:border-green-600" /></td><td className="p-3 text-right font-black">{money(item.quantity * item.unit_price - item.discount_amount)}</td><td className="p-3 text-center"><button type="button" title="Delete item" onClick={() => setEditLines((current) => current.filter((_, i) => i !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></td></tr>) : invoice.items.map((item) => <tr key={item.id}><td className="p-3"><p className="font-bold text-slate-800">{item.product_name}</p><p className="text-xs text-slate-500">{item.sku || ''}</p></td><td className="p-3 text-center">{item.quantity} {item.unit_name || ''}</td><td className="p-3 text-right">{money(item.unit_price)}</td><td className="p-3 text-right">{money(item.discount_amount)}</td><td className="p-3 text-right font-black">{money(item.line_total)}</td></tr>)}</tbody>
          </table>
        </div>

        {editing && <div className="mt-4"><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Notes</label><textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-green-600" placeholder="Invoice notes" /></div>}
        <div className="mt-5 ml-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm"><div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{money(editing ? editSubtotal : invoice.subtotal)}</span></div><div className="mt-2 flex justify-between"><span className="text-slate-500">Discount</span><span className="font-semibold">{money(editing ? editDiscount : invoice.discount_amount)}</span></div><div className="mt-3 flex justify-between rounded-xl bg-amber-100 px-3 py-2.5 text-base"><span className="font-black">Grand Total</span><span className="text-xl font-black">{money(editing ? editTotal : invoice.grand_total)}</span></div></div>
        {invoice.notes && !editing && <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><b>Notes:</b> {invoice.notes}</div>}
        {editing && <div className="mt-5 flex justify-end"><button type="button" onClick={() => void saveEdit()} disabled={saving || editTotal < 0 || !editDate} className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-black text-white hover:bg-green-800 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button></div>}
      </div>}
    </div>
  </div>
}
