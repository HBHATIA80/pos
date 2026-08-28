'use client'

import { useEffect } from 'react'

/**
 * Shared POS click-away behavior. Sales/Purchase pages already listen for
 * Escape, so dispatching the same event keeps one source of truth for closing
 * product/customer search lists and voucher windows.
 */
export default function ClickAwayCloser() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return

      const productField = document.querySelector<HTMLInputElement>('input[placeholder*="product" i], input[placeholder*="barcode" i]')
      const partyField = document.querySelector<HTMLInputElement>('input[placeholder*="customer" i], input[placeholder*="supplier" i], input[placeholder*="party" i]')

      const productRoot = productField?.closest('.relative')
      const partyRoot = partyField?.closest('.relative')
      if (productRoot?.contains(target) || partyRoot?.contains(target)) return

      // Do not close unrelated controls/modals. Only trigger Escape when a
      // POS search/voucher surface is actually open.
      const hasOpenPopover = Array.from(document.querySelectorAll<HTMLElement>('.relative > .absolute')).some((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== 'hidden'
      })
      const hasVoucherWindow = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).some((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })

      if (hasOpenPopover || hasVoucherWindow) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      }
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [])

  return null
}
