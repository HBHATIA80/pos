'use client'

import { useEffect, useMemo, useState } from 'react'
import { Banknote, Check, CreditCard, Loader2, Printer, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'

type PaymentMethod = 'cash' | 'bank' | 'party_transfer'
type PaymentSummary = { invoice_id: string; grand_total: number; paid_amount: number; balance_amount: number; payment_status: 'unpaid' | 'partial' | 'paid' }
type Party = { id: string; name: string; phone: string | null; party_type: 'customer' | 'supplier' | 'both'; is_staff?: boolean }
type PaymentDialogProps = { invoiceId: string | null; open: boolean; onClose: () => void; onPaymentSaved?: () => void }

export default function PaymentDialog({ invoiceId, open, onClose, onPaymentSaved }: PaymentDialogProps) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null)
  const [parties, setParties] = useState<Party[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [amount, setAmount] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [transferSearch, setTransferSearch] = useState('')
  const [transferPartyId, setTransferPartyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedPaymentId, setSavedPaymentId] = useState<string | null>(null)

  async function loadSummary() {
    if (!invoiceId) return
    setLoading(true)
    try {
      const [paymentResponse, partyResponse] = await Promise.all([
        fetch(`/api/sales/${invoiceId}/payment`, { cache: 'no-store' }),
        fetch('/api/parties', { cache: 'no-store' }),
      ])
      const result = await paymentResponse.json().catch(() => ({}))
      const partyResult = await partyResponse.json().catch(() => ({}))
      if (!paymentResponse.ok) throw new Error(result.error ?? 'Unable to load payment information')
      setSummary(result.summary ?? null)
      setCustomer(result.customer ?? null)
      setParties((partyResult.parties ?? []) as Party[])
      if (result.summary) setAmount(Number(result.summary.balance_amount).toFixed(2))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load payment information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && invoiceId) {
      setPaymentMethod('cash')
      setReferenceNo('')
      setNotes('')
      setTransferSearch('')
      setTransferPartyId('')
      setAmount('')
      setSavedPaymentId(null)
      void loadSummary()
    }
    if (!open) {
      setSummary(null)
      setCustomer(null)
      setParties([])
      setAmount('')
      setSavedPaymentId(null)
    }
  }, [open, invoiceId])

  const transferOptions = useMemo(() => {
    const query = transferSearch.trim().toLowerCase()
    return parties
      .filter(p => p.id !== customer?.id)
      .filter(p => !query || p.name.toLowerCase().includes(query) || (p.phone ?? '').toLowerCase().includes(query))
      .slice(0, 10)
  }, [parties, transferSearch, customer?.id])

  if (!open || !invoiceId) return null

  const total = Number(summary?.grand_total ?? 0)
  const paid = Number(summary?.paid_amount ?? 0)
  const balance = Number(summary?.balance_amount ?? 0)
  const selectedTransferParty = parties.find(p => p.id === transferPartyId) ?? null

  async function savePayment() {
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return toast.error('Enter a valid payment amount')
    if (numericAmount > balance) return toast.error(`Payment cannot exceed balance of ₹${balance.toFixed(2)}`)
    if (paymentMethod === 'party_transfer' && !transferPartyId) return toast.error('Select the party receiving the transfer')
    if (paymentMethod === 'party_transfer' && !customer) return toast.error('This invoice has no named customer, so a direct party transfer cannot be posted')
    setSaving(true)
    try {
      const response = await fetch(`/api/sales/${invoiceId}/payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: paymentMethod, amount: numericAmount, destination_party_id: paymentMethod === 'party_transfer' ? transferPartyId : null, reference_no: referenceNo, notes }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error ?? 'Unable to save payment')
      toast.success(paymentMethod === 'party_transfer' ? 'Direct transfer recorded and party ledgers updated' : 'Payment saved successfully')
      onPaymentSaved?.()
      if (result.payment?.id) setSavedPaymentId(result.payment.id)
      if (result.summary) {
        setSummary(result.summary)
        const nextBalance = Number(result.summary.balance_amount)
        setAmount(nextBalance > 0 ? nextBalance.toFixed(2) : '0.00')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save payment')
    } finally {
      setSaving(false)
    }
  }

  function printReceipt() {
    if (savedPaymentId) window.open(`/dashboard/sales/receipts/${savedPaymentId}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="biz-payment-overlay fixed inset-0 z-[10000] isolate flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="biz-payment-dialog relative z-10 w-full max-w-lg rounded-t-3xl border border-slate-200 bg-white text-slate-950 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 className="text-lg font-bold text-slate-950">Receive Payment</h2><p className="text-xs font-medium text-slate-600">Record money received against this invoice</p></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close payment dialog" className="rounded-xl border border-transparent p-2 text-slate-600 hover:border-slate-200 hover:bg-slate-100 disabled:opacity-40"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 p-5">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div> : <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Invoice</p><p className="mt-1 text-sm font-extrabold text-slate-950">₹{total.toFixed(2)}</p></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Paid</p><p className="mt-1 text-sm font-extrabold text-emerald-800">₹{paid.toFixed(2)}</p></div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Balance</p><p className="mt-1 text-sm font-extrabold text-amber-800">₹{balance.toFixed(2)}</p></div>
            </div>
            {savedPaymentId ? (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center"><Check className="mx-auto h-8 w-8 text-emerald-700" /><p className="mt-2 font-extrabold text-emerald-900">Payment Saved</p><p className="mt-1 text-sm font-medium text-emerald-800">The payment now has a printable receipt.</p><div className="mt-4 flex gap-3"><button type="button" onClick={printReceipt} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"><Printer className="h-4 w-4" /> Print Receipt</button><button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 hover:bg-slate-100">Done</button></div></div>
            ) : summary?.payment_status === 'paid' ? (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center"><Check className="mx-auto h-9 w-9 text-emerald-700" /><p className="mt-3 font-extrabold text-emerald-900">Invoice Fully Paid</p><p className="mt-1 text-sm font-medium text-emerald-800">There is no outstanding balance.</p></div>
            ) : <>
              <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-700">Payment Method</label><div className="grid grid-cols-3 gap-2">
                {(['cash', 'bank', 'party_transfer'] as PaymentMethod[]).map(method => <button key={method} type="button" onClick={() => { setPaymentMethod(method); if (method !== 'party_transfer') setTransferPartyId('') }} aria-pressed={paymentMethod === method} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold transition ${paymentMethod === method ? 'border-blue-700 bg-blue-50 text-blue-800 ring-2 ring-blue-200' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'}`}>{method === 'cash' ? <Banknote className="h-5 w-5" /> : method === 'bank' ? <CreditCard className="h-5 w-5" /> : <Users className="h-5 w-5" />}{method === 'cash' ? 'Cash' : method === 'bank' ? 'Bank' : 'Transfer to Party'}</button>)}
              </div></div>
              {paymentMethod === 'party_transfer' && <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-blue-800">Transfer directly to</p><p className="mt-1 text-xs text-slate-600">No cash or bank entry is created. The customer balance is reduced and the receiving party ledger is debited.</p></div>{selectedTransferParty && <button type="button" onClick={() => { setTransferPartyId(''); setTransferSearch('') }} className="rounded-lg p-1 hover:bg-white"><X className="h-4 w-4" /></button>}</div><input value={selectedTransferParty ? selectedTransferParty.name : transferSearch} onChange={e => { setTransferPartyId(''); setTransferSearch(e.target.value) }} placeholder="Search supplier, staff or other party" className="mt-3 min-h-12 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" autoComplete="off" />{!selectedTransferParty && <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">{transferOptions.map(p => <button key={p.id} type="button" onClick={() => { setTransferPartyId(p.id); setTransferSearch('') }} className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-3 text-left hover:bg-blue-50"><span><span className="block text-sm font-bold text-slate-950">{p.name}</span><span className="text-xs text-slate-500">{p.is_staff ? 'Staff' : p.party_type}</span></span><span className="text-xs text-slate-500">{p.phone ?? ''}</span></button>)}{transferOptions.length === 0 && <p className="p-4 text-sm text-slate-500">No matching parties</p>}</div>}</div>}
              <div><div className="mb-2 flex items-center justify-between"><label htmlFor="payment-amount" className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Amount Received</label><button type="button" onClick={() => setAmount(balance.toFixed(2))} className="text-xs font-bold text-blue-700 hover:text-blue-900">Pay full balance</button></div><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-600">₹</span><input id="payment-amount" type="number" min="0" max={balance} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-xl font-extrabold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="0.00" /></div></div>
              {paymentMethod === 'bank' && <div><label htmlFor="payment-reference" className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-700">Reference No.</label><input id="payment-reference" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="Transaction / reference number" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></div>}
              {paymentMethod === 'party_transfer' && <div><label htmlFor="transfer-reference" className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-700">Transfer Reference</label><input id="transfer-reference" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="UTR / transfer reference" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></div>}
              <div><label htmlFor="payment-notes" className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-700">Notes</label><input id="payment-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional payment note" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></div>
              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4"><div className="flex justify-between text-sm"><span className="font-medium text-slate-700">{paymentMethod === 'party_transfer' ? 'Transferred now' : 'Paid now'}</span><span className="font-extrabold text-slate-950">₹{Number(amount || 0).toFixed(2)}</span></div><div className="mt-2 flex justify-between"><span className="font-extrabold text-slate-800">Balance after payment</span><span className="font-extrabold text-blue-800">₹{Math.max(balance - Number(amount || 0), 0).toFixed(2)}</span></div></div>
              <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => { toast.success('Invoice saved as credit / unpaid'); onClose() }} disabled={saving} className="min-h-12 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 hover:bg-slate-100">Pay Later / Credit</button><button type="button" onClick={() => void savePayment()} disabled={saving || balance <= 0} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40">{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Check className="h-4 w-4" />{paymentMethod === 'party_transfer' ? 'Record Transfer' : 'Save Payment'}</>}</button></div>
            </>}
          </>}
        </div>
      </div>
    </div>
  )
}
