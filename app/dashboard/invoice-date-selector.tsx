'use client'

import { CalendarDays } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function InvoiceDateSelector() {
  const pathname = usePathname()
  const [date, setDate] = useState(today())
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [saving, setSaving] = useState(false)
  const visible = pathname === '/dashboard/sales'

  useEffect(() => {
    if (!visible) return
    void fetch('/api/invoice-date', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json().catch(() => ({}))
        if (response.ok && body.date) setDate(body.date)
      })
      .catch(() => undefined)
  }, [visible])

  useEffect(() => {
    if (!visible) {
      setHost(null)
      return
    }
    const findHost = () => {
      const label = Array.from(document.querySelectorAll('div')).find(element => element.textContent?.trim() === 'Invoice date')
      const card = label?.parentElement?.parentElement
      if (!card) return false
      const existing = Array.from(card.children)
      existing.forEach(child => {
        ;(child as HTMLElement).style.display = 'none'
      })
      setHost(card)
      return true
    }
    if (findHost()) return
    const observer = new MutationObserver(() => {
      if (findHost()) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [visible])

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
      toast.error(error instanceof Error ? error.message : 'Unable to save invoice date')
    } finally {
      setSaving(false)
    }
  }

  if (!visible || !host) return null

  return createPortal(
    <>
      <CalendarDays className="h-4 w-4 text-emerald-800" />
      <div className="relative">
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Invoice date</div>
          <div className="text-xs font-black text-black">{new Date(`${date}T12:00:00`).toLocaleDateString('en-IN')}</div>
        </div>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={event => void saveDate(event.target.value)}
          disabled={saving}
          aria-label="Invoice date"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </>,
    host,
  )
}
