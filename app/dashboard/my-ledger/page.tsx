'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'

type Item = {
  id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  line_total: number
}

type Purchase = {
  id: string
  invoice_no: string
  date: string
  status: string
  grand_total: number
  paid_amount: number
  balance_amount: number
  items: Item[]
}

type Entry = {
  id: string
  type: 'purchase' | 'payment'
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
}

type LedgerData = {
  customer: {
    name: string
    party_id?: string | null
  }
  summary: {
    purchase_count: number
    purchase_total: number
    paid_total: number
    outstanding_total: number
  }
  purchases: Purchase[]
  entries: Entry[]
}

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('en-IN')
}

function statusLabel(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function MyLedgerPage() {
  const [data, setData] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/customer/ledger', {
        cache: 'no-store',
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message = body.error ?? 'Unable to load ledger'
        setData(null)
        setError(message)
        toast.error(message)
        return
      }

      setData(body)
    } catch (loadError) {
      console.error('Customer ledger load error:', loadError)
      const message = 'Unable to load ledger'
      setData(null)
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Customer Portal · Ledger
            </span>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              My Ledger
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              All completed purchases and payments linked to your customer account are shown here, including transactions entered by the shop.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Shop & Orders
            </Link>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Loading ledger…
        </section>
      )}

      {!loading && error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-800">Unable to load your ledger</p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </section>
      )}

      {!loading && !error && data && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
              <p className="mt-2 truncate font-semibold text-slate-900">
                {data.customer.name || 'Customer'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purchases</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {data.summary.purchase_count}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purchase total</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {money(data.summary.purchase_total)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Paid {money(data.summary.paid_total)}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Outstanding</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">
                {money(data.summary.outstanding_total)}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <WalletCards className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-semibold text-slate-900">Running ledger</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Purchases increase the balance; payments reduce it.
                </p>
              </div>
            </div>

            {!data.entries.length ? (
              <div className="p-10 text-center">
                <WalletCards className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  No ledger entries yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Completed transactions linked to your customer account will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Debit</th>
                      <th className="px-5 py-3 text-right">Credit</th>
                      <th className="px-5 py-3 text-right">Balance</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {data.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                          {formatDate(entry.date)}
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              entry.type === 'payment'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {entry.type === 'payment' ? 'Payment' : 'Purchase'}
                          </span>
                        </td>

                        <td className="px-5 py-3 font-medium text-slate-900">
                          {entry.reference || '—'}
                        </td>

                        <td className="px-5 py-3 text-slate-600">
                          {entry.description || '—'}
                        </td>

                        <td className="px-5 py-3 text-right font-medium text-slate-900">
                          {entry.debit ? money(entry.debit) : '—'}
                        </td>

                        <td className="px-5 py-3 text-right font-medium text-green-700">
                          {entry.credit ? money(entry.credit) : '—'}
                        </td>

                        <td className="px-5 py-3 text-right font-bold text-slate-900">
                          {money(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Previous purchases</h2>
              <p className="mt-1 text-xs text-slate-500">
                Purchases linked to this customer, whether entered through the customer portal or by shop staff.
              </p>
            </div>

            {!data.purchases.length ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-slate-600">No purchases yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Completed purchases for this customer will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.purchases.map((purchase) => (
                  <div key={purchase.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {purchase.invoice_no}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {statusLabel(purchase.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(purchase.date)}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="font-bold text-slate-900">
                          {money(purchase.grand_total)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Paid {money(purchase.paid_amount)} · Balance {money(purchase.balance_amount)}
                        </p>
                      </div>
                    </div>

                    {purchase.items?.length > 0 && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {purchase.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                          >
                            <p className="font-medium text-slate-900">
                              {item.product_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.sku} · Qty {Number(item.quantity)} · {money(item.unit_price)}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-slate-700">
                              Line total {money(item.line_total)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
