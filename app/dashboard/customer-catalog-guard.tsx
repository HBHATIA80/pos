'use client'

import { useEffect } from 'react'

export default function CustomerCatalogGuard({ role }: { role: string }) {
  useEffect(() => {
    if (role !== 'user') return
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.startsWith('/api/pos/products')) {
        const nextUrl = url.replace('/api/pos/products', '/api/customer/products')
        return originalFetch(nextUrl, init)
      }
      return originalFetch(input, init)
    }
    return () => { window.fetch = originalFetch }
  }, [role])
  return null
}
