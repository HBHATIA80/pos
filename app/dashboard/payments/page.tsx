'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, Loader2, Plus, ReceiptText, RefreshCw, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'

type Party = { id: string; name: string; party_type: 'customer' | 'supplier' | 'both' }
type Invoice = { id: string; invoice_no: string; grand_total: number; status: string; party_id: string | null; parties?: Party | null }
type Voucher = { id: string; voucher_no: string; voucher_type: 'receipt' | 'payment'; party_id: string | null; payment_method: string; account_name: string | null; amount: number; reference_no: string | null; notes: string | null; paid_at: string; parties?: Party | null }
type SalePayment = { id: string; receipt_no: string; payment_method: string; amount: number; reference_no: string | null; notes: string | null; paid_at: string; invoice_id: string; parties?: Party | null; sales_invoices?: { invoice_no: string; grand_total: number } | null }

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const todayInput = () => { const d = new Date(); const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }

export default function PaymentsPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [salePayments, setSalePayments] = useState<SalePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'receipt' | 'payment'>('receipt')
  const [form, setForm] = useState({ party_id: '', invoice_id: '', payment_method: 'cash', account_name: 'Cash', amount: '', reference_no: '', notes: '', paid_at: todayInput() })

  async function load() {
    setLoading(true)
    try {
      const [voucherResponse, partyResponse, salesResponse] = await Promise.all([fetch('/api/vouchers?limit=200', { cache: 'no-store' }), fetch('/api/parties', { cache: 'no-store' }), fetch('/api/sales', { cache: 'no-store' })])
      const [voucherJson, partyJson, salesJson] = await Promise.all([voucherResponse.json(), partyResponse.json(), salesResponse.json()])
      if (!voucherResponse.ok) throw new Error(voucherJson.error || 'Unable to load vouchers')
      if (!partyResponse.ok) throw new Error(partyJson.error || 'Unable to load parties')
      if (!salesResponse.ok) throw new Error(salesJson.error || 'Unable to load invoices')
      setVouchers(voucherJson.vouchers || [])
      setSalePayments(voucherJson.salePayments || [])
      setParties(partyJson.parties || [])
      setInvoices((salesJson.invoices || []).filter((x: Invoice) => x.status === 'completed'))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load accounts') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const receiptRows = useMemo(() => [
    ...salePayments.map(x => ({ id: `sale-${x.id}`, no: x.receipt_no, party: x.parties?.name || 'Walk-in', invoice: x.sales_invoices?.invoice_no || '—', method: x.payment_method, account: x.payment_method === 'cash' ? 'Cash' : 'Bank', amount: Number(x.amount), date: x.paid_at })),
    ...vouchers.filter(x => x.voucher_type === 'receipt').map(x => ({ id: `voucher-${x.id}`, no: x.voucher_no, party: x.parties?.name || 'Other / Cash Receipt', invoice: '—', method: x.payment_method, account: x.account_name || '—', amount: Number(x.amount), date: x.paid_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [salePayments, vouchers])

  const paymentRows = useMemo(() => vouchers.filter(x => x.voucher_type === 'payment').sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()), [vouchers])
  const receivedTotal = receiptRows.reduce((n, x) => n + x.amount, 0)
  const paidTotal = paymentRows.reduce((n, x) => n + Number(x.amount), 0)

  function change(key: string, value: string) { setForm(current => ({ ...current, [key]: value })) }
  function chooseTab(type: 'receipt' | 'payment') {
    setTab(type)
    setForm(current => ({ ...current, party_id: '', invoice_id: '', amount: '', reference_no: '', notes: '', paid_at: todayInput(), account_name: type === 'receipt' ? 'Cash' : 'Cash' }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount')
    if (tab === 'payment' && !form.party_id && !form.account_name.trim()) return toast.error('Select a party or enter the account name')
    setSaving(true)
    const response = await fetch('/api/vouchers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voucher_type: tab, party_id: form.party_id || null, invoice_id: tab === 'receipt' ? (form.invoice_id || null) : null, payment_method: form.payment_method, account_name: form.account_name, amount: Number(form.amount), reference_no: form.reference_no, notes: form.notes, paid_at: new Date(form.paid_at).toISOString() }) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) return toast.error(result.error || 'Unable to save entry')
    toast.success(tab === 'receipt' ? 'Receipt saved' : 'Payment saved')
    setForm(current => ({ ...current, amount: '', reference_no: '', notes: '', invoice_id: '', paid_at: todayInput() }))
    void load()
  }

  return <div className="mx-auto max-w-7xl space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CreditCard className="h-6 w-6" /></span><div><span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Phase 12 · Accounts</span><h1 className="mt-1 text-2xl font-bold">Payments & Receipts</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Record money received from customers/parties or money paid to suppliers/parties, just like a Busy-style accounting voucher.</p></div></div>
        <button onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><Stat icon={<ArrowDownLeft className="h-5 w-5" />} label="Total received" value={money(receivedTotal)} /><Stat icon={<ArrowUpRight className="h-5 w-5" />} label="Total paid" value={money(paidTotal)} /></div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-200"><button onClick={() => chooseTab('receipt')} className={`flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-bold ${tab === 'receipt' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}><ArrowDownLeft className="h-4 w-4" /> Receipt (Money In)</button><button onClick={() => chooseTab('payment')} className={`flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-bold ${tab === 'payment' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}><ArrowUpRight className="h-4 w-4" /> Payment (Money Out)</button></div>
      <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
        <div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">{tab === 'receipt' ? <WalletCards className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}</span><div><h2 className="font-semibold">{tab === 'receipt' ? 'Receipt Voucher' : 'Payment Voucher'}</h2><p className="text-xs text-slate-500">{tab === 'receipt' ? 'Customer/party pays us.' : 'We pay supplier/party or another account.'}</p></div></div></div>
        <div className="grid gap-4 lg:grid-cols-3"><SelectField label="Party / Account" value={form.party_id} onChange={v => change('party_id', v)} options={[['', tab === 'receipt' ? 'Walk-in / Other account' : 'Other account / Expense'], ...parties.filter(p => tab === 'receipt' ? p.party_type === 'customer' || p.party_type === 'both' : p.party_type === 'supplier' || p.party_type === 'both').map(p => [p.id, `${p.name} · ${p.party_type}`])]} /><SelectField label="Payment mode" value={form.payment_method} onChange={v => { change('payment_method', v); change('account_name', v === 'cash' ? 'Cash' : v === 'bank' ? 'Bank' : v.toUpperCase()) }} options={ [['cash','Cash'],['bank','Bank / Cheque'],['upi','UPI'],['card','Card'],['cheque','Cheque'],['other','Other']] } /><NumberField label="Amount" value={form.amount} onChange={v => change('amount', v)} required /></div>
        {tab === 'receipt' && <div className="grid gap-4 lg:grid-cols-2"><SelectField label="Against sales invoice (optional)" value={form.invoice_id} onChange={v => change('invoice_id', v)} options={[['','General party receipt / advance'], ...invoices.filter(i => !form.party_id || i.party_id === form.party_id).map(i => [i.id, `${i.invoice_no} · ${money(i.grand_total)}${i.parties?.name ? ` · ${i.parties.name}` : ''}`])]} /><Field label="Account / counter" value={form.account_name} onChange={v => change('account_name', v)} placeholder="Cash, HDFC Bank, SBI, etc." /></div>}
        {tab === 'payment' && <div className="grid gap-4 lg:grid-cols-2"><Field label="Account / cash-bank" value={form.account_name} onChange={v => change('account_name', v)} placeholder="Cash, HDFC Bank, SBI, etc." /><Field label="Reference / cheque / UTR" value={form.reference_no} onChange={v => change('reference_no', v)} /></div>}
        {tab === 'receipt' && <div className="grid gap-4 lg:grid-cols-2"><Field label="Reference / cheque / UTR" value={form.reference_no} onChange={v => change('reference_no', v)} /><Field label="Date & time" type="datetime-local" value={form.paid_at} onChange={v => change('paid_at', v)} /></div>}
        {tab === 'payment' && <div><Field label="Date & time" type="datetime-local" value={form.paid_at} onChange={v => change('paid_at', v)} /></div>}
        <TextArea label="Narration / Notes" value={form.notes} onChange={v => change('notes', v)} placeholder="Being cash received / paid against account..." />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setForm(current => ({ ...current, amount: '', reference_no: '', notes: '', invoice_id: '' }))} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700">Clear</button><button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white disabled:opacity-60"><Plus className="h-4 w-4" />{saving ? 'Saving…' : `Save ${tab === 'receipt' ? 'Receipt' : 'Payment'}`}</button></div>
      </form>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-semibold">{tab === 'receipt' ? 'Receipt Register' : 'Payment Register'}</h2><p className="text-xs text-slate-500">{tab === 'receipt' ? `${receiptRows.length} entries · money received` : `${paymentRows.length} entries · money paid`}</p></div><ReceiptText className="h-5 w-5 text-slate-400" /></div>{loading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" /></div> : tab === 'receipt' ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Receipt No.</th><th className="p-3">Party</th><th className="p-3">Invoice</th><th className="p-3">Mode</th><th className="p-3">Account</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y">{receiptRows.map(x => <tr key={x.id}><td className="p-3 text-slate-500">{new Date(x.date).toLocaleString('en-IN')}</td><td className="p-3 font-semibold">{x.no}</td><td className="p-3">{x.party}</td><td className="p-3">{x.invoice}</td><td className="p-3 capitalize">{x.method}</td><td className="p-3">{x.account}</td><td className="p-3 text-right font-bold">{money(x.amount)}</td></tr>)}</tbody></table></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Payment No.</th><th className="p-3">Party</th><th className="p-3">Mode</th><th className="p-3">Account</th><th className="p-3">Reference</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y">{paymentRows.map(x => <tr key={x.id}><td className="p-3 text-slate-500">{new Date(x.paid_at).toLocaleString('en-IN')}</td><td className="p-3 font-semibold">{x.voucher_no}</td><td className="p-3">{x.parties?.name || 'Other account'}</td><td className="p-3 capitalize">{x.payment_method}</td><td className="p-3">{x.account_name || '—'}</td><td className="p-3">{x.reference_no || '—'}</td><td className="p-3 text-right font-bold">{money(Number(x.amount))}</td></tr>)}</tbody></table></div>}</section>
  </div>
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">{icon}</span><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p></div></div> }
function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span><input required={required} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> }
function NumberField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) { return <Field label={label} value={value} onChange={onChange} type="number" required={required} /> }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[][] }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span><select value={value} onChange={e => onChange(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></label> }
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span><textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> }
