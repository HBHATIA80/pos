'use client'

import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [todaySales, setTodaySales] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadTodaySales() {
      try {
        const response = await fetch('/api/invoices/sale?date=today', { cache: 'no-store' })
        const body = await response.json().catch(() => ({}))
        if (cancelled || !response.ok) return
        const invoices = Array.isArray(body.invoices) ? body.invoices : []
        const total = invoices.reduce((sum: number, invoice: { grand_total?: number }) => sum + Number(invoice.grand_total || 0), 0)
        setTodaySales(total)
      } catch {
        if (!cancelled) setTodaySales(0)
      }
    }
    void loadTodaySales()
    return () => { cancelled = true }
  }, [])

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700">Admin Dashboard</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Today’s Sales</h1>
        <p className="mt-1 text-sm text-slate-600">Total sales recorded today</p>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Today</p>
          <p className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            {todaySales === null ? 'Loading…' : `₹${todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
      </section>
    </main>
  )
}
