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
    <section className="invoice-date-bar mb-5 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4" style={{ backgroundColor: '#E8F5EE', border: '1px solid #B7D9C5', boxShadow: '0 6px 18px rgba(15, 118, 110, 0.08)' }}>
      <div className="flex items-center gap-3">
        <span className="invoice-date-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: '#267A5B', boxShadow: '0 5px 12px rgba(38, 122, 91, 0.22)' }}>
          <CalendarDays className="h-5 w-5 stroke-[2.8]" />
        </span>
        <div>
          <p className="invoice-date-title" style={{ color: '#000000', fontWeight: 900, fontSize: '15px', lineHeight: 1.25 }}>INVOICE DATE</p>
          <p className="invoice-date-help" style={{ color: '#000000', fontWeight: 800, fontSize: '15px', lineHeight: 1.35 }}>Choose the date for the new {invoiceKind} invoice</p>
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
          style={{ color: '#000000', fontWeight: 800, borderColor: '#94A3B8' }}
        />
        {!isToday && (
          <button type="button" onClick={() => void saveDate(today())} disabled={saving} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-bold text-black hover:bg-white disabled:opacity-60">
            <RotateCcw className="h-4 w-4" /> Today
          </button>
        )}
        {saving && <span className="invoice-date-saving inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-bold text-black"><Check className="h-4 w-4" /> Saving</span>}
      </div>
    </section>
  )
}
