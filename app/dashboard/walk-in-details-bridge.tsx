'use client'

import { useEffect, useRef, useState } from 'react'
import { UserRound, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'

type Mode = 'sale' | 'purchase' | null

type Details = {
  name: string
  phone: string
}

type VoucherBody = Record<string, unknown> & {
  data?: Record<string, unknown>
}

function getMode(pathname: string): Mode {
  if (pathname === '/dashboard/sales' || pathname.startsWith('/dashboard/sales/')) return 'sale'
  if (pathname === '/dashboard/purchases' || pathname.startsWith('/dashboard/purchases/')) return 'purchase'
  return null
}

export default function WalkInDetailsBridge() {
  const pathname = usePathname()
  const mode = getMode(pathname)
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState<Details>({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const detailsRef = useRef(details)
  const modeRef = useRef<Mode>(mode)
  const savingRef = useRef(false)

  useEffect(() => {
    detailsRef.current = details
  }, [details])

  useEffect(() => {
    modeRef.current = mode
    setOpen(false)
  }, [mode])

  useEffect(() => {
    if (!mode) return

    const placeholder = mode === 'sale' ? 'Walk-in customer, name or mobile' : 'Walk-in supplier, name or mobile'
    const buttonId = 'biz-walk-in-details-button'

    const attach = () => {
      const input = Array.from(document.querySelectorAll<HTMLInputElement>('input')).find(item => item.placeholder === placeholder)
      if (!input || document.getElementById(buttonId)) return
      const button = document.createElement('button')
      button.id = buttonId
      button.type = 'button'
      button.textContent = 'Add details'
      button.setAttribute('aria-label', mode === 'sale' ? 'Add walk-in customer name and phone' : 'Add walk-in supplier name and phone')
      button.className = 'biz-walk-in-details-trigger'
      button.addEventListener('click', () => window.dispatchEvent(new CustomEvent('biz-open-walk-in-details')))
      input.parentElement?.appendChild(button)
    }

    const openHandler = () => setOpen(true)
    window.addEventListener('biz-open-walk-in-details', openHandler)
    attach()
    const observer = new MutationObserver(attach)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('biz-open-walk-in-details', openHandler)
      observer.disconnect()
      document.getElementById(buttonId)?.remove()
    }
  }, [mode])

  useEffect(() => {
    if (!mode) return

    const originalFetch = window.fetch.bind(window)
    const wrappedFetch: typeof window.fetch = async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
      const isTarget = method === 'POST' && ((modeRef.current === 'sale' && requestUrl.includes('/api/sales')) || (modeRef.current === 'purchase' && requestUrl.includes('/api/purchases')))
      const current = detailsRef.current

      if (!isTarget || (!current.name.trim() && !current.phone.trim()) || savingRef.current) {
        return originalFetch(input, init)
      }

      let bodyText = typeof init?.body === 'string' ? init.body : null
      if (!bodyText && input instanceof Request) bodyText = await input.clone().text()
      if (!bodyText) return originalFetch(input, init)

      let body: VoucherBody
      try { body = JSON.parse(bodyText) as VoucherBody } catch { return originalFetch(input, init) }

      const hasParty = modeRef.current === 'sale' ? Boolean(body.data?.party_id) : Boolean(body.party_id)
      if (hasParty) return originalFetch(input, init)

      savingRef.current = true
      setSaving(true)
      try {
        const partyResponse = await originalFetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              party_type: modeRef.current === 'sale' ? 'customer' : 'supplier',
              name: current.name.trim() || (modeRef.current === 'sale' ? 'Walk-in Customer' : 'Walk-in Supplier'),
              phone: current.phone.trim(),
              opening_balance: 0,
              opening_balance_type: 'none',
              credit_limit: 0,
              notes: modeRef.current === 'sale' ? 'Walk-in customer captured at POS' : 'Walk-in supplier captured at purchase voucher',
              is_active: true,
            },
          }),
        })
        const partyBody = await partyResponse.json().catch(() => ({}))
        if (!partyResponse.ok || !partyBody.party?.id) throw new Error(partyBody.error || 'Unable to create the walk-in record')

        if (modeRef.current === 'sale') body.data = { ...(body.data || {}), party_id: partyBody.party.id }
        else body.party_id = partyBody.party.id

        const nextInit: RequestInit = { ...(init || {}), body: JSON.stringify(body) }
        const response = await originalFetch(input, nextInit)
        if (response.ok) {
          setOpen(false)
          setDetails({ name: '', phone: '' })
          toast.success(`${modeRef.current === 'sale' ? 'Customer' : 'Supplier'} details saved with voucher`)
        }
        return response
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to save walk-in details')
        throw error
      } finally {
        savingRef.current = false
        setSaving(false)
      }
    }

    window.fetch = wrappedFetch
    return () => { window.fetch = originalFetch }
  }, [mode])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])

  if (!mode || !open) return null

  const label = mode === 'sale' ? 'Walk-in Customer' : 'Walk-in Supplier'
  const noun = mode === 'sale' ? 'customer' : 'supplier'

  return (
    <div
      className="biz-walk-in-details-overlay fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/50 p-2.5 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} details`}
      onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}
    >
      <div className="biz-walk-in-details-dialog overflow-hidden bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="biz-walk-in-details-header flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><UserRound className="h-5 w-5" /></span>
            <div className="min-w-0">
              <div className="biz-walk-in-details-title truncate text-base font-black text-slate-950 sm:text-lg">Add {label.toLowerCase()} details</div>
              <div className="biz-walk-in-details-subtitle text-xs font-medium text-slate-600">Keep {noun} name and phone attached to this voucher.</div>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-4 sm:space-y-4 sm:p-5">
          <label className="biz-walk-in-details-field">
            <span className="biz-walk-in-details-field-label">Name <span aria-hidden="true">*</span></span>
            <input autoFocus value={details.name} onChange={event => setDetails(current => ({ ...current, name: event.target.value }))} placeholder={mode === 'sale' ? 'Enter customer name' : 'Enter supplier name'} autoComplete="name" className="biz-walk-in-details-input" />
          </label>

          <label className="biz-walk-in-details-field">
            <span className="biz-walk-in-details-field-label">Phone <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></span>
            <input value={details.phone} onChange={event => setDetails(current => ({ ...current, phone: event.target.value }))} placeholder="Enter mobile / phone number" inputMode="tel" autoComplete="tel" className="biz-walk-in-details-input" />
          </label>

          <div className="biz-walk-in-details-note rounded-xl px-3 py-3 text-xs font-semibold text-emerald-900">
            <span className="font-black">Why add details?</span> The {noun} becomes a normal party record, making future vouchers and account history easier to find by name or phone.
          </div>

          <div className="flex flex-col gap-2 pt-0.5 sm:flex-row-reverse">
            <button type="button" disabled={saving || !details.name.trim()} onClick={() => { if (!details.name.trim()) return; setOpen(false); toast.success('Details ready — save the voucher to create the record') }} className="biz-walk-in-details-submit flex h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">Use these details</button>
            <button type="button" onClick={() => setOpen(false)} className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:w-28">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
