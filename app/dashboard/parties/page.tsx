'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, Edit3, Phone, Plus, RefreshCw, Search, Truck, UserRound, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'

type PartyType = 'customer' | 'supplier' | 'both'
type BalanceType = 'none' | 'receivable' | 'payable'

type Party = {
  id: string
  party_code: string | null
  party_type: PartyType
  name: string
  phone: string | null
  alternate_phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  opening_balance: number
  opening_balance_type: BalanceType
  credit_limit: number
  notes: string | null
  is_active: boolean
}

const typeLabels: Record<PartyType, string> = { customer: 'Customer', supplier: 'Supplier', both: 'Customer + Supplier' }

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | PartyType>('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Party | null>(null)

  async function loadParties() {
    setLoading(true)
    const response = await fetch('/api/parties', { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status !== 401) toast.error(result.error ?? 'Unable to load parties')
      setLoading(false)
      return
    }
    setParties(result.parties ?? [])
    setLoading(false)
  }

  useEffect(() => { void loadParties() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return parties.filter((party) => {
      const matchesType = filter === 'all' || party.party_type === filter
      const matchesSearch = !q || [party.name, party.party_code, party.phone, party.email, party.city, party.state]
        .some((value) => value?.toLowerCase().includes(q))
      return matchesType && matchesSearch
    })
  }, [parties, search, filter])

  const customers = parties.filter((party) => party.party_type === 'customer' || party.party_type === 'both').length
  const suppliers = parties.filter((party) => party.party_type === 'supplier' || party.party_type === 'both').length
  const active = parties.filter((party) => party.is_active).length

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Phase 6 · Parties</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Customers & Suppliers</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Maintain one business-scoped party master for customers, suppliers, or both. Opening balances are only the starting ledger baseline; invoices, receipts, payments and immutable ledger entries come later.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void loadParties()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button onClick={() => { setEditing(null); setShowForm(true) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Party</button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat icon={<Users className="h-5 w-5" />} label="Total active" value={String(active)} />
          <Stat icon={<UserRound className="h-5 w-5" />} label="Customers" value={String(customers)} />
          <Stat icon={<Truck className="h-5 w-5" />} label="Suppliers" value={String(suppliers)} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, code, phone, email or city" className="min-h-11 w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'customer', 'supplier', 'both'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-semibold ${filter === item ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{item === 'all' ? 'All' : typeLabels[item]}</button>)}
          </div>
        </div>

        {filtered.length ? <div className="divide-y divide-slate-100">
          {filtered.map((party) => <PartyRow key={party.id} party={party} onEdit={() => { setEditing(party); setShowForm(true) }} />)}
        </div> : <EmptyState search={Boolean(search || filter !== 'all')} />}
      </section>

      {loading && <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">Loading parties…</div>}
      {showForm && <PartyForm party={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); void loadParties() }} />}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">{icon}</span><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p></div></div>
}

function PartyRow({ party, onEdit }: { party: Party; onEdit: () => void }) {
  const location = [party.city, party.state].filter(Boolean).join(', ')
  const balance = Number(party.opening_balance)
  return <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Building2 className="h-5 w-5" /></span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-slate-900">{party.name}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{typeLabels[party.party_type]}</span>{!party.is_active && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-400">Inactive</span>}</div>
        <p className="mt-1 text-xs text-slate-500">{party.party_code ?? 'No code'}{location ? ` · ${location}` : ''}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">{party.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{party.phone}</span>}{party.email && <span className="truncate">{party.email}</span>}</div>
      </div>
    </div>
    <div className="flex items-center justify-between gap-5 lg:justify-end">
      <div className="text-left lg:text-right"><p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Opening balance</p><p className="mt-1 text-sm font-bold text-slate-900">{balance.toFixed(2)} {balance > 0 ? party.opening_balance_type : ''}</p>{Number(party.credit_limit) > 0 && <p className="mt-0.5 text-[11px] text-slate-500">Credit limit {Number(party.credit_limit).toFixed(2)}</p>}</div>
      <button onClick={onEdit} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4" /> Edit</button>
    </div>
  </div>
}

