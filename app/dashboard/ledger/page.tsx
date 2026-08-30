'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, MessageCircle, Printer, RefreshCw, Search, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'
import { buildLedgerPdf } from '@/app/dashboard/ledger-pdf'

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

type Business = {
  id: string
  name: string
  code: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
}

type Entry = {
  id: string
  date: string
  type: 'opening' | 'invoice' | 'purchase' | 'payment' | 'receipt_voucher' | 'payment_voucher'
  description: string
  reference: string
  debit: number
  credit: number
  balance: number
  payment_method?: string
  notes?: string
}

type BillWise = {
  invoice_id: string
  invoice_no: string
  invoice_date: string
  bill_amount: number
  paid_amount: number
  balance_amount: number
  payment_date: string | null
  days_past: number
  status: 'paid' | 'partial' | 'unpaid'
}

type LedgerData = {
  business: Business | null
  party: Party
  period: { start_date: string; end_date: string }
  opening_balance: number
  debit_total: number
  credit_total: number
  final_balance: number
  balance_type: 'receivable' | 'payable' | 'settled'
  entries: Entry[]
  bill_wise: BillWise[]
}

const money = (value: number) => `₹${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateTime = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const csvEscape = (value: string | number) => `"${String(value ?? '').replaceAll('"', '""')}"`

function safeFileName(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'party'
}

function whatsappPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

function periodLabel(start: string, end: string) {
  return `${dateTime(start)} to ${dateTime(end)}`
}

