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

  return (
    <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[.14em] text-indigo-700">Invoice Date</p>
          <p className="text-xs text-slate-500">Choose the date for the new {pathname.endsWith('/sales') ? 'sale' : 'purchase'} invoice</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          max={today()}
          onChange={event => void saveDate(event.target.value)}
          disabled={saving}
          className="min-h-10 rounded-xl border border-indigo-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none ring-indigo-100 focus:ring-4 disabled:opacity-60"
          aria-label="Invoice date"
        />
        {!isToday && (
          <button
            type="button"
            onClick={() => void saveDate(today())}
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Today
          </button>
        )}
        {saving && <span className="inline-flex h-10 items-center gap-1 rounded-xl bg-white px-3 text-xs font-bold text-indigo-700"><Check className="h-3.5 w-3.5" /> Saving</span>}
      </div>
    </section>
  )
}