function EmptyState({ search }: { search: boolean }) {
  return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Users className="h-5 w-5" /></span><h2 className="mt-4 font-semibold text-slate-900">{search ? 'No matching parties' : 'No parties yet'}</h2><p className="mt-1 max-w-sm text-sm text-slate-500">{search ? 'Try another search or party type.' : 'Add your first customer or supplier to establish the party master.'}</p></div>
}

function PartyForm({ party, onClose, onSaved }: { party: Party | null; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({
    party_code: party?.party_code ?? '', party_type: party?.party_type ?? 'customer', name: party?.name ?? '', phone: party?.phone ?? '', alternate_phone: party?.alternate_phone ?? '', email: party?.email ?? '', address: party?.address ?? '', city: party?.city ?? '', state: party?.state ?? '', postal_code: party?.postal_code ?? '', opening_balance: String(party?.opening_balance ?? 0), opening_balance_type: party?.opening_balance_type ?? 'none', credit_limit: String(party?.credit_limit ?? 0), notes: party?.notes ?? '', is_active: String(party?.is_active ?? true),
  })
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const data = { ...form, opening_balance: Number(form.opening_balance || 0), credit_limit: Number(form.credit_limit || 0), is_active: form.is_active === 'true' }
    const response = await fetch('/api/parties', { method: party ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(party ? { id: party.id, data } : { data }) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) return toast.error(result.error ?? 'Unable to save party')
    toast.success(party ? 'Party updated' : 'Party added')
    onSaved()
  }

  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/40 p-4"><div className="mx-auto my-4 max-w-3xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-semibold text-slate-900">{party ? 'Edit Party' : 'Add Party'}</h2><p className="mt-1 text-xs text-slate-500">Keep party identity separate from future invoice and ledger transactions.</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Party name" value={form.name} onChange={(v) => set('name', v)} required /><Field label="Party code" value={form.party_code} onChange={(v) => set('party_code', v)} /><SelectField label="Type" value={form.party_type} onChange={(v) => set('party_type', v)} options={[['customer','Customer'],['supplier','Supplier'],['both','Customer + Supplier']]} /></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} /><Field label="Alternate phone" value={form.alternate_phone} onChange={(v) => set('alternate_phone', v)} /><Field label="Email" value={form.email} onChange={(v) => set('email', v)} /><Field label="Postal code" value={form.postal_code} onChange={(v) => set('postal_code', v)} /></div>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="City" value={form.city} onChange={(v) => set('city', v)} /><Field label="State" value={form.state} onChange={(v) => set('state', v)} /><Field label="Address" value={form.address} onChange={(v) => set('address', v)} /></div>
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="text-sm font-semibold text-slate-900">Opening ledger baseline</h3><p className="mt-1 text-xs text-slate-500">This is not a payment or invoice. Future ledger transactions will build on it.</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><NumberField label="Opening balance" value={form.opening_balance} onChange={(v) => set('opening_balance', v)} /><SelectField label="Balance direction" value={form.opening_balance_type} onChange={(v) => set('opening_balance_type', v)} options={[['none','None / zero'],['receivable','Receivable (party owes us)'],['payable','Payable (we owe party)']]} /><NumberField label="Credit limit" value={form.credit_limit} onChange={(v) => set('credit_limit', v)} /></div></div>
    <TextArea label="Notes" value={form.notes} onChange={(v) => set('notes', v)} />
    <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.is_active === 'true'} onChange={(event) => set('is_active', String(event.target.checked))} className="h-4 w-4 rounded border-slate-300" /> Active party</label>
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : party ? 'Save changes' : 'Save party'}</button></div>
  </form></div></div>
}

function Field({ label, value, onChange, required }: { label: string; value?: string; onChange: (value: string) => void; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><input required={required} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> }
function NumberField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><input type="number" min="0" step="0.01" value={value ?? '0'} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> }
function TextArea({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><textarea rows={3} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> }
function SelectField({ label, value, onChange, options }: { label: string; value?: string; onChange: (value: string) => void; options: [string, string][] }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> }
