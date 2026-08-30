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
  const [topCard, setTopCard] = useState<HTMLElement | null>(null)
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
      setTopCard(null)
      return
    }

    const findHosts = () => {
      const labels = Array.from(document.querySelectorAll<HTMLElement>('div')).filter(
        element => element.textContent?.trim() === 'Invoice date',
      )

      // The old global Invoice Date card is the standalone card above the
      // transaction page. Remove that card completely; it is no longer a
      // second date control.
      const standaloneLabel = labels.find(label => {
        const section = label.closest('section') as HTMLElement | null
        return Boolean(section && !section.querySelector('div')?.textContent?.includes('Sales Invoice'))
      })
      const standaloneCard = standaloneLabel?.closest('section') as HTMLElement | null
      if (standaloneCard) {
        standaloneCard.style.display = 'none'
        setTopCard(standaloneCard)
      }

      // Keep the existing Sales Invoice Header card/layout. Replace only its
      // existing date display with the real date picker inside the same slot.
      const salesTitle = Array.from(document.querySelectorAll<HTMLElement>('div')).find(
        element => element.textContent?.trim() === 'Sales Invoice',
      )
      const salesHeader = salesTitle?.closest('section') as HTMLElement | null
      const headerLabel = salesHeader
        ? Array.from(salesHeader.querySelectorAll<HTMLElement>('div')).find(
            element => element.textContent?.trim() === 'Invoice date',
          )
        : null
      const dateSlot = headerLabel?.parentElement?.parentElement as HTMLElement | null

      if (!dateSlot) return false

      Array.from(dateSlot.children).forEach(child => {
        ;(child as HTMLElement).style.display = 'none'
      })
      setHost(dateSlot)
      return true
    }

    if (findHosts()) return
    const observer = new MutationObserver(() => {
      if (findHosts()) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => () => {
    if (topCard) topCard.style.display = ''
  }, [topCard])

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
