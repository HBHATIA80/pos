'use client'

import { useEffect } from 'react'

/**
 * Sales stock policy:
 * - A sale is allowed even when current stock is zero or already negative.
 * - The POS still needs a large frontend stock ceiling so the existing quantity
 *   controls do not block an over-sale. The database remains the source of truth
 *   and records the resulting negative stock.
 * - The original current_stock is preserved locally and shown as "Available" in
 *   the product picker, so staff see the real remaining inventory after prior sales.
 */
const ORIGINAL_STOCK = new Map<string, number>()
const FRONTEND_STOCK = 1_000_000_000

export default function SalesStockPolicy() {
  useEffect(() => {
    if (!window.location.pathname.startsWith('/dashboard/sales')) return

    const originalFetch = window.fetch.bind(window)

    const patchedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init)
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.url
      if (!url.includes('/api/pos/products')) return response

      try {
        const payload = await response.clone().json()
        if (!Array.isArray(payload?.products)) return response

        for (const product of payload.products) {
          const stock = Number(product.current_stock)
          if (!Number.isFinite(stock)) continue
          ORIGINAL_STOCK.set(String(product.id), stock)
          if (product.sku) ORIGINAL_STOCK.set(`sku:${product.sku}`, stock)
          product.current_stock = FRONTEND_STOCK
        }

        const headers = new Headers(response.headers)
        headers.set('content-type', 'application/json')
        return new Response(JSON.stringify(payload), {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      } catch {
        return response
      }
    }

    window.fetch = patchedFetch

    const renderAvailableStock = () => {
      const picker = document.querySelector('[class*="z-[100]"]')
      if (!picker) return

      const rows = picker.querySelectorAll('button')
      rows.forEach(row => {
        const stockNode = Array.from(row.querySelectorAll('span')).find(node => /Stock:\s*\d/i.test(node.textContent || ''))
        if (!stockNode) return

        const match = (stockNode.textContent || '').match(/SKU:\s*([^·]+?)\s*·\s*Stock:\s*[-\d.]+/i)
        const sku = match?.[1]?.trim()
        const stock = sku ? ORIGINAL_STOCK.get(`sku:${sku}`) : undefined
        if (stock === undefined) return

        stockNode.textContent = `SKU: ${sku} · Available: ${stock}`
      })
    }

    const observer = new MutationObserver(renderAvailableStock)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    renderAvailableStock()

    return () => {
      window.fetch = originalFetch
      observer.disconnect()
    }
  }, [])

  return null
}
