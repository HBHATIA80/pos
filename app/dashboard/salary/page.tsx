'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Banknote, Check, CreditCard, Loader2, RefreshCw, WalletCards } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

type Staff = { id: string; full_name: string; phone: string | null; is_active: boolean; party_id: string | null }
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const localDateTime = () => { const d = new Date(); const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }

export default function SalaryPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffId, setStaffId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'bank'>('bank')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [paidAt, setPaidAt] = useState(localDateTime())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/salary-payments', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load staff')
      setStaff(body.staff || [])
      if (!staffId && body.staff?.length) setStaffId(body.staff[0].id)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load staff') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!staffId) return toast.error('Select a staff member')
    if (!amount || Number(amount) <= 0) return toast.error('Enter a valid salary amount')
    setSaving(true)
    try {
      const response = await fetch('/api/salary-payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_profile_id: staffId, payment_method: method, amount: Number(amount), reference_no: reference, notes, paid_at: new Date(paidAt).toISOString() }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to save salary payment')
      toast.success(body.message || 'Salary payment recorded')
      setAmount(''); setReference(''); setNotes(''); setPaidAt(localDateTime())
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save salary payment') }
    finally { setSaving(false) }
  }

  const selected = staff.find(x => x.id === staffId)
  return <main className="mx-auto max-w-5xl space-y-5">
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><WalletCards className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Accounts & Finance</p><h1 className="mt-1 text-2xl font-black text-slate-950">Staff Salary Payment</h1><p className="mt-1 text-sm text-slate-600">Record salary paid to a staff member and automatically update their staff ledger.</p></div></div>
        <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      </div>
    </section>

    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-800">Staff member<select value={staffId} onChange={e => setStaffId(e.target.value)} disabled={loading} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"><option value="">Select staff</option>{staff.filter(x => x.is_active).map(x => <option key={x.id} value={x.id}>{x.full_name}{x.phone ? ` · ${x.phone}` : ''}</option>)}</select>{selected && <span className="mt-1 block text-xs font-medium text-slate-500">Staff ledger: {selected.party_id ? 'Linked' : 'Not linked'}</span>}</label>
        <label className="text-sm font-bold text-slate-800">Salary amount<div className="relative mt-2"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-600">₹</span><input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="min-h-12 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-xl font-black text-slate-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></div></label>
      </div>
      <div className="mt-5"><p className="mb-2 text-sm font-bold text-slate-800">Payment source</p><div className="grid grid-cols-2 gap-3">{(['cash','bank'] as const).map(x => <button type="button" key={x} onClick={() => setMethod(x)} aria-pressed={method === x} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-black ${method === x ? 'border-emerald-700 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200' : 'border-slate-300 bg-white text-slate-700'}`}>{x === 'cash' ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}{x === 'cash' ? 'Cash' : 'Bank'}</button>)}</div></div>
      <div className="mt-5 grid gap-5 md:grid-cols-2"><label className="text-sm font-bold text-slate-800">Reference / UTR<input value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional bank reference" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></label><label className="text-sm font-bold text-slate-800">Payment date & time<input type="datetime-local" value={paidAt} onChange={e => setPaidAt(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></label></div>
      <label className="mt-5 block text-sm font-bold text-slate-800">Notes<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Salary for September 2026, advance, incentive, etc." className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></label>
      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Accounting effect</p><p className="mt-1 text-sm font-semibold text-slate-700">Debit Salaries & Wages · Credit {method === 'cash' ? 'Cash' : 'Bank'} · Staff ledger updated</p></div><button disabled={saving || loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {saving ? 'Saving…' : `Pay ${money(Number(amount || 0))}`}</button></div>
    </form>
  </main>
}
