'use client'

import { useEffect, useState } from 'react'
import { Keyboard, X } from 'lucide-react'

const shortcuts = [
  ['F2', 'Focus product / barcode search'],
  ['F3', 'Focus customer / supplier search'],
  ['F4', 'Focus first quantity field'],
  ['F6', 'Open Latest 20 Vouchers'],
  ['Ctrl + Enter', 'Complete / checkout invoice'],
  ['Ctrl + D', 'Save invoice as draft / hold'],
  ['Alt + R', 'Refresh products and parties'],
  ['Esc', 'Close search lists / voucher window'],
  ['Tab', 'Move to the next billing field'],
  ['Shift + Tab', 'Move to the previous billing field'],
  ['Enter', 'Select the first search result'],
  ['F1', 'Show keyboard shortcuts'],
]

function isBillingRoute() {
  return window.location.pathname === '/dashboard/sales' || window.location.pathname === '/dashboard/purchases'
}

function focusFirst(selector: string) {
  const element = document.querySelector<HTMLElement>(selector)
  if (element) {
    element.focus()
    if (element instanceof HTMLInputElement) element.select()
  }
}

function clickButtonByText(pattern: RegExp) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(item => pattern.test(item.textContent || ''))
  button?.click()
}

export default function PosKeyboardShortcuts() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handler = (event: KeyboardEvent) => {
      if (!isBillingRoute()) return

      const target = event.target as HTMLElement | null
      const tag = target?.tagName || ''
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (event.key === 'F1') { event.preventDefault(); setOpen(true); return }
      if (event.key === 'F2') { event.preventDefault(); focusFirst('input[placeholder*="product" i], input[placeholder*="barcode" i]'); return }
      if (event.key === 'F3') { event.preventDefault(); focusFirst('input[placeholder*="customer" i], input[placeholder*="supplier" i], input[placeholder*="party" i]'); return }
      if (event.key === 'F4') { event.preventDefault(); focusFirst('main input[type="number"]'); return }
      if (event.key === 'F6') { event.preventDefault(); clickButtonByText(/latest 20 vouchers/i); return }
      if (event.altKey && event.key.toLowerCase() === 'r') { event.preventDefault(); clickButtonByText(/^refresh$/i); return }
      if (event.ctrlKey && event.key === 'Enter') { event.preventDefault(); clickButtonByText(/save & receive payment|complete purchase|checkout/i); return }
      if (event.ctrlKey && event.key.toLowerCase() === 'd') { event.preventDefault(); clickButtonByText(/save as draft|hold/i); return }

      if (event.key === 'Enter' && typing) {
        const placeholder = target?.getAttribute('placeholder') || ''
        if (/product|barcode|customer|supplier|party/i.test(placeholder)) {
          const parent = target?.closest('div.relative') || target?.parentElement
          const firstResult = parent?.querySelector<HTMLElement>('button')
          if (firstResult) { event.preventDefault(); firstResult.click(); return }
        }
      }

      if (event.key === 'Escape') { setOpen(false); return }

      if (event.key === 'Tab' && typing) {
        const root = document.querySelector<HTMLElement>('main')
        if (!root) return
        const fields = Array.from(root.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')).filter(field => field.offsetParent !== null)
        const index = fields.indexOf(target as HTMLElement)
        if (index < 0) return
        const nextIndex = event.shiftKey ? index - 1 : index + 1
        if (nextIndex >= 0 && nextIndex < fields.length) {
          event.preventDefault()
          fields[nextIndex].focus()
          if (fields[nextIndex] instanceof HTMLInputElement) fields[nextIndex].select()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!mounted || !isBillingRoute()) return null

  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-3 left-3 z-[90] hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 shadow-lg backdrop-blur sm:flex" title="Keyboard shortcuts (F1)">
      <Keyboard className="h-3.5 w-3.5 text-blue-600" /> Shortcuts <kbd className="rounded bg-slate-100 px-1">F1</kbd>
    </button>

    {open && <div className="biz-light-modal fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={() => setOpen(false)}>
      <div className="biz-light-modal-surface w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="pos-shortcuts-title" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 id="pos-shortcuts-title" className="text-base font-black text-slate-900">BIZBook Keyboard Shortcuts</h2><p className="text-xs text-slate-500">Designed for fast desktop Sales & Purchase billing</p></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close shortcuts"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2">
          {shortcuts.map(([key, description]) => <div key={key} className="flex items-center justify-between gap-3 bg-white px-4 py-3"><span className="text-xs text-slate-600">{description}</span><kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-700 shadow-sm">{key}</kbd></div>)}
        </div>
        <div className="border-t border-slate-200 px-5 py-3 text-[11px] text-slate-500">Tip: barcode scanners that behave like a keyboard can type into the product field and press Enter.</div>
      </div>
    </div>}
  </>
}
