'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, FileText, Loader2, Package, RefreshCw, RotateCcw, Search, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'

type ReturnType = 'sale_return' | 'purchase_return'
type Party = { id: string; party_code?: string | null; name: string; phone?: string | null; party_type?: string }
type Invoice = { id: string; invoice_no: string; party_id: string; grand_total: number; sold_at?: string | null; purchased_at?: string | null }
type SourceItem = { id: string; product_id: string; sku: string; product_name: string; unit_name: string; quantity: number; unit_price: number; discount_amount: number; line_total: number; returned_quantity: number; remaining_quantity: number }
type ReturnLine = SourceItem & { return_quantity: number }
type SavedReturn = { id: string; return_no: string; return_type: ReturnType; status: string; return_date: string; grand_total: number; source_invoice_id: string | null; party?: { name?: string | null } | Array<{ name?: string | null }> | null }

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateLabel = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('en-IN') : '—'

export default function ReturnsPage() {
  const [type, setType] = useState<ReturnType>('sale_return')
  const [date, setDate] = useState('')
  const [parties, setParties] = useState<Party[]>([])
  const [partySearch, setPartySearch] = useState('')
  const [partyOpen, setPartyOpen] = useState(false)
  const [party, setParty] = useState<Party | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [sourceItems, setSourceItems] = useState<SourceItem[]>([])
  const [lines, setLines] = useState<ReturnLine[]>([])
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<SavedReturn[]>([])

  const total = useMemo(() => lines.reduce((sum, item) => sum + item.return_quantity * Number(item.unit_price) - Number(item.discount_amount || 0), 0), [lines])

  async function loadDate() {
    const response = await fetch('/api/invoice-date', { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))
    if (response.ok) setDate(body.date || '')
  }

  async function searchParties(query: string) {
    setLoading(true)
    try {
      const response = await fetch(`/api/pos/parties?q=${encodeURIComponent(query)}&limit=30`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load parties')
      setParties(body.parties || [])
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load parties') }
    finally { setLoading(false) }
  }

  async function loadInvoices(selectedParty: Party) {
    setInvoiceLoading(true)
    try {
      const response = await fetch(`/api/returns?type=${type}&party_id=${selectedParty.id}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load invoices')
      setInvoices(body.invoices || [])
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load invoices') }
    finally { setInvoiceLoading(false) }
  }

  async function loadInvoice(selected: Invoice) {
    setInvoiceLoading(true)
    try {
      const response = await fetch(`/api/returns?type=${type}&invoice_id=${selected.id}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load invoice')
      setInvoice(selected)
      const available = ((body.invoice?.items || []) as SourceItem[]).filter(item => Number(item.remaining_quantity) > 0)
      setSourceItems(available)
      setLines(available.map(item => ({ ...item, return_quantity: 0 })))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load invoice') }
    finally { setInvoiceLoading(false) }
  }

  async function loadHistory() {
    const response = await fetch('/api/returns', { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))
    if (response.ok) setHistory(body.returns || [])
  }

  useEffect(() => { void loadDate(); void searchParties(''); void loadHistory() }, [])
  useEffect(() => {
    if (party) { setInvoice(null); setSourceItems([]); setLines([]); void loadInvoices(party) }
    else { setInvoices([]); setInvoice(null); setSourceItems([]); setLines([]) }
  }, [type, party])

  function chooseParty(next: Party) {
    setParty(next); setPartySearch(''); setPartyOpen(false)
  }

  function setLineQuantity(id: string, raw: string) {
    const value = raw === '' ? 0 : Number(raw)
    if (!Number.isFinite(value)) return
    setLines(current => current.map(item => item.id === id ? { ...item, return_quantity: Math.min(Math.max(value, 0), Number(item.remaining_quantity)) } : item))
  }

  function resetForm() {
    setInvoice(null); setInvoices([]); setSourceItems([]); setLines([]); setParty(null); setPartySearch(''); setReason(''); setNotes('')
  }

  async function saveReturn() {
    const selectedLines = lines.filter(item => item.return_quantity > 0)
    if (!party) return toast.error('Select the party')
    if (!invoice) return toast.error('Select the original invoice')
    if (!selectedLines.length) return toast.error('Enter at least one return quantity')
    if (!date) return toast.error('Select the business date from the top date selector')
    setSaving(true)
    try {
      const response = await fetch('/api/returns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_date: date, data: {
          return_type: type, party_id: party.id, source_invoice_id: invoice.id, source_invoice_type: type === 'sale_return' ? 'sale' : 'purchase', reason, notes,
          items: selectedLines.map(item => ({ product_id: item.product_id, source_invoice_item_id: item.id, quantity: item.return_quantity, unit_price: Number(item.unit_price), discount_amount: 0 }))
        } })
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to save return')
      toast.success(`${body.return?.return_no || 'Return'} saved and posted`)
      resetForm(); await loadHistory()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save return') }
    finally { setSaving(false) }
  }

  async function voidReturn(id: string) {
    if (!window.confirm('Void this return? Stock and accounting will be reversed.')) return
    const response = await fetch('/api/returns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'void' }) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(body.error || 'Unable to void return')
    toast.success('Return voided; stock and ledger reversed')
    await loadHistory()
  }

  const partyName = (row: SavedReturn) => Array.isArray(row.party) ? row.party[0]?.name || 'Party' : row.party?.name || 'Party'

  return <div className="mx-auto max-w-[1500px] space-y-4 pb-8">
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white"><RotateCcw className="h-5 w-5" /></span><div className="min-w-0"><h1 className="truncate text-xl font-black text-slate-950">Sales & Purchase Returns</h1><p className="text-xs font-semibold text-slate-600">First-class return vouchers • stock + party accounting</p></div></div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 sm:justify-start"><FileText className="h-4 w-4 text-emerald-700" /><div><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Accounting date</div><div className="text-sm font-black text-slate-950">{date ? dateLabel(`${date}T00:00:00`) : 'Loading…'}</div></div></div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      <div className="grid gap-3 xl:grid-cols-[230px_minmax(240px,1fr)_minmax(280px,1fr)]">
        <div><label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Return type</label><div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setType('sale_return')} className={`min-h-11 rounded-lg px-2 text-xs font-black ${type === 'sale_return' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'}`}><ArrowDownLeft className="mx-auto mb-0.5 h-4 w-4" />Sale Return</button><button type="button" onClick={() => setType('purchase_return')} className={`min-h-11 rounded-lg px-2 text-xs font-black ${type === 'purchase_return' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'}`}><ArrowUpRight className="mx-auto mb-0.5 h-4 w-4" />Purchase Return</button></div></div>
        <div className="relative"><label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Party — all parties available</label><div className="flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3"><UserRound className="h-5 w-5 shrink-0 text-emerald-700" /><input value={party?.name || partySearch} onChange={e => { setParty(null); setPartySearch(e.target.value); setPartyOpen(true); void searchParties(e.target.value) }} onFocus={() => setPartyOpen(true)} placeholder="Search name, code or mobile" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />{loading && <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />}{party && <button type="button" onClick={() => chooseParty(null as any)}><X className="h-4 w-4 text-slate-500" /></button>}</div>{partyOpen && !party && <div className="absolute left-0 right-0 top-[72px] z-50 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl">{parties.slice(0, 15).map(item => <button type="button" key={item.id} onClick={() => chooseParty(item)} className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left hover:bg-emerald-50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-black text-emerald-800">{item.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{item.name}</span><span className="block truncate text-xs text-slate-500">{item.party_code || 'No code'} · {item.phone || 'No mobile'}</span></span></button>)}{!parties.length && <div className="p-4 text-sm text-slate-500">No parties found.</div>}</div>}</div>
        <div><label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Original invoice</label><select value={invoice?.id || ''} onChange={e => { const next = invoices.find(item => item.id === e.target.value); if (next) void loadInvoice(next) }} disabled={!party || invoiceLoading || !invoices.length} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100"><option value="">{invoiceLoading ? 'Loading invoices…' : party ? (invoices.length ? 'Select invoice' : 'No completed invoices') : 'Select party first'}</option>{invoices.map(item => <option key={item.id} value={item.id}>{item.invoice_no} • {money(Number(item.grand_total))} • {dateLabel(item.sold_at || item.purchased_at)}</option>)}</select></div>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-black text-slate-950">Return items</h2><p className="text-xs text-slate-500">Only quantities remaining on the original invoice can be returned.</p></div>{invoice && <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">{invoice.invoice_no}</span>}</div>
      {!invoice ? <div className="px-4 py-14 text-center"><Package className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Select a party and original invoice to begin.</p></div> : <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead className="bg-white text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3 text-left">Item</th><th className="px-3 py-3 text-right">Invoice Qty</th><th className="px-3 py-3 text-right">Returned</th><th className="px-3 py-3 text-right">Remaining</th><th className="px-3 py-3 text-right">Rate</th><th className="px-4 py-3 text-right">Return Qty</th></tr></thead><tbody>{lines.map(item => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3"><div className="font-black text-slate-950">{item.product_name}</div><div className="text-xs text-slate-500">{item.sku} · {item.unit_name}</div></td><td className="px-3 py-3 text-right font-semibold">{item.quantity}</td><td className="px-3 py-3 text-right text-slate-500">{item.returned_quantity}</td><td className="px-3 py-3 text-right font-black text-emerald-700">{item.remaining_quantity}</td><td className="px-3 py-3 text-right font-semibold">{money(Number(item.unit_price))}</td><td className="px-4 py-3 text-right"><input inputMode="decimal" type="number" min="0" max={item.remaining_quantity} step="0.001" value={item.return_quantity || ''} onChange={e => setLineQuantity(item.id, e.target.value)} className="h-11 w-28 rounded-lg border border-slate-300 px-3 text-right font-black outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></td></tr>)}</tbody></table></div>}
      <div className="border-t border-slate-200 bg-slate-50 p-4"><div className="grid gap-3 md:grid-cols-2"><div><label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Reason</label><input value={reason} onChange={e => setReason(e.target.value)} placeholder={type === 'sale_return' ? 'Customer returned goods' : 'Goods returned to supplier'} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none" /></div><div><label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional narration" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none" /></div></div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Return amount</div><div className="text-2xl font-black text-slate-950">{money(total)}</div></div><button type="button" onClick={() => void saveReturn()} disabled={saving || !invoice} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Complete {type === 'sale_return' ? 'Sale Return' : 'Purchase Return'}</button></div></div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h2 className="text-sm font-black">Recent return vouchers</h2><p className="text-xs text-slate-500">Posted returns remain in the party ledger and stock history.</p></div><button type="button" onClick={() => void loadHistory()} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Refresh returns"><RefreshCw className="h-4 w-4" /></button></div><div className="divide-y divide-slate-100">{history.slice(0, 12).map(row => <div key={row.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-black text-slate-950">{row.return_no}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">{row.return_type === 'sale_return' ? 'Sale Return' : 'Purchase Return'}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${row.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{row.status}</span></div><div className="mt-1 truncate text-xs font-semibold text-slate-500">{partyName(row)} · {dateLabel(row.return_date)} · {row.source_invoice_id ? 'Against original invoice' : 'General return'}</div></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className="font-black text-slate-950">{money(Number(row.grand_total))}</span>{row.status === 'completed' && <button type="button" onClick={() => void voidReturn(row.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-50">Void</button>}</div></div>)}{!history.length && <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No return vouchers yet.</div>}</div></section>
  </div>
}
