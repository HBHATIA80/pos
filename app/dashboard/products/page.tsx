'use client'

import { useEffect, useMemo, useState } from 'react'
import { Package, Plus, RefreshCw, Search, Tags, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Role = 'admin' | 'staff' | 'user'
type Category = { id: string; name: string; code: string | null; description: string | null; is_active: boolean }
type Subcategory = Category & { category_id: string }
type Brand = Category
type Unit = { id: string; name: string; short_name: string; decimal_places: number; is_active: boolean }
type Product = {
  id: string
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category_id: string | null
  subcategory_id: string | null
  brand_id: string | null
  unit_id: string
  purchase_price: number
  sale_price: number
  opening_stock: number
  current_stock: number
  reorder_level: number
  is_active: boolean
  catalog_categories?: { id: string; name: string } | null
  catalog_subcategories?: { id: string; name: string } | null
  catalog_brands?: { id: string; name: string } | null
  catalog_units?: { id: string; name: string; short_name: string; decimal_places: number } | null
}

type Tab = 'products' | 'categories' | 'subcategories' | 'brands' | 'units'

const tabs: { key: Tab; label: string }[] = [
  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'subcategories', label: 'Subcategories' },
  { key: 'brands', label: 'Brands' },
  { key: 'units', label: 'Units' },
]

export default function ProductsPage() {
  const [role, setRole] = useState<Role>('user')
  const [tab, setTab] = useState<Tab>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const canManage = role === 'admin' || role === 'staff'

  async function loadProfile() {
    const response = await fetch('/api/catalog?entity=products', { cache: 'no-store' })
    if (response.status === 401) return
    const profileResponse = await fetch('/api/profile', { cache: 'no-store' }).catch(() => null)
    if (profileResponse?.ok) {
      const data = await profileResponse.json()
      setRole(data.profile?.role ?? 'user')
    }
  }

  async function loadAll() {
    setLoading(true)
    const results = await Promise.all(
      tabs.map((item) => fetch(`/api/catalog?entity=${item.key}`, { cache: 'no-store' }).then(async (response) => ({ key: item.key, response, data: await response.json().catch(() => ({})) }))))
    for (const result of results) {
      if (!result.response.ok) {
        if (result.response.status !== 401) toast.error(result.data.error ?? `Unable to load ${result.key}`)
        continue
      }
      if (result.key === 'products') setProducts(result.data.products ?? [])
      if (result.key === 'categories') setCategories(result.data.categories ?? [])
      if (result.key === 'subcategories') setSubcategories(result.data.subcategories ?? [])
      if (result.key === 'brands') setBrands(result.data.brands ?? [])
      if (result.key === 'units') setUnits(result.data.units ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadProfile()
    void loadAll()
  }, [])

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return products
    return products.filter((product) => [product.name, product.sku, product.barcode, product.catalog_categories?.name, product.catalog_subcategories?.name, product.catalog_brands?.name]
      .some((field) => field?.toLowerCase().includes(value)))
  }, [products, search])

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Phase 5 · Product & Catalog Master</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Product Catalog</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Manage products and the master data they depend on. No GST or tax is included. Inventory movements will be connected in a later phase.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void loadAll()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
            {canManage && <button onClick={() => setShowForm(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Add {tab === 'products' ? 'Product' : tab.slice(0, -1)}</button>}
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === item.key ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{item.label}</button>
          ))}
        </div>
      </section>

      {tab === 'products' ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, SKU, barcode, brand or category" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <ProductTable products={filteredProducts} />
        </section>
      ) : (
        <MasterTable tab={tab} categories={categories} subcategories={subcategories} brands={brands} units={units} />
      )}

      {loading && <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">Loading catalog…</div>}
      {showForm && <CatalogForm tab={tab} categories={categories} subcategories={subcategories} brands={brands} units={units} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); void loadAll() }} />}
    </div>
  )
}

function ProductTable({ products }: { products: Product[] }) {
  if (!products.length) return <EmptyState title="No products yet" description="Add your first product to start the catalog." />
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Brand</th><th className="px-5 py-3">Sale price</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => <tr key={product.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{product.name}</div><div className="mt-0.5 text-xs text-slate-500">{product.catalog_subcategories?.name ?? '—'}</div></td><td className="px-5 py-4 font-mono text-xs">{product.sku}</td><td className="px-5 py-4">{product.catalog_categories?.name ?? '—'}</td><td className="px-5 py-4">{product.catalog_brands?.name ?? '—'}</td><td className="px-5 py-4 font-semibold">{Number(product.sale_price).toFixed(2)}</td><td className="px-5 py-4">{Number(product.current_stock)} {product.catalog_units?.short_name ?? ''}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.is_active ? 'Available' : 'Inactive'}</span></td></tr>)}
        </tbody>
      </table>
    </div>
  )
}

function MasterTable({ tab, categories, subcategories, brands, units }: { tab: Tab; categories: Category[]; subcategories: Subcategory[]; brands: Brand[]; units: Unit[] }) {
  if (tab === 'categories') return <SimpleMaster title="Categories" rows={categories.map((item) => ({ id: item.id, name: item.name, detail: item.code ?? 'No code', active: item.is_active }))} />
  if (tab === 'brands') return <SimpleMaster title="Brands" rows={brands.map((item) => ({ id: item.id, name: item.name, detail: item.code ?? 'No code', active: item.is_active }))} />
  if (tab === 'units') return <SimpleMaster title="Units" rows={units.map((item) => ({ id: item.id, name: item.name, detail: `${item.short_name} · ${item.decimal_places} decimals`, active: item.is_active }))} />
  return <SimpleMaster title="Subcategories" rows={subcategories.map((item) => ({ id: item.id, name: item.name, detail: categories.find((category) => category.id === item.category_id)?.name ?? 'Category', active: item.is_active }))} />
}

