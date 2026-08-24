'use client'

import { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, Loader2, Package, Plus, RefreshCw, Search, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Role = 'admin' | 'staff' | 'user'
type Master = { id: string; name: string; short_name?: string; decimal_places?: number; is_active: boolean }
type Product = { id: string; sku: string; barcode: string | null; name: string; image_url: string | null; sale_price: number; current_stock: number; is_active: boolean; catalog_categories?: { id: string; name: string } | null; catalog_units?: { short_name: string } | null }
type Tab = 'products' | 'categories' | 'subcategories' | 'brands' | 'units'
const tabs: { key: Tab; label: string }[] = [{ key: 'products', label: 'Products' }, { key: 'categories', label: 'Categories' }, { key: 'subcategories', label: 'Subcategories' }, { key: 'brands', label: 'Brands' }, { key: 'units', label: 'Units' }]

export default function ProductsPage() {
  const [role, setRole] = useState<Role>('user')
  const [tab, setTab] = useState<Tab>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [masters, setMasters] = useState<Record<string, Master[]>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)

  const canManage = role !== 'user'

  async function loadProducts(q = search, append = false) {
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const params = new URLSearchParams({ entity: 'products', q: q.trim(), limit: '50', offset: String(append ? products.length : 0) })
      const response = await fetch(`/api/catalog?${params}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load products')
      setProducts((current) => append ? [...current, ...(body.products ?? [])] : (body.products ?? []))
      setTotal(body.total ?? 0)
      setHasMore(Boolean(body.hasMore))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load products') }
    finally { if (append) setLoadingMore(false); else setLoading(false) }
  }

  async function boot() {
    setLoading(true)
    try {
      const profile = await fetch('/api/profile', { cache: 'no-store' })
      if (profile.ok) { const body = await profile.json(); setRole(body.profile?.role ?? 'user') }
      await loadProducts('')
      const results = await Promise.all(tabs.slice(1).map(async (item) => {
        const response = await fetch(`/api/catalog?entity=${item.key}`, { cache: 'no-store' })
        const body = await response.json()
        return [item.key, (body[item.key] ?? []) as Master[]] as const
      }))
      setMasters(Object.fromEntries(results))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load catalog') }
    finally { setLoading(false) }
  }

  useEffect(() => { void boot() }, [])
  useEffect(() => { if (tab !== 'products') return; const timer = setTimeout(() => void loadProducts(), 250); return () => clearTimeout(timer) }, [search])

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/15"><Package className="h-3.5 w-3.5" /> BIZBook Catalog</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Products & Inventory Masters</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">Manage thousands of SKUs with clean masters, stock controls and product photography for your counter and customer portal.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void boot()} className="min-h-11 rounded-2xl bg-white/10 px-4 text-sm font-bold ring-1 ring-white/15"><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</button>
          {canManage && <button type="button" onClick={() => setShowForm(true)} className="min-h-11 rounded-2xl bg-white px-4 text-sm font-black text-indigo-700 shadow-sm"><Plus className="mr-2 inline h-4 w-4" />Add Product</button>}
        </div>
      </div>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{tabs.map((item) => <button type="button" key={item.key} onClick={() => setTab(item.key)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === item.key ? 'bg-white text-indigo-700' : 'bg-white/10 text-white hover:bg-white/15'}`}>{item.label}</button>)}</div>
    </section>

    {tab === 'products' ? <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, SKU or barcode…" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-10 text-base outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}</div>
        <span className="text-xs font-bold text-slate-500">{total.toLocaleString('en-IN')} products · {products.length} loaded</span>
      </div>
      {loading && !products.length ? <div className="p-16 text-center text-sm text-slate-500"><Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" /><p className="mt-3">Loading catalog…</p></div> : !products.length ? <Empty /> : <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Sale</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.id} className="hover:bg-slate-50/80"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}</div><div><div className="font-bold text-slate-900">{product.name}</div><div className="mt-0.5 text-xs text-slate-400">{product.barcode || 'No barcode'}</div></div></div></td><td className="px-5 py-4 font-mono text-xs">{product.sku}</td><td className="px-5 py-4">{product.catalog_categories?.name ?? '—'}</td><td className="px-5 py-4 font-black">₹{Number(product.sale_price).toLocaleString('en-IN')}</td><td className="px-5 py-4 font-semibold">{Number(product.current_stock)} {product.catalog_units?.short_name ?? ''}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.is_active ? 'Available' : 'Inactive'}</span></td></tr>)}</tbody></table></div>}
      {hasMore && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => void loadProducts(search, true)} disabled={loadingMore} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loadingMore ? 'Loading…' : 'Load more products'}</button></div>}
    </section> : <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5 font-black capitalize">{tab}</div>{(masters[tab] ?? []).map((item) => <div key={item.id} className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><div className="font-semibold">{item.name}</div>{item.short_name && <div className="text-xs text-slate-400">{item.short_name}</div>}</div><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{item.is_active ? 'Active' : 'Inactive'}</span></div>)}{!(masters[tab] ?? []).length && <div className="p-10 text-center text-sm text-slate-500">No {tab} found.</div>}</section>}

    {showForm && <ProductForm masters={masters} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); void loadProducts() }} />}
  </div>
}

