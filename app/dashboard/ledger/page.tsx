'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, Printer, RefreshCw, Search, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'

type Party = {
  id: string
  party_code: string | null
  party_type: 'customer' | 'supplier' | 'both'
  name: string
  phone: string | null
  opening_balance: number
  opening_balance_type: 'none' | 'receivable' | 'payable'
  is_active: boolean
}

type Entry = {
  id: string
  date: string
  type: 'opening' | 'invoice' | 'payment'
  description: string
  reference: string
  debit: number
  credit: number
  balance: number
  payment_method?: string
  notes?: string
}

type LedgerData = {
  party: Party
  period: { start_date: string; end_date: string | null }
  opening_balance: number
  debit_total: number
  credit_total: number
  final_balance: number
  balance_type: 'receivable' | 'payable' | 'settled'
  entries: Entry[]
}

const money = (value: number) => `₹${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateTime = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const csvEscape = (value: string | number) => `"${String(value ?? '').replaceAll('"', '""')}"`

export default function LedgerPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [selectedParty, setSelectedParty] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [data, setData] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  async function loadParties() {
    setLoading(true)
    try {
      const response = await fetch('/api/parties', { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error ?? 'Unable to load parties')
      const rows = (json.parties ?? []) as Party[]
      setParties(rows.filter((party) => party.is_active))
      if (!selectedParty || !rows.some((party) => party.id === selectedParty && party.is_active)) {
        setSelectedParty(rows.find((party) => party.is_active)?.id ?? '')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load parties')
    } finally {
      setLoading(false)
    }
  }

  async function loadLedger() {
    if (!selectedParty) {
      setData(null)
      return
    }
    setDetailLoading(true)
    try {
      const query = new URLSearchParams({ start_date: startDate })
      if (endDate) query.set('end_date', endDate)
      const response = await fetch(`/api/parties/${selectedParty}/ledger?${query.toString()}`, { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error ?? 'Unable to load party ledger')
      setData(json as LedgerData)
    } catch (error) {
      setData(null)
      toast.error(error instanceof Error ? error.message : 'Unable to load party ledger')
    } finally {
      setDetailLoading(false)
    }
  }

  function exportCsv() {
    if (!data) return
    const rows = [
      ['Party', data.party.name],
      ['Party Code', data.party.party_code ?? ''],
      ['Period', `${data.period.start_date}${data.period.end_date ? ` to ${data.period.end_date}` : ''}`],
      ['Opening Balance', data.opening_balance.toFixed(2)],
      ['Final Balance', `${Math.abs(data.final_balance).toFixed(2)} ${data.balance_type}`],
      [],
      ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Running Balance', 'Balance Type', 'Payment Method', 'Notes'],
      ...data.entries.map((entry) => [
        dateTime(entry.date),
        entry.description,
        entry.reference,
        entry.debit.toFixed(2),
        entry.credit.toFixed(2),
        Math.abs(entry.balance).toFixed(2),
        entry.balance < 0 ? 'payable' : entry.balance > 0 ? 'receivable' : 'settled',
        entry.payment_method ?? '',
        entry.notes ?? '',
      ]),
    ]
    const csv = rows.map((row) => row.map((value) => csvEscape(value)).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const safeName = data.party.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'party'
    anchor.href = url
    anchor.download = `${safeName}-ledger-${data.period.start_date}${data.period.end_date ? `-to-${data.period.end_date}` : ''}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast.success('Ledger CSV exported')
  }

  useEffect(() => { void loadParties() }, [])
  useEffect(() => { void loadLedger() }, [selectedParty, startDate, endDate])

  const filteredParties = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return parties
    return parties.filter((party) => party.name.toLowerCase().includes(query) || (party.phone ?? '').toLowerCase().includes(query) || (party.party_code ?? '').toLowerCase().includes(query))
  }, [parties, search])

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Phase 7.3 · Party Ledger</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Party Ledger</h1>
            <p className="mt-2 text-sm text-slate-500">Select a party, choose the starting date, and review every debit, credit, and running balance.</p>
          </div>
          <button type="button" onClick={() => { void loadParties(); void loadLedger() }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </section>

      <div className="hidden print:block print:mb-6">
        <h1 className="text-2xl font-bold">Party Ledger</h1>
        {data && <p className="mt-1 text-sm">{data.party.name}{data.party.phone ? ` · ${data.party.phone}` : ''} · {data.period.start_date}{data.period.end_date ? ` to ${data.period.end_date}` : ''}</p>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm print:hidden">
          <div className="border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search party, phone or code" className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {loading ? <div className="p-8 text-center text-sm text-slate-400">Loading parties…</div> : filteredParties.length ? filteredParties.map((party) => (
              <button key={party.id} type="button" onClick={() => setSelectedParty(party.id)} className={`block w-full p-4 text-left ${selectedParty === party.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3"><b className="text-sm text-slate-900">{party.name}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-500">{party.party_type}</span></div>
                <p className="mt-1 text-xs text-slate-500">{party.phone || party.party_code || 'No contact details'}</p>
              </button>
            )) : <div className="p-8 text-center text-sm text-slate-500">No parties found.</div>}
          </div>
        </section>

        <section className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] md:items-end">
              <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Party</label><div className="rounded-xl bg-slate-50 px-4 py-3"><p className="font-semibold text-slate-900">{data?.party.name ?? parties.find((party) => party.id === selectedParty)?.name ?? 'Select a party'}</p><p className="text-xs text-slate-500">{data?.party.phone ?? parties.find((party) => party.id === selectedParty)?.phone ?? ''}</p></div></div>
              <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</label><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" /></div>
              <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</label><input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" /></div>
              <button type="button" onClick={() => void loadLedger()} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">Apply</button>
            </div>
          </section>

          {detailLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">Loading party ledger…</div> : data ? <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase text-slate-400">Opening Balance</p><p className="mt-1 text-lg font-bold">{money(data.opening_balance)}</p></div>
              <div className="rounded-2xl bg-blue-50 p-4"><p className="text-[10px] font-semibold uppercase text-blue-600">Debit</p><p className="mt-1 text-lg font-bold text-blue-700">{money(data.debit_total)}</p></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-semibold uppercase text-emerald-600">Credit</p><p className="mt-1 text-lg font-bold text-emerald-700">{money(data.credit_total)}</p></div>
              <div className={`rounded-2xl p-4 ${data.balance_type === 'payable' ? 'bg-amber-50' : data.balance_type === 'receivable' ? 'bg-red-50' : 'bg-slate-50'}`}><p className="text-[10px] font-semibold uppercase text-slate-500">Final Balance</p><p className="mt-1 text-lg font-bold">{money(Math.abs(data.final_balance))}</p><p className="text-xs font-semibold capitalize text-slate-500">{data.balance_type}</p></div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-blue-600" /><h2 className="font-semibold">{data.party.name} — Ledger</h2></div><p className="mt-1 text-xs text-slate-500">{data.period.start_date}{data.period.end_date ? ` to ${data.period.end_date}` : ''}. Debit increases receivable; credit records money received.</p></div>
                <div className="flex gap-2 print:hidden">
                  <button type="button" onClick={exportCsv} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" /> CSV</button>
                  <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> Print</button>
                </div>
              </div>
              <div className="overflow-x-auto"><table className="min-w-[820px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Running Balance</th></tr></thead><tbody className="divide-y divide-slate-100">{data.entries.map((entry) => <tr key={entry.id}><td className="px-4 py-3 text-xs text-slate-500">{dateTime(entry.date)}</td><td className="px-4 py-3 font-medium">{entry.description}</td><td className="px-4 py-3 text-xs text-slate-500">{entry.type === 'invoice' && entry.reference ? <button type="button" data-invoice-number={entry.reference} title="Click to view and edit invoice" className="font-semibold text-violet-700 underline decoration-violet-200 underline-offset-2 hover:text-violet-900 hover:decoration-violet-500">{entry.reference}</button> : (entry.reference || '—')}</td><td className="px-4 py-3 text-right font-semibold">{entry.debit ? money(entry.debit) : '—'}</td><td className="px-4 py-3 text-right font-semibold text-emerald-700">{entry.credit ? money(entry.credit) : '—'}</td><td className={`px-4 py-3 text-right font-bold ${entry.balance < 0 ? 'text-amber-700' : 'text-blue-700'}`}>{money(Math.abs(entry.balance))}{entry.balance < 0 ? ' Payable' : entry.balance > 0 ? ' Receivable' : ''}</td></tr>)}</tbody></table></div>
              {data.entries.length === 1 && <div className="p-8 text-center text-sm text-slate-500">No sales or payments were recorded in this period.</div>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold">Final Balance</p><p className="mt-1 text-xs text-slate-500">{data.balance_type === 'receivable' ? 'Party owes the business.' : data.balance_type === 'payable' ? 'Business owes the party.' : 'Account is settled.'}</p></div><p className="text-2xl font-bold text-slate-950">{money(Math.abs(data.final_balance))}</p></div></section>
          </> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><FileText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Select a party to open its ledger</p></div>}
        </section>
      </div>
    </div>
  )
}
