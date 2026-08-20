'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Loader2, PackageCheck, RefreshCw, Search, Truck, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

type OrderStatus = 'placed' | 'accepted' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled'

type Order = {
  id: string
  invoice_no: string
  status: 'draft' | 'completed' | 'void'
  order_channel: 'pos' | 'customer_portal'
  order_status: OrderStatus | null
  grand_total: number
  created_at: string
  completed_at: string | null
  parties?: { id: string; name: string; phone: string | null; party_type: string } | null
  sales_invoice_items: Array<{ id: string; product_name: string; sku: string; quantity: number; unit_price: number; line_total: number }>
  sales_order_events: Array<{ id: string; status: OrderStatus; note: string | null; created_at: string }>
}

const statuses: Array<{ value: 'all' | OrderStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'placed', label: 'New' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'packed', label: 'Packed' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const nextActions: Record<OrderStatus, Array<{ status: Exclude<OrderStatus, 'placed'>; label: string; icon: typeof Check }>> = {
  placed: [
    { status: 'accepted', label: 'Accept order', icon: Check },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  accepted: [
    { status: 'packed', label: 'Mark packed', icon: PackageCheck },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  packed: [
    { status: 'out_for_delivery', label: 'Out for delivery', icon: Truck },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  out_for_delivery: [
    { status: 'delivered', label: 'Mark delivered', icon: Check },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  delivered: [],
  cancelled: [],
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function statusLabel(status: OrderStatus | null) {
  return status ? status.replace(/_/g, ' ') : '—'
}

function statusClass(status: OrderStatus | null) {
  if (status === 'delivered') return 'bg-green-100 text-green-700'
  if (status === 'cancelled') return 'bg-red-100 text-red-700'
  if (status === 'placed') return 'bg-amber-100 text-amber-700'
  return 'bg-blue-100 text-blue-700'
}

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState<'all' | OrderStatus>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (query.trim()) params.set('q', query.trim())

    const response = await fetch(`/api/order-management?${params.toString()}`, { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      toast.error(body.error ?? 'Unable to load orders')
      setOrders([])
      setLoading(false)
      return
    }

    setOrders(body.orders ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [status])

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedId) ?? null, [orders, selectedId])

  async function changeStatus(invoiceId: string, nextStatus: Exclude<OrderStatus, 'placed'>) {
    setWorkingId(invoiceId)
    try {
      const response = await fetch('/api/order-management', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId, status: nextStatus }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error ?? 'Unable to update order')
      toast.success(nextStatus === 'delivered' ? 'Order delivered and added to ledger' : `Order marked ${statusLabel(nextStatus)}`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update order')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Order Management</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Customer Orders</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Review customer-portal orders, advance fulfillment status, and mark delivered orders so they enter the customer ledger.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load() }} placeholder="Search invoice or note" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>
          <button type="button" onClick={() => void load()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Search</button>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {statuses.map((item) => (
          <button key={item.value} type="button" onClick={() => setStatus(item.value)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${status === item.value ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
            {item.label}
          </button>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading customer orders…</div>
        ) : !orders.length ? (
          <div className="p-12 text-center text-sm text-slate-500">No customer orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const actions = order.order_status ? nextActions[order.order_status] : []
                  return (
                    <tr key={order.id} className="align-top">
                      <td className="px-5 py-4">
                        <button type="button" onClick={() => setSelectedId(order.id)} className="text-left">
                          <p className="font-semibold text-slate-900 hover:text-blue-700">{order.invoice_no}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">{order.parties?.name ?? 'Customer portal user'}</p>
                        <p className="mt-1 text-xs text-slate-500">{order.parties?.phone ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{order.sales_invoice_items.length} line{order.sales_invoice_items.length === 1 ? '' : 's'}</td>
                      <td className="px-5 py-4 font-bold text-slate-900">{money(order.grand_total)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass(order.order_status)}`}>
                          {statusLabel(order.order_status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {actions.map((action) => {
                            const Icon = action.icon
                            const disabled = workingId === order.id
                            return (
                              <button key={action.status} type="button" disabled={disabled} onClick={() => void changeStatus(order.id, action.status)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60 ${action.status === 'cancelled' ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                                {action.label}
                              </button>
                            )
                          })}
                          <button type="button" onClick={() => setSelectedId(order.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">View</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6" onMouseDown={() => setSelectedId(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Customer Order</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">{selectedOrder.invoice_no}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedOrder.parties?.name ?? 'Customer portal user'} · {money(selectedOrder.grand_total)}</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><XCircle className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current status</p>
                <p className="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize bg-blue-100 text-blue-700">{statusLabel(selectedOrder.order_status)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order date</p>
                <p className="mt-2 font-semibold text-slate-900">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">Items</div>
              <div className="divide-y divide-slate-100">
                {selectedOrder.sales_invoice_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div><p className="font-medium text-slate-900">{item.product_name}</p><p className="text-xs text-slate-500">{item.sku} · Qty {Number(item.quantity)}</p></div>
                    <p className="font-semibold text-slate-900">{money(item.line_total)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 font-semibold text-slate-900"><Clock3 className="h-4 w-4 text-blue-600" /> Order timeline</div>
              <div className="divide-y divide-slate-100">
                {selectedOrder.sales_order_events.map((event) => (
                  <div key={event.id} className="flex gap-3 px-4 py-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <div className="min-w-0"><p className="font-medium capitalize text-slate-900">{statusLabel(event.status)}</p><p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}{event.note ? ` · ${event.note}` : ''}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
