'use client'

import { CalendarDays, Check, RotateCcw } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function InvoiceDateSelector() {
  const pathname = usePathname()
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)
  const visible = pathname === '/dashboard/sales' || pathname === '/dashboard/purchases'

  useEffect(() => {
    if (!visible) return
    void fetch('/api/invoice-date', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json().catch(() => ({}))
        if (response.ok && body.date) setDate(body.date)
      })
      .catch(() => undefined)
  }, [visible])

  if (!visible) return null

  async function saveDate(nextDate: string) {
    setDate(nextDate)
    setSaving(true)
    try {
      const response = await fetch('/api/invoice-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: nextDate }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to save invoice date')
      toast.success(`New invoices will use ${new Date(`${nextDate}T12:00:00`).toLocaleDateString('en-IN')}`)
    } catch (error) {
      setDate(today())
      toast.error(error instanceof Error ? error.message : 'Unable to save invoice date')
    } finally {
      setSaving(false)
    }
  }

  const isToday = date === today()
  const invoiceKind = pathname.endsWith('/sales') ? 'sale' : 'purchase'

  return (
    <section className="invoice-date-bar mb-5 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
      <div className="flex items-center gap-3">
        <span className="invoice-date-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-900">
          <CalendarDays className="h-5 w-5 stroke-[2.5]" />
        </span>
        <div>
          <p className="invoice-date-title !text-slate-950 !font-black">INVOICE DATE</p>
          <p className="invoice-date-help !text-slate-950 !font-bold">Choose the date for the new {invoiceKind} invoice</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          max={today()}
          onChange={event => void saveDate(event.target.value)}
          disabled={saving}
          aria-label="Invoice date"
          className="rounded-xl px-3 font-bold text-slate-950 outline-none ring-blue-200 focus:ring-4 disabled:opacity-60"
        />
        {!isToday && (
          <button type="button" onClick={() => void saveDate(today())} disabled={saving} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-bold text-slate-950 hover:bg-blue-50 disabled:opacity-60">
            <RotateCcw className="h-4 w-4" /> Today
          </button>
        )}
        {saving && <span className="invoice-date-saving inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-bold text-slate-950"><Check className="h-4 w-4" /> Saving</span>}
      </div>
    </section>
  )
}