export default function LedgerPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [parties, setParties] = useState<Party[]>([])
  const [selectedParty, setSelectedParty] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [data, setData] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  async function loadParties() {
    setLoading(true)
    try {
      const response = await fetch('/api/parties', { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error ?? 'Unable to load parties')
      const rows = (json.parties ?? []) as Party[]
      const active = rows.filter((party) => party.is_active)
      setParties(active)
      if (!selectedParty || !active.some((party) => party.id === selectedParty)) setSelectedParty(active[0]?.id ?? '')
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
      const query = new URLSearchParams({ start_date: startDate, end_date: endDate })
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

  function buildPdf() {
    if (!data) return null
    return buildLedgerPdf({
      businessName: data.business?.name,
      businessCode: data.business?.code,
      partyName: data.party.name,
      partyPhone: data.party.phone,
      partyCode: data.party.party_code,
      startDate: data.period.start_date,
      endDate: data.period.end_date,
      openingBalance: data.opening_balance,
      debitTotal: data.debit_total,
      creditTotal: data.credit_total,
      finalBalance: data.final_balance,
      balanceType: data.balance_type,
      entries: data.entries,
      billWise: data.bill_wise,
    })
  }

  function downloadPdf() {
    const pdf = buildPdf()
    if (!pdf || !data) return
    const url = URL.createObjectURL(pdf)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${safeFileName(data.party.name)}-ledger-${data.period.start_date}-to-${data.period.end_date}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast.success('Ledger PDF downloaded')
  }

  async function sharePdfToWhatsApp() {
    if (!data || pdfBusy) return
    setPdfBusy(true)
    try {
      const pdf = buildPdf()
      if (!pdf) return
      const fileName = `${safeFileName(data.party.name)}-ledger-${data.period.start_date}-to-${data.period.end_date}.pdf`
      const file = new File([pdf], fileName, { type: 'application/pdf' })
      const phone = whatsappPhone(data.party.phone ?? '')
      const message = `Ledger for ${data.party.name} | ${periodLabel(data.period.start_date, data.period.end_date)} | ${data.balance_type === 'receivable' ? 'Receivable' : data.balance_type === 'payable' ? 'Payable' : 'Settled'}: ${money(Math.abs(data.final_balance))}.`
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${data.party.name} Ledger`, text: message, files: [file] })
        toast.success('Share sheet opened with the ledger PDF')
        return
      }
      downloadPdf()
      const target = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`
      window.open(target, '_blank', 'noopener,noreferrer')
      toast.success('PDF downloaded and WhatsApp chat opened')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error(error instanceof Error ? error.message : 'Unable to share ledger PDF')
    } finally {
      setPdfBusy(false)
    }
  }

  function exportCsv() {
    if (!data) return
    const rows: Array<Array<string | number>> = [
      ['Shop', data.business?.name ?? ''],
      ['Shop Code', data.business?.code ?? ''],
      ['Party', data.party.name],
      ['Party Code', data.party.party_code ?? ''],
      ['Ledger Period', `${data.period.start_date} to ${data.period.end_date}`],
      ['Opening Balance', data.opening_balance.toFixed(2)],
      ['Receivable / Payable', data.balance_type],
      ['Final Balance', Math.abs(data.final_balance).toFixed(2)],
      [],
      ['Bill-wise Payment Ageing'],
      ['Bill No', 'Bill Date', 'Bill Amount', 'Paid', 'Balance', 'Payment Date', 'Days to Pay / Outstanding Days', 'Status'],
      ...data.bill_wise.map((bill) => [bill.invoice_no, dateTime(bill.invoice_date), bill.bill_amount.toFixed(2), bill.paid_amount.toFixed(2), bill.balance_amount.toFixed(2), bill.payment_date ? dateTime(bill.payment_date) : '', bill.days_past, bill.status]),
      [],
      ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Running Balance'],
      ...data.entries.map((entry) => [dateTime(entry.date), entry.description, entry.reference, entry.debit.toFixed(2), entry.credit.toFixed(2), Math.abs(entry.balance).toFixed(2)]),
    ]
    const csv = rows.map((row) => row.map((value) => csvEscape(value)).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${safeFileName(data.party.name)}-ledger-${data.period.start_date}-to-${data.period.end_date}.csv`
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

  const balanceLabel = data?.balance_type === 'receivable' ? 'Receivable' : data?.balance_type === 'payable' ? 'Payable' : 'Settled'
  const balanceExplanation = data?.balance_type === 'receivable' ? 'Party owes the business.' : data?.balance_type === 'payable' ? 'Business owes the party.' : 'Account is settled.'

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 text-black">
      <section className="rounded-2xl border border-[#dce9df] bg-white p-5 shadow-[0_4px_18px_rgba(31,93,43,0.06)] sm:p-6 print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[#c6e7ce] bg-[#eaf7ed] px-3 py-1 text-xs font-semibold text-[#246b34]">Party Ledger</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-black sm:text-3xl">Ledger</h1>
            <p className="mt-2 text-sm text-[#53635a]">Clear bill-wise payment ageing, running balances and a defined ledger period.</p>
          </div>
          <button type="button" onClick={() => { void loadParties(); void loadLedger() }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d9e4dc] bg-white px-4 text-sm font-semibold text-black hover:bg-[#f2f8f3]">
            <RefreshCw className="h-4 w-4 text-[#24733a]" /> Refresh
          </button>
        </div>
      </section>

      <div className="hidden print:block print:mb-6">
        {data && <>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#24733a]">{data.business?.name ?? 'BIZYBUK.IN'}</p>
          <h1 className="mt-1 text-2xl font-bold text-black">Party Ledger</h1>
          <p className="mt-1 text-sm text-black">Party: {data.party.name}{data.party.phone ? ` · ${data.party.phone}` : ''}</p>
          <p className="mt-1 text-sm font-semibold text-black">Ledger Period: {periodLabel(data.period.start_date, data.period.end_date)}</p>
        </>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-[#dce9df] bg-white shadow-[0_4px_18px_rgba(31,93,43,0.06)] print:hidden">
          <div className="border-b border-[#e5ece7] p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#24733a]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search party, phone or code" className="min-h-11 w-full rounded-xl border border-[#d7e3da] bg-white pl-10 pr-3 text-sm text-black outline-none placeholder:text-[#758179] focus:border-[#58b878] focus:ring-2 focus:ring-[#dff3e5]" />
            </div>
          </div>
          <div className="max-h-[70vh] divide-y divide-[#edf1ee] overflow-y-auto">
            {loading ? <div className="p-8 text-center text-sm text-[#69766e]">Loading parties…</div> : filteredParties.length ? filteredParties.map((party) => (
              <button key={party.id} type="button" onClick={() => setSelectedParty(party.id)} className={`block w-full p-4 text-left transition ${selectedParty === party.id ? 'bg-[#eaf7ed] ring-1 ring-inset ring-[#b8e3c4]' : 'bg-white hover:bg-[#f4faf5]'}`}>
                <div className="flex items-center justify-between gap-3"><b className="text-sm text-black">{party.name}</b><span className="rounded-full bg-[#edf5ef] px-2 py-1 text-[10px] font-semibold uppercase text-[#3f604a]">{party.party_type}</span></div>
                <p className="mt-1 text-xs text-[#65736a]">{party.phone || party.party_code || 'No contact details'}</p>
              </button>
            )) : <div className="p-8 text-center text-sm text-[#65736a]">No parties found.</div>}
          </div>
        </section>

        <section className="space-y-5">
          <section className="rounded-2xl border border-[#dce9df] bg-white p-5 shadow-[0_4px_18px_rgba(31,93,43,0.06)] print:hidden">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] md:items-end">
              <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-black">Party</label><div className="rounded-xl border border-[#e0e9e2] bg-[#f4f8f5] px-4 py-3"><p className="font-semibold text-black">{data?.party.name ?? parties.find((party) => party.id === selectedParty)?.name ?? 'Select a party'}</p><p className="text-xs text-[#68766e]">{data?.party.phone ?? parties.find((party) => party.id === selectedParty)?.phone ?? ''}</p></div></div>
              <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-black">Period From</label><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#d7e3da] bg-white px-3 text-sm text-black outline-none focus:border-[#58b878] focus:ring-2 focus:ring-[#dff3e5]" /></div>
              <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-black">Period To</label><input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#d7e3da] bg-white px-3 text-sm text-black outline-none focus:border-[#58b878] focus:ring-2 focus:ring-[#dff3e5]" /></div>
              <button type="button" onClick={() => void loadLedger()} className="min-h-11 rounded-xl bg-[#2f7d32] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#256a2a]">Apply</button>
            </div>
          </section>

          {detailLoading ? <div className="rounded-2xl border border-[#dce9df] bg-white p-12 text-center text-sm text-[#65736a]">Loading party ledger…</div> : data ? <>
            <section className="rounded-2xl border border-[#dce9df] bg-gradient-to-r from-[#f0f8f2] to-white p-5 shadow-[0_4px_18px_rgba(31,93,43,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#24733a]">{data.business?.name ?? 'BIZYBUK.IN'}</p>
                  <h2 className="mt-1 text-xl font-bold text-black">{data.party.name}</h2>
                  <p className="mt-1 text-sm text-[#53635a]">Ledger Period: <b>{periodLabel(data.period.start_date, data.period.end_date)}</b></p>
                  {data.business?.code && <p className="mt-1 text-xs text-[#68766e]">Shop Code: {data.business.code}</p>}
                </div>
                <div className={`rounded-2xl border px-5 py-4 text-right ${data.balance_type === 'receivable' ? 'border-[#f1caca] bg-[#fff0f0]' : data.balance_type === 'payable' ? 'border-[#ead9a6] bg-[#fff8dc]' : 'border-[#cfe5d5] bg-[#f2f8f3]'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#526158]">Current {balanceLabel}</p>
                  <p className="mt-1 text-2xl font-bold text-black">{money(Math.abs(data.final_balance))}</p>
                  <p className="text-xs font-semibold text-[#526158]">{balanceExplanation}</p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#e2ebe4] bg-[#f4f8f5] p-4"><p className="text-[10px] font-semibold uppercase text-[#506057]">Opening Balance</p><p className="mt-1 text-lg font-bold text-black">{money(data.opening_balance)}</p></div>
              <div className="rounded-2xl border border-[#f1d0d0] bg-[#fff0f0] p-4"><p className="text-[10px] font-semibold uppercase text-[#b33b3b]">Debit</p><p className="mt-1 text-lg font-bold text-black">{money(data.debit_total)}</p></div>
              <div className="rounded-2xl border border-[#c9ead4] bg-[#eaf8ee] p-4"><p className="text-[10px] font-semibold uppercase text-[#24733a]">Credit</p><p className="mt-1 text-lg font-bold text-black">{money(data.credit_total)}</p></div>
              <div className={`rounded-2xl border p-4 ${data.balance_type === 'payable' ? 'border-[#ead9a6] bg-[#fff8dc]' : data.balance_type === 'receivable' ? 'border-[#f1d0d0] bg-[#fff0f0]' : 'border-[#e2ebe4] bg-[#f4f8f5]'}`}><p className="text-[10px] font-semibold uppercase text-black">{balanceLabel}</p><p className="mt-1 text-lg font-bold text-black">{money(Math.abs(data.final_balance))}</p><p className="text-xs font-semibold capitalize text-black">{balanceExplanation}</p></div>
            </div>

            <section className="rounded-2xl border border-[#dce9df] bg-white shadow-[0_4px_18px_rgba(31,93,43,0.06)]">
              <div className="flex flex-col gap-3 border-b border-[#e4ebe6] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-[#24733a]" /><h2 className="font-semibold text-black">Bill-wise Payment Ageing</h2></div><p className="mt-1 text-xs text-[#65736a]">Paid bills show days taken to pay; unpaid or partial bills show outstanding days as of the ledger end date.</p></div>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <button type="button" onClick={downloadPdf} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#b8e0c2] bg-[#eaf8ee] px-3 text-xs font-semibold text-[#1d642f] hover:bg-[#dff3e5]"><Download className="h-4 w-4" /> Download PDF</button>
                  <button type="button" onClick={() => void sharePdfToWhatsApp()} disabled={pdfBusy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#218c4a] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#18743b] disabled:cursor-wait disabled:opacity-60"><MessageCircle className="h-4 w-4" /> {pdfBusy ? 'Preparing…' : 'WhatsApp PDF'}</button>
                  <button type="button" onClick={exportCsv} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d9e4dc] bg-white px-3 text-xs font-semibold text-black hover:bg-[#f2f8f3]"><Download className="h-4 w-4 text-[#24733a]" /> CSV</button>
                  <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d9e4dc] bg-white px-3 text-xs font-semibold text-black hover:bg-[#f2f8f3]"><Printer className="h-4 w-4 text-[#24733a]" /> Print</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm text-black">
                  <thead className="bg-[#f0f7f1] text-left text-[11px] uppercase text-black"><tr><th className="px-4 py-3">Bill No.</th><th className="px-4 py-3">Bill Date</th><th className="px-4 py-3 text-right">Bill Amount</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Payment Date</th><th className="px-4 py-3 text-right">Days</th><th className="px-4 py-3">Status</th></tr></thead>
                  <tbody className="divide-y divide-[#edf1ee]">
                    {data.bill_wise.length ? data.bill_wise.map((bill) => <tr key={bill.invoice_id} className="hover:bg-[#fbfdfb]"><td className="px-4 py-3 font-semibold text-[#24733a]">{bill.invoice_no}</td><td className="px-4 py-3 text-xs text-[#5e6d64]">{dateTime(bill.invoice_date)}</td><td className="px-4 py-3 text-right font-semibold">{money(bill.bill_amount)}</td><td className="px-4 py-3 text-right font-semibold text-[#24733a]">{money(bill.paid_amount)}</td><td className="px-4 py-3 text-right font-semibold">{money(bill.balance_amount)}</td><td className="px-4 py-3 text-xs text-[#5e6d64]">{bill.payment_date ? dateTime(bill.payment_date) : '—'}</td><td className="px-4 py-3 text-right font-bold">{bill.days_past} days</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${bill.status === 'paid' ? 'bg-[#eaf8ee] text-[#24733a]' : bill.status === 'partial' ? 'bg-[#fff8dc] text-[#8a6400]' : 'bg-[#fff0f0] text-[#a03b3b]'}`}>{bill.status}</span></td></tr>) : <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-[#65736a]">No sales bills were generated in this ledger period.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-[#dce9df] bg-white shadow-[0_4px_18px_rgba(31,93,43,0.06)]">
              <div className="border-b border-[#e4ebe6] p-5"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#24733a]" /><h2 className="font-semibold text-black">Ledger Entries</h2></div><p className="mt-1 text-xs text-[#65736a]">{periodLabel(data.period.start_date, data.period.end_date)} · Debit increases receivable; credit reduces receivable.</p></div>
              <div className="overflow-x-auto"><table className="min-w-[820px] w-full text-sm text-black"><thead className="bg-[#f0f7f1] text-left text-xs uppercase text-black"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Running Balance</th></tr></thead><tbody className="divide-y divide-[#edf1ee]">{data.entries.map((entry) => <tr key={entry.id} className="hover:bg-[#fbfdfb]"><td className="px-4 py-3 text-xs text-[#5e6d64]">{dateTime(entry.date)}</td><td className="px-4 py-3 font-medium text-black">{entry.description}</td><td className="px-4 py-3 text-xs text-[#5e6d64]">{entry.reference || '—'}</td><td className="px-4 py-3 text-right font-semibold text-black">{entry.debit ? money(entry.debit) : '—'}</td><td className="px-4 py-3 text-right font-semibold text-[#24733a]">{entry.credit ? money(entry.credit) : '—'}</td><td className={`px-4 py-3 text-right font-bold ${entry.balance < 0 ? 'text-[#8a6400]' : 'text-black'}`}>{money(Math.abs(entry.balance))}{entry.balance < 0 ? ' Payable' : entry.balance > 0 ? ' Receivable' : ''}</td></tr>)}</tbody></table></div>
            </section>

            <section className="rounded-2xl border border-[#dce9df] bg-white p-5 shadow-[0_4px_18px_rgba(31,93,43,0.06)]"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-black">Final Balance</p><p className="mt-1 text-xs text-[#65736a]">{balanceExplanation}</p></div><p className="text-2xl font-bold text-black">{money(Math.abs(data.final_balance))}</p></div></section>

            <section className="rounded-2xl border border-[#cfe5d5] bg-[#f1f8f3] px-5 py-4 text-center shadow-[0_4px_18px_rgba(31,93,43,0.04)] print:mt-8">
              <p className="text-sm font-semibold text-[#194d29]">Don’t have a BIZYBUK.IN account yet?</p>
              <p className="mt-1 text-sm text-[#53635a]">Create your customer account on BIZYBUK.IN using Shop Code <b className="text-[#194d29]">{data.business?.code ?? '—'}</b> and connect with <b>{data.business?.name ?? 'this shop'}</b>.</p>
            </section>
          </> : <div className="rounded-2xl border border-dashed border-[#cfdcd3] bg-white p-12 text-center"><FileText className="mx-auto h-10 w-10 text-[#4b9b5a]" /><p className="mt-3 text-sm font-semibold text-black">Select a party to open its ledger</p></div>}
        </section>
      </div>
    </div>
  )
}
