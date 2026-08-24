'use client'

import { useEffect } from 'react'

export default function CustomerCatalogGuard({ role }: { role: string }) {
  useEffect(() => {
    if (role !== 'user') return
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (!url.startsWith('/api/pos/products')) return originalFetch(input, init)
      const nextUrl = url.replace('/api/pos/products', '/api/customer/products')
      const response = await originalFetch(nextUrl, init)
      if (!response.ok) return response
      const body = await response.clone().json().catch(() => null)
      if (!body?.products) return response
      const products = body.products.map((product: { availability?: string; [key: string]: unknown }) => ({
        ...product,
        current_stock: product.availability === 'available' ? 1 : 0,
      }))
      return new Response(JSON.stringify({ ...body, products }), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    }
    return () => { window.fetch = originalFetch }
  }, [role])
  return null
}
