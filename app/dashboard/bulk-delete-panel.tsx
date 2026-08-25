'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckSquare, Loader2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePathname } from 'next/navigation'

type Entity = 'purchase' | 'sale' | 'party' | 'product'
type Row = { id: string; label: string; meta?: string; status?: string }

const labels: Record<Entity, string> = { purchase: 'Purchase', sale: 'Sales', party: 'Party', product: 'Item' }

function entityForPath(pathname: string): Entity {
  if (pathname.includes('/purchases')) return 'purchase'
  if (pathname.includes('/sales')) return 'sale'
  if (pathname.includes('/parties')) return 'party'
  return 'product'
}

export default function BulkDeletePanel() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [entity, setEntity] = useState<Entity>(() => entityForPath(pathname || ''))
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    setEntity(entityForPath(pathname || ''))
  }, [open, pathname])

  useEffect(() => {
    if (!open) return
    void loadRows(entity)
  }, [open, entity])

  async function loadRows(nextEntity: Entity) {
    setLoading(true)
    setSelected([])
    try {
      const url = nextEntity === 'party'
        ? '/api/parties'
        : nextEntity === 'product'
          ? '/api/catalog?entity=products&limit=100'
          : nextEntity === 'purchase'
            ? '/api/purchases'
            : '/api/sales'
      const response = await fetch(url, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || `Unable to load ${labels[nextEntity].toLowerCase()} records`)
      const source = nextEntity === 'party' ? body.parties || [] : nextEntity === 'product' ? body.products || [] : nextEntity === 'purchase' ? body.purchases || [] : body.invoices || []
      setRows(source.map((row: any) => {
        if (nextEntity === 'party') return { id: row.id, label: row.name, meta: `${row.party_code || 'No code'} · ${row.party_type}`, status: row.is_active ? 'active' : 'inactive' }
        if (nextEntity === 'product') return { id: row.id, label: row.name, meta: `${row.sku} · Stock ${row.current_stock}`, status: row.is_active ? 'active' : 'inactive' }
        const partyName = Array.isArray(row.party) ? row.party?.[0]?.name : row.party?.name
        return { id: row.id, label: row.invoice_no, meta: `${partyName || 'Walk-in / Other'} · ₹${Number(row.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, status: row.status }
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load records')
    } finally { setLoading(false) }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(row => !q || `${row.label} ${row.meta || ''}`.toLowerCase().includes(q))
  }, [rows, search])

  const selectable = visible.filter(row => entity === 'purchase' || entity === 'sale' ? row.status === 'draft' : true)
  const allSelected = selectable.length > 0 && selectable.every(row => selected.includes(row.id))

  function toggle(id: string) {
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }

  async function deleteSelected() {
    if (!selected.length || deleting) return
    const confirmed = window.confirm(`Delete ${selected.length} selected ${labels[entity].toLowerCase()} record${selected.length === 1 ? '' : 's'}?\n\nDraft invoices can be deleted. Master records can only be deleted when they have no transaction or ledger links.`)
    if (!confirmed) return
    setDeleting(true)
    try {
      const response = await fetch('/api/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, ids: selected }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to delete selected records')
      toast.success(`${body.deleted ?? selected.length} ${labels[entity].toLowerCase()} record${Number(body.deleted ?? selected.length) === 1 ? '' : 's'} deleted`)
      await loadRows(entity)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to delete selected records') }
    finally { setDeleting(false) }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[70] inline-flex min-h-11 items-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-black text-white shadow-xl shadow-rose-200 hover:bg-rose-700">
      <Trash2 className="h-4 w-4" /> Bulk delete
    </button>
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <div><h2 className="text-lg font-black text-slate-950">Bulk delete records</h2><p className="mt-1 text-xs text-slate-500">Select multiple Purchase, Sales, Party or Item records.</p></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[auto_1fr]">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{(['purchase','sale','party','product'] as Entity[]).map(item => <button key={item} type="button" onClick={() => setEntity(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black ${entity === item ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600'}`}>{labels[item]}</button>)}</div>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${labels[entity].toLowerCase()} records…`} className="min-h-10 rounded-xl border px-3 text-sm outline-none focus:border-rose-400" />
        </div>
        <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2 text-xs">
          <label className="flex items-center gap-2 font-bold text-slate-700">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? selected.filter(id => !selectable.some(row => row.id === id)) : Array.from(new Set([...selected, ...selectable.map(row => row.id)])))} disabled={!selectable.length || loading} />
            <CheckSquare className="h-4 w-4" /> Select all safe records
          </label>
          <span className="font-bold text-slate-500">{selected.length} selected</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? <div className="flex items-center justify-center p-12 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div> : visible.length ? visible.map(row => {
            const safe = entity === 'purchase' || entity === 'sale' ? row.status === 'draft' : true
            return <label key={row.id} className={`flex cursor-pointer items-center gap-3 border-b px-4 py-3 hover:bg-rose-50/40 ${!safe ? 'opacity-55' : ''}`}><input type="checkbox" checked={selected.includes(row.id)} onChange={() => safe && toggle(row.id)} disabled={!safe || deleting} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{row.label}</span><span className="block truncate text-xs text-slate-500">{row.meta || ''}</span></span>{row.status && <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${row.status === 'draft' ? 'bg-amber-100 text-amber-700' : row.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.status}</span>}</label>
          }) : <div className="p-12 text-center text-sm text-slate-500">No records found.</div>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Completed sales/purchases are protected. Linked parties/items are protected.</p><div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-xl border px-4 text-sm font-bold">Close</button><button type="button" onClick={() => void deleteSelected()} disabled={!selected.length || deleting} className="min-h-10 rounded-xl bg-rose-600 px-4 text-sm font-black text-white disabled:opacity-40">{deleting ? 'Deleting…' : `Delete selected (${selected.length})`}</button></div></div>
      </div>
    </div>}
  </>
}
