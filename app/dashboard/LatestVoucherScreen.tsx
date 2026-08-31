'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, FileText, Loader2, Package, Phone, ReceiptText, Search, Trash2, UserRound, X } from 'lucide-react'
import styles from './latest-voucher-modal.module.css'

type Item = { id: string; sku?: string | null; product_name?: string | null; unit_name?: string | null; quantity: number; unit_price: number; discount_amount?: number; line_total: number }
type Party = { id?: string; name?: string | null; phone?: string | null; party_type?: string | null }
type Voucher = { id: string; invoice_no: string; status: string; subtotal: number; discount_amount: number; grand_total: number; notes?: string | null; sold_at?: string | null; purchased_at?: string | null; completed_at?: string | null; created_at: string; party?: Party | Party[] | null; items?: Item[] }
type PaymentSummary = { grand_total: number; paid_amount: number; balance_amount: number; payment_status?: string | null }

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const partyName = (voucher: Voucher, fallback: string) => Array.isArray(voucher.party) ? (voucher.party[0]?.name || fallback) : (voucher.party?.name || fallback)
const partyPhone = (voucher: Voucher) => Array.isArray(voucher.party) ? voucher.party[0]?.phone : voucher.party?.phone
const voucherDate = (voucher: Voucher) => {
  const raw = voucher.sold_at || voucher.purchased_at || voucher.created_at
  const date = new Date(raw)
  return `${date.toLocaleDateString('en-IN')} · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

export default function LatestVoucherScreen() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'sales' | 'purchases'>('sales')
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [selected, setSelected] = useState<Voucher | null>(null)
  const [payment, setPayment] = useState<PaymentSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  async function load(kind: 'sales' | 'purchases') {
    setLoading(true)
    try {
      const response = await fetch(kind === 'sales' ? '/api/sales' : '/api/purchases', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load vouchers')
      const rows = (kind === 'sales' ? body.invoices : body.purchases) || []
      setVouchers(rows.slice(0, 100))
      setSelected(rows[0] || null)
    } catch {
      setVouchers([])
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }

  async function selectVoucher(voucher: Voucher) {
    setSelected(voucher)
    setPayment(null)
    if (type !== 'sales') return
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/sales/${voucher.id}/payment`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (response.ok) setPayment(body.summary || null)
    } finally {
      setDetailLoading(false)
    }
  }

  function openScreen(kind: 'sales' | 'purchases') {
    setType(kind)
    setSearch('')
    setSelectedIds([])
    setOpen(true)
    void load(kind)
  }

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const button = target?.closest('button')
      if (!button || !/vouchers/i.test(button.textContent || '')) return
      const path = window.location.pathname
      if (!path.endsWith('/dashboard/sales') && !path.endsWith('/dashboard/purchases')) return
      event.preventDefault()
      event.stopPropagation()
      openScreen(path.endsWith('/dashboard/purchases') ? 'purchases' : 'sales')
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  const filtered = vouchers.filter(voucher => {
    const haystack = `${voucher.invoice_no} ${partyName(voucher, type === 'sales' ? 'Walk-in Customer' : 'Walk-in / Other')} ${partyPhone(voucher) || ''}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  const latest = filtered.slice(0, 20)
  const draftVouchers = latest.filter(v => v.status === 'draft')
  const allDraftSelected = type === 'purchases' && draftVouchers.length > 0 && draftVouchers.every(v => selectedIds.includes(v.id))

  async function deleteSelected() {
    if (!selectedIds.length || deleting) return
    if (!window.confirm(`Delete ${selectedIds.length} selected draft purchase${selectedIds.length === 1 ? '' : 's'}?`)) return
    setDeleting(true)
    try {
      const response = await fetch('/api/purchases', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (!response.ok) throw new Error()
      setSelectedIds([])
      await load('purchases')
    } finally {
      setDeleting(false)
    }
  }

  if (!open) return null

  return (
    <div className={`${styles.modalRoot} fixed inset-0 z-[120] bg-slate-950/60 p-0 sm:p-4`} role="dialog" aria-modal="true" aria-labelledby="latest-vouchers-title">
      <div className="mx-auto flex h-full max-h-[92vh] w-full flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:my-2 sm:rounded-3xl">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-emerald-700" />
                <h1 id="latest-vouchers-title" className="text-xl font-black text-black">Latest 20 Purchase Vouchers</h1>
              </div>
              <p className="mt-1 text-xs font-semibold text-black">Review purchase history and safely remove drafts.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => openScreen('sales')} className={`rounded-xl px-4 py-2 text-xs font-black ${type === 'sales' ? 'bg-emerald-700 text-white' : 'border border-slate-300 bg-white text-black'}`}>Sales</button>
            <button type="button" onClick={() => openScreen('purchases')} className={`rounded-xl px-4 py-2 text-xs font-black ${type === 'purchases' ? 'bg-emerald-700 text-white' : 'border border-slate-300 bg-white text-black'}`}>Purchases</button>
            <div className="relative min-w-0 flex-1 sm:min-w-[260px] sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invoice, party or mobile..." aria-label="Search vouchers" className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm font-semibold text-black outline-none focus:border-emerald-600" />
            </div>
            {type === 'purchases' && (
              <>
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-black">
                  <input type="checkbox" checked={allDraftSelected} onChange={() => setSelectedIds(allDraftSelected ? [] : draftVouchers.map(v => v.id))} className="h-4 w-4" />
                  Select draft purchases
                </label>
                <button type="button" onClick={() => void deleteSelected()} disabled={!selectedIds.length || deleting} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">
                  <Trash2 className="h-4 w-4" />{deleting ? 'Deleting…' : 'Delete Selected'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[350px_minmax(0,1fr)]">
          <section className="min-h-0 overflow-x-hidden overflow-y-auto border-b border-slate-200 lg:border-b-0 lg:border-r" aria-label="Latest vouchers">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-black">
              Select <span className="mx-2">·</span> Voucher <span className="mx-2">·</span> Supplier
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div>
            ) : latest.map(voucher => (
              <div key={voucher.id} className={`border-b border-slate-200 ${selected?.id === voucher.id ? 'bg-emerald-50' : 'bg-white'} hover:bg-emerald-50`}>
                <div className="grid grid-cols-[64px_200px_minmax(0,1fr)] items-center gap-2 px-4 py-3 sm:grid-cols-[72px_210px_minmax(0,1fr)]">
                  {type === 'purchases' ? (
                    <label className="flex min-h-10 cursor-pointer items-center justify-center" aria-label={`Select ${voucher.invoice_no}`}>
                      <input type="checkbox" checked={selectedIds.includes(voucher.id)} disabled={voucher.status !== 'draft'} onClick={event => event.stopPropagation()} onChange={() => setSelectedIds(ids => ids.includes(voucher.id) ? ids.filter(id => id !== voucher.id) : [...ids, voucher.id])} className="h-5 w-5" />
                    </label>
                  ) : <span />}

                  <button type="button" onClick={() => void selectVoucher(voucher)} className="min-w-0 text-left" aria-label={`Open ${voucher.invoice_no}`}>
                    <span className="block whitespace-nowrap text-sm font-black text-black underline decoration-slate-400 underline-offset-2">{voucher.invoice_no}</span>
                    <span className="mt-1 block whitespace-nowrap text-[11px] font-semibold text-slate-600">{voucherDate(voucher)}</span>
                  </button>

                  <button type="button" onClick={() => void selectVoucher(voucher)} className="min-w-0 text-left" aria-label={`Open ${voucher.invoice_no} for ${partyName(voucher, type === 'sales' ? 'Walk-in Customer' : 'Walk-in / Other')}`}>
                    <span className="block break-words text-sm font-black leading-5 text-black">{partyName(voucher, type === 'sales' ? 'Walk-in Customer' : 'Walk-in / Other')}</span>
                    <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-xs font-black text-black">{money(voucher.grand_total)}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${voucher.status === 'draft' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{voucher.status}</span>
                    </span>
                  </button>
                </div>
              </div>
            ))}

            {!latest.length && !loading && <div className="p-10 text-center text-sm font-bold text-slate-600">No vouchers found.</div>}
          </section>

          <section className="min-h-0 overflow-y-auto bg-slate-50/60 p-4 sm:p-6" aria-label="Voucher details">
            {!selected ? (
              <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">Select a voucher to view all details.</div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">{type === 'sales' ? 'Sales Invoice' : 'Purchase Invoice'}</p>
                      <h2 className="mt-1 text-2xl font-black tracking-tight text-black">{selected.invoice_no}</h2>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${selected.status === 'draft' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />{selected.status}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Info icon={<CalendarDays />} label="Invoice date" value={voucherDate(selected)} />
                    <Info icon={<UserRound />} label={type === 'sales' ? 'Customer' : 'Supplier'} value={partyName(selected, type === 'sales' ? 'Walk-in Customer' : 'Walk-in / Other')} />
                    <Info icon={<Phone />} label="Mobile" value={partyPhone(selected) || 'Not provided'} />
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
                    <Package className="h-4 w-4 text-emerald-700" />
                    <h3 className="text-sm font-black text-black">Invoice Items</h3>
                    <span className="text-xs font-bold text-slate-500">{selected.items?.length || 0} items</span>
                  </div>
                  {selected.items?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-black">
                          <tr><th className="px-5 py-3 text-left">Product</th><th className="px-3 py-3 text-left">SKU</th><th className="px-3 py-3 text-right">Qty</th><th className="px-3 py-3 text-right">Unit Price</th><th className="px-5 py-3 text-right">Line Total</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selected.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-5 py-3 font-black text-black">{item.product_name || 'Unnamed product'}{item.unit_name ? <span className="ml-1 text-xs font-semibold text-slate-500">({item.unit_name})</span>}{Number(item.discount_amount || 0) > 0 && <div className="text-[10px] font-bold text-slate-500">Discount: {money(Number(item.discount_amount))}</div>}</td>
                              <td className="px-3 py-3 font-bold text-black">{item.sku || '—'}</td>
                              <td className="px-3 py-3 text-right font-black text-black">{item.quantity}</td>
                              <td className="px-3 py-3 text-right font-bold text-black">{money(item.unit_price)}</td>
                              <td className="px-5 py-3 text-right font-black text-black">{money(item.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <div className="p-8 text-center text-sm font-bold text-slate-600">No item lines are available for this voucher.</div>}
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-black text-black">Invoice Information</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <Info icon={<FileText />} label="Created" value={new Date(selected.created_at).toLocaleString('en-IN')} />
                      <Info icon={<CheckCircle2 />} label="Completed" value={selected.completed_at ? new Date(selected.completed_at).toLocaleString('en-IN') : 'Not completed'} />
                      <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Notes</div><div className="mt-1 font-semibold text-black">{selected.notes || 'No notes added'}</div></div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-black text-black">Amount Summary</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <Row label="Subtotal" value={money(selected.subtotal)} />
                      <Row label="Discount" value={money(selected.discount_amount)} />
                      <div className="mt-4 rounded-xl bg-amber-50 px-4 py-4"><Row label="Grand Total" value={money(selected.grand_total)} strong /></div>
                    </div>
                  </div>
                </div>

                {type === 'sales' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-black text-black">Payment</h3>
                    {detailLoading ? (
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading payment details…</div>
                    ) : payment ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <Info icon={<ReceiptText />} label="Payment status" value={payment.payment_status || 'Not available'} />
                        <Info icon={<CheckCircle2 />} label="Amount paid" value={money(payment.paid_amount)} />
                        <Info icon={<FileText />} label="Balance" value={money(payment.balance_amount)} />
                      </div>
                    ) : <p className="mt-3 text-xs font-semibold text-slate-600">Payment details are not available for this voucher.</p>}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-3"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">{icon}<span>{label}</span></div><div className="mt-1 break-words text-sm font-black text-black">{value}</div></div>
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-4"><span className={strong ? 'font-black text-black' : 'font-bold text-slate-700'}>{label}</span><span className={strong ? 'text-lg font-black text-black' : 'font-black text-black'}>{value}</span></div>
}
