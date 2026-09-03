'use client'

import { useEffect } from 'react'

export default function AvailableStockDisplay() {
  useEffect(() => {
    const update = () => {
      const stockSpans = Array.from(document.querySelectorAll('span')).filter(el => /SKU:\s*.*?·\s*Stock:\s*\d+(?:\.\d+)?/.test(el.textContent || ''))
      const cartRows = Array.from(document.querySelectorAll('tbody tr'))
      stockSpans.forEach(span => {
        const text = span.textContent || ''
        const match = text.match(/SKU:\s*(.*?)\s*·\s*Stock:\s*(\d+(?:\.\d+)?)/)
        if (!match) return
        const sku = match[1].trim()
        const stock = Number(match[2])
        let reserved = 0
        cartRows.forEach(row => {
          if (!(row.textContent || '').includes(sku)) return
          const quantityInputs = Array.from(row.querySelectorAll<HTMLInputElement>('input[aria-label^="Quantity for"]'))
          quantityInputs.forEach(input => { reserved += Number(input.value || 0) })
        })
        const available = Math.max(0, stock - reserved)
        span.textContent = `SKU: ${sku} · Available: ${available}`
      })
    }

    update()
    const observer = new MutationObserver(update)
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['value'] })
    const interval = window.setInterval(update, 500)
    return () => { observer.disconnect(); window.clearInterval(interval) }
  }, [])

  return null
}