function Empty() { return <div className="p-16 text-center"><Package className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No matching products</p><p className="mt-1 text-sm text-slate-400">Try another name, SKU or barcode.</p></div> }

function ProductForm({ masters, onClose, onSaved }: { masters: Record<string, Master[]>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', description: '', category_id: '', subcategory_id: '', brand_id: '', unit_id: '', sale_price: '0', purchase_price: '0', opening_stock: '0', reorder_level: '0', is_active: true })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))
  const categories = masters.categories ?? []
  const subcategories = masters.subcategories ?? []
  const brands = masters.brands ?? []
  const units = masters.units ?? []
  const filteredSubcategories = useMemo(() => subcategories.filter((item) => !form.category_id || (item as Master & { category_id?: string }).category_id === form.category_id), [subcategories, form.category_id])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function chooseImage(file: File | null) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Use JPG, PNG or WebP.')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be 5 MB or smaller.')
    if (preview) URL.revokeObjectURL(preview)
    setImageFile(file); setPreview(URL.createObjectURL(file))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.unit_id) return toast.error('Select a unit before saving the product.')
    setSaving(true)
    try {
      let imageUrl = ''
      if (imageFile) {
        const data = new FormData(); data.append('file', imageFile)
        const upload = await fetch('/api/catalog/image', { method: 'POST', body: data })
        const uploadBody = await upload.json().catch(() => ({}))
        if (!upload.ok) throw new Error(uploadBody.error || 'Unable to upload product image')
        imageUrl = uploadBody.url || ''
      }
      const response = await fetch('/api/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'products', data: { ...form, category_id: form.category_id || null, subcategory_id: form.subcategory_id || null, brand_id: form.brand_id || null, image_url: imageUrl || null } }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to save product')
      toast.success('Product added to BIZBook')
      onSaved()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save product') }
    finally { setSaving(false) }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', required = false) => <label className="block text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-rose-500">*</span>}<input required={required} type={type} value={String(form[key])} onChange={(event) => set(key, event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" /></label>

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><div className="mx-auto my-4 max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl sm:my-8"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">BIZBook Product Master</p><h2 className="mt-1 text-2xl font-black text-slate-950">Add New Product</h2><p className="mt-1 text-sm text-slate-500">Add pricing, stock, masters and an optional product image. The image will also appear in customer shopping.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X /></button></div><form onSubmit={submit} className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[260px_1fr]">
    <div><div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3"><div className="aspect-square overflow-hidden rounded-xl bg-white">{preview ? <img src={preview} alt="Product preview" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-center text-slate-400"><ImageIcon className="h-12 w-12 text-slate-200" /><p className="mt-3 text-sm font-semibold">Product image</p><p className="mt-1 text-xs">JPG, PNG or WebP · max 5 MB</p></div>}</div><label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"><Upload className="h-4 w-4" />{preview ? 'Change Image' : 'Add Product Image'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => chooseImage(event.target.files?.[0] ?? null)} /></label>{preview && <button type="button" onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(''); setImageFile(null) }} className="mt-2 w-full rounded-xl py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Remove image</button>}</div><div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-xs leading-5 text-indigo-800"><b>Tip:</b> Use a clean front-facing image. It will be used by the POS search and customer shop.</div></div>
    <div className="grid gap-4 sm:grid-cols-2">{field('Product Name', 'name', 'text', true)}{field('SKU', 'sku', 'text', true)}{field('Barcode', 'barcode')}<label className="block text-sm font-semibold text-slate-700">Unit<span className="ml-1 text-rose-500">*</span><select required value={form.unit_id} onChange={(event) => set('unit_id', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"><option value="">Select unit</option>{units.map((item) => <option key={item.id} value={item.id}>{item.name}{item.short_name ? ` (${item.short_name})` : ''}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">Category<select value={form.category_id} onChange={(event) => { set('category_id', event.target.value); set('subcategory_id', '') }} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"><option value="">Select category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">Subcategory<select value={form.subcategory_id} onChange={(event) => set('subcategory_id', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"><option value="">Select subcategory</option>{filteredSubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">Brand<select value={form.brand_id} onChange={(event) => set('brand_id', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"><option value="">Select brand</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{field('Purchase Price', 'purchase_price', 'number', true)}{field('Sale Price', 'sale_price', 'number', true)}{field('Opening Stock', 'opening_stock', 'number', true)}{field('Reorder Level', 'reorder_level', 'number', true)}<label className="sm:col-span-2 block text-sm font-semibold text-slate-700">Description<textarea value={form.description} onChange={(event) => set('description', event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" /></label><label className="sm:col-span-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={(event) => set('is_active', event.target.checked)} className="h-4 w-4 accent-indigo-600" />Product is active and available for sale</label><div className="sm:col-span-2 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700">Cancel</button><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-100 disabled:opacity-50">{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Plus className="h-4 w-4" />Save Product</>}</button></div></div>
  </form></div></div>
}
