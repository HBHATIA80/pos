'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ImagePlus, Loader2, Package, Save, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'

type Master = { id: string; name: string; short_name?: string; category_id?: string; is_active: boolean }
type Product = { id: string; sku: string; barcode: string | null; name: string; description: string | null; category_id: string | null; subcategory_id: string | null; brand_id: string | null; unit_id: string; purchase_price: number; sale_price: number; opening_stock: number; current_stock: number; reorder_level: number; image_url: string | null; is_active: boolean }

export default function EditProductPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [masters, setMasters] = useState<Record<string, Master[]>>({})
  const [product, setProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name:'', sku:'', barcode:'', description:'', category_id:'', subcategory_id:'', brand_id:'', unit_id:'', purchase_price:'0', sale_price:'0', reorder_level:'0', is_active:true })
  const [file, setFile] = useState<File|null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const [productResponse, ...masterResponses] = await Promise.all([
        fetch(`/api/catalog?entity=products&id=${encodeURIComponent(id)}&limit=1`, { cache:'no-store' }),
        ...['categories','subcategories','brands','units'].map(key => fetch(`/api/catalog?entity=${key}`, { cache:'no-store' }))
      ])
      const productBody = await productResponse.json()
      if (!productResponse.ok || !productBody.products?.[0]) throw new Error(productBody.error || 'Product not found')
      const item = productBody.products[0] as Product
      setProduct(item)
      setForm({ name:item.name, sku:item.sku, barcode:item.barcode ?? '', description:item.description ?? '', category_id:item.category_id ?? '', subcategory_id:item.subcategory_id ?? '', brand_id:item.brand_id ?? '', unit_id:item.unit_id, purchase_price:String(item.purchase_price ?? 0), sale_price:String(item.sale_price ?? 0), reorder_level:String(item.reorder_level ?? 0), is_active:item.is_active })
      setPreview(item.image_url ?? '')
      const loaded: Record<string, Master[]> = {}
      for (const [index,key] of ['categories','subcategories','brands','units'].entries()) { const body = await masterResponses[index].json(); loaded[key] = body[key] ?? [] }
      setMasters(loaded)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load product') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [id])
  const subs = useMemo(() => (masters.subcategories ?? []).filter(item => !form.category_id || item.category_id === form.category_id), [masters.subcategories, form.category_id])
  function set(key:string, value:string|boolean) { setForm(current => ({ ...current, [key]: value })) }
  function choose(file:File|null) { if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return toast.error('Use JPG, PNG or WebP'); if (file.size > 5*1024*1024) return toast.error('Image must be 5 MB or smaller'); if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); setFile(file); setPreview(URL.createObjectURL(file)) }

  async function submit(event:React.FormEvent) {
    event.preventDefault(); if (!id) return
    if (!form.unit_id) return toast.error('Select a unit')
    setSaving(true)
    try {
      let imageUrl = product?.image_url ?? null
      if (file) { const fd = new FormData(); fd.append('file', file); const imageResponse = await fetch('/api/catalog/image', { method:'POST', body:fd }); const imageBody = await imageResponse.json(); if (!imageResponse.ok) throw new Error(imageBody.error || 'Image upload failed'); imageUrl = imageBody.url || null }
      const response = await fetch('/api/catalog', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity:'products', id, data:{ ...form, barcode:form.barcode || null, description:form.description || null, category_id:form.category_id || null, subcategory_id:form.subcategory_id || null, brand_id:form.brand_id || null, purchase_price:Number(form.purchase_price), sale_price:Number(form.sale_price), reorder_level:Number(form.reorder_level), image_url:imageUrl } }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to update product')
      toast.success('Product updated successfully'); window.location.href = '/dashboard/products'
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update product') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600"/><p className="mt-3 text-sm font-semibold text-slate-500">Loading product…</p></div></div>
  if (!product) return <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center"><Package className="mx-auto h-10 w-10 text-slate-300"/><h1 className="mt-4 text-xl font-black">Product not found</h1><Link href="/dashboard/products" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-black text-white">Back to Products</Link></div>

  const input = (label:string, key:keyof typeof form, type='text', required=false) => <label className="text-sm font-bold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}<input required={required} type={type} value={String(form[key])} onChange={event=>set(key,event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"/></label>
  const select = (label:string, key:'category_id'|'subcategory_id'|'brand_id'|'unit_id', items:Master[], required=false) => <label className="text-sm font-bold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}<select required={required} value={form[key]} onChange={event=>{set(key,event.target.value); if(key==='category_id') setForm(current=>({...current, category_id:event.target.value, subcategory_id:''}))}} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"><option value="">Select {label.toLowerCase()}</option>{items.map(item=><option key={item.id} value={item.id}>{item.name}{item.short_name ? ` (${item.short_name})` : ''}</option>)}</select></label>

  return <main className="mx-auto max-w-6xl space-y-5 pb-10"><div className="flex items-center gap-3"><Link href="/dashboard/products" className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50"><ArrowLeft className="h-5 w-5"/></Link><div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">BIZBook Product Master</p><h1 className="text-2xl font-black sm:text-3xl">Edit Product</h1><p className="text-sm text-slate-500">Update product details, pricing, classification, image and availability.</p></div></div><form onSubmit={submit} className="grid gap-5 lg:grid-cols-[280px_1fr]"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Product Image</h2><div className="mt-4 aspect-square overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">{preview ? <img src={preview} alt={product.name} className="h-full w-full object-cover"/> : <div className="flex h-full flex-col items-center justify-center text-center text-slate-400"><ImagePlus className="h-12 w-12"/><p className="mt-3 text-sm font-semibold">Add product photo</p><p className="mt-1 text-xs">JPG, PNG or WebP · max 5 MB</p></div>}</div><label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-black text-white"><Upload className="mr-2 h-4 w-4"/>Choose Image<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event=>choose(event.target.files?.[0] ?? null)}/></label>{file && <button type="button" onClick={()=>{if(preview.startsWith('blob:')) URL.revokeObjectURL(preview); setFile(null); setPreview(product.image_url ?? '')}} className="mt-2 w-full rounded-xl border px-4 py-2 text-xs font-bold text-slate-600"><X className="mr-1 inline h-3.5 w-3.5"/>Remove new image</button>}</section><div className="space-y-5"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Package className="h-5 w-5"/></span><div><h2 className="font-black">Basic Information</h2><p className="text-xs text-slate-500">Identity and classification</p></div></div><div className="grid gap-4 sm:grid-cols-2">{input('Product Name','name','text',true)}{input('SKU','sku','text',true)}{input('Barcode','barcode')}{input('Description','description')}{select('Category','category_id',masters.categories ?? [])}{select('Subcategory','subcategory_id',subs)}{select('Brand','brand_id',masters.brands ?? [])}{select('Unit','unit_id',masters.units ?? [],true)}</div></section><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="font-black">Pricing & Stock</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{input('Purchase Price','purchase_price','number')}{input('Sale Price','sale_price','number')}{input('Reorder Level','reorder_level','number')}<label className="text-sm font-bold text-slate-700">Current Stock<input disabled value={String(product.current_stock)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-500"/><span className="mt-1 block text-[11px] font-normal text-slate-400">Use Inventory Control to change stock.</span></label></div></section><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><label className="flex cursor-pointer items-center justify-between gap-4"><span><span className="block font-black">Product availability</span><span className="text-xs text-slate-500">Inactive products remain in history but are hidden from normal selling.</span></span><input type="checkbox" checked={form.is_active} onChange={event=>set('is_active',event.target.checked)} className="h-5 w-5 accent-indigo-600"/></label></section><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/dashboard/products" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-6 font-bold">Cancel</Link><button disabled={saving} className="min-h-12 rounded-xl bg-indigo-600 px-7 font-black text-white shadow-lg shadow-indigo-200 disabled:opacity-60"><Save className="mr-2 inline h-4 w-4"/>{saving?'Saving Changes…':'Save Changes'}</button></div></div></form></main>
}