function SimpleMaster({ title, rows }: { title: string; rows: { id: string; name: string; detail: string; active: boolean }[] }) {
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-900">{title}</h2></div>{rows.length ? <div className="divide-y divide-slate-100">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><div className="font-semibold">{row.name}</div><div className="text-xs text-slate-500">{row.detail}</div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.active ? 'Active' : 'Inactive'}</span></div>)}</div> : <EmptyState title={`No ${title.toLowerCase()} yet`} description="Add master data using the button above." />}</section>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Package className="h-5 w-5" /></span><h2 className="mt-4 font-semibold text-slate-900">{title}</h2><p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p></div>
}

function CatalogForm({ tab, categories, subcategories, brands, units, onClose, onSaved }: { tab: Tab; categories: Category[]; subcategories: Subcategory[]; brands: Brand[]; units: Unit[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({ decimal_places: '0', purchase_price: '0', sale_price: '0', opening_stock: '0', reorder_level: '0' })

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const data = tab === 'products'
      ? { sku: form.sku, barcode: form.barcode, name: form.name, description: form.description, category_id: form.category_id || null, subcategory_id: form.subcategory_id || null, brand_id: form.brand_id || null, unit_id: form.unit_id, purchase_price: form.purchase_price, sale_price: form.sale_price, opening_stock: form.opening_stock, reorder_level: form.reorder_level }
      : tab === 'units'
        ? { name: form.name, short_name: form.short_name, decimal_places: form.decimal_places }
        : tab === 'subcategories'
          ? { name: form.name, code: form.code, description: form.description, category_id: form.category_id }
          : { name: form.name, code: form.code, description: form.description }

    const response = await fetch('/api/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: tab, data }) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) return toast.error(result.error ?? 'Unable to save catalog item')
    toast.success(`${tab === 'products' ? 'Product' : tab.slice(0, -1)} added`)
    onSaved()
  }

  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/40 p-4"><div className="mx-auto my-4 max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-semibold text-slate-900">Add {tab === 'products' ? 'Product' : tab.slice(0, -1)}</h2><p className="mt-1 text-xs text-slate-500">All fields are business-scoped. GST/tax is intentionally not part of this phase.</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
    {tab === 'products' ? <>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Product name" value={form.name} onChange={(v) => set('name', v)} required /><Field label="SKU" value={form.sku} onChange={(v) => set('sku', v)} required /><Field label="Barcode" value={form.barcode} onChange={(v) => set('barcode', v)} /><SelectField label="Unit" value={form.unit_id} onChange={(v) => set('unit_id', v)} options={units.map((item) => [item.id, `${item.name} (${item.short_name})`])} required /></div>
      <div className="grid gap-4 sm:grid-cols-3"><SelectField label="Category" value={form.category_id} onChange={(v) => set('category_id', v)} options={categories.map((item) => [item.id, item.name])} /><SelectField label="Subcategory" value={form.subcategory_id} onChange={(v) => set('subcategory_id', v)} options={subcategories.filter((item) => !form.category_id || item.category_id === form.category_id).map((item) => [item.id, item.name])} /><SelectField label="Brand" value={form.brand_id} onChange={(v) => set('brand_id', v)} options={brands.map((item) => [item.id, item.name])} /></div>
      <div className="grid gap-4 sm:grid-cols-4"><NumberField label="Purchase price" value={form.purchase_price} onChange={(v) => set('purchase_price', v)} /><NumberField label="Sale price" value={form.sale_price} onChange={(v) => set('sale_price', v)} /><NumberField label="Opening stock" value={form.opening_stock} onChange={(v) => set('opening_stock', v)} /><NumberField label="Reorder level" value={form.reorder_level} onChange={(v) => set('reorder_level', v)} /></div>
      <TextArea label="Description" value={form.description} onChange={(v) => set('description', v)} />
    </> : tab === 'units' ? <div className="grid gap-4 sm:grid-cols-3"><Field label="Unit name" value={form.name} onChange={(v) => set('name', v)} required /><Field label="Short name" value={form.short_name} onChange={(v) => set('short_name', v)} required /><NumberField label="Decimal places" value={form.decimal_places} onChange={(v) => set('decimal_places', v)} /></div> : <>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Name" value={form.name} onChange={(v) => set('name', v)} required /><Field label="Code" value={form.code} onChange={(v) => set('code', v)} /></div>
      {tab === 'subcategories' && <SelectField label="Category" value={form.category_id} onChange={(v) => set('category_id', v)} options={categories.map((item) => [item.id, item.name])} required />}
      <TextArea label="Description" value={form.description} onChange={(v) => set('description', v)} />
    </>}
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button></div>
  </form></div></div>
}

function Field({ label, value, onChange, required }: { label: string; value?: string; onChange: (value: string) => void; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><input required={required} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> }
function NumberField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><input type="number" min="0" step="0.001" value={value ?? '0'} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> }
function TextArea({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><textarea rows={3} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> }
function SelectField({ label, value, onChange, options, required }: { label: string; value?: string; onChange: (value: string) => void; options: [string, string][]; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><select required={required} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">Select…</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> }
