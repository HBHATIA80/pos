import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 10 * 1024 * 1024
const text = (v: unknown) => String(v ?? '').trim()
const num = (v: unknown, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback }
const key = (v: unknown) => text(v).toLowerCase()

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id || !['admin','staff'].includes(profile.role)) return NextResponse.json({ error: 'Only active admin/staff can import products' }, { status: 403 })
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Excel file is required' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Maximum Excel size is 10 MB' }, { status: 400 })

  try {
    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) return NextResponse.json({ error: 'The workbook has no worksheet' }, { status: 400 })
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (!rows.length) return NextResponse.json({ error: 'The worksheet is empty' }, { status: 400 })
    if (rows.length > 5000) return NextResponse.json({ error: 'Maximum 5,000 products per upload. Split larger files into batches.' }, { status: 400 })

    const businessId = profile.business_id
    const [{ data: categories }, { data: subcategories }, { data: brands }, { data: units }] = await Promise.all([
      supabase.from('catalog_categories').select('id,name').eq('business_id', businessId),
      supabase.from('catalog_subcategories').select('id,name,category_id').eq('business_id', businessId),
      supabase.from('catalog_brands').select('id,name').eq('business_id', businessId),
      supabase.from('catalog_units').select('id,name,short_name').eq('business_id', businessId),
    ])
    const cat = new Map((categories ?? []).map(x => [key(x.name), x]))
    const sub = new Map((subcategories ?? []).map(x => [key(x.name), x]))
    const brand = new Map((brands ?? []).map(x => [key(x.name), x]))
    const unit = new Map((units ?? []).flatMap(x => [[key(x.name), x] as const, [key(x.short_name), x] as const]))

    async function ensureCategory(name: string) {
      const k = key(name); if (!k) return null
      const cached = cat.get(k); if (cached) return cached
      const { data, error } = await supabase.from('catalog_categories').insert({ business_id: businessId, name, is_active: true }).select('id,name').single()
      if (!error && data) { cat.set(k, data); return data }
      const { data: existing } = await supabase.from('catalog_categories').select('id,name').eq('business_id', businessId).ilike('name', name).maybeSingle()
      if (existing) { cat.set(k, existing); return existing }
      throw new Error(`Unable to create category: ${name}`)
    }

    async function ensureBrand(name: string) {
      const k = key(name); if (!k) return null
      const cached = brand.get(k); if (cached) return cached
      const { data, error } = await supabase.from('catalog_brands').insert({ business_id: businessId, name, is_active: true }).select('id,name').single()
      if (!error && data) { brand.set(k, data); return data }
      const { data: existing } = await supabase.from('catalog_brands').select('id,name').eq('business_id', businessId).ilike('name', name).maybeSingle()
      if (existing) { brand.set(k, existing); return existing }
      throw new Error(`Unable to create brand: ${name}`)
    }

    async function ensureUnit(name: string) {
      const k = key(name); if (!k) return null
      const cached = unit.get(k); if (cached) return cached
      const { data, error } = await supabase.from('catalog_units').insert({ business_id: businessId, name, short_name: name.slice(0, 12), is_active: true }).select('id,name,short_name').single()
      if (!error && data) { unit.set(k, data); unit.set(key(data.short_name), data); return data }
      const { data: existing } = await supabase.from('catalog_units').select('id,name,short_name').eq('business_id', businessId).or(`name.ilike.${name},short_name.ilike.${name}`).maybeSingle()
      if (existing) { unit.set(k, existing); unit.set(key(existing.short_name), existing); return existing }
      throw new Error(`Unable to create unit: ${name}`)
    }

    async function ensureSubcategory(name: string, category: { id: string; name: string }) {
      const k = key(name); if (!k) return null
      const cached = sub.get(k)
      if (cached) {
        if (cached.category_id !== category.id) throw new Error(`Subcategory "${name}" belongs to another category. Choose the correct category or rename the subcategory.`)
        return cached
      }
      const { data, error } = await supabase.from('catalog_subcategories').insert({ business_id: businessId, category_id: category.id, name, is_active: true }).select('id,name,category_id').single()
      if (!error && data) { sub.set(k, data); return data }
      const { data: existing } = await supabase.from('catalog_subcategories').select('id,name,category_id').eq('business_id', businessId).ilike('name', name).maybeSingle()
      if (existing) {
        if (existing.category_id !== category.id) throw new Error(`Subcategory "${name}" belongs to another category.`)
        sub.set(k, existing); return existing
      }
      throw new Error(`Unable to create subcategory: ${name}`)
    }

    const skus = rows.map(r => text(r.SKU || r.sku)).filter(Boolean)
    const { data: existingProducts } = await supabase.from('products').select('id,sku,current_stock').eq('business_id', businessId).in('sku', skus)
    const existingBySku = new Map((existingProducts ?? []).map(p => [key(p.sku), p]))

    const errors: { row: number; message: string }[] = []
    const payload: Record<string, unknown>[] = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const rowNumber = i + 2
      const sku = text(r.SKU || r.sku)
      const name = text(r['Product Name'] || r.name || r.Name)
      if (!sku || !name) { errors.push({ row: rowNumber, message: 'SKU and Product Name are required' }); continue }
      try {
        const unitName = text(r.Unit || r['Unit Name'])
        const categoryName = text(r.Category)
        const subcategoryName = text(r.Subcategory)
        const brandName = text(r.Brand)
        const unitRow = await ensureUnit(unitName)
        if (!unitRow) throw new Error('Unit is required. Enter a unit such as Pcs, Kg or Box.')
        const categoryRow = await ensureCategory(categoryName)
        const subRow = subcategoryName ? await ensureSubcategory(subcategoryName, categoryRow ?? (() => { throw new Error('A category is required when adding a new subcategory.') })()) : null
        const brandRow = await ensureBrand(brandName)
        const existing = existingBySku.get(key(sku))
        const openingStock = num(r['Opening Stock'] ?? r.opening_stock)
        payload.push({
          business_id: businessId,
          sku,
          barcode: text(r.Barcode || r.barcode) || null,
          name,
          description: text(r.Description || r.description) || null,
          category_id: categoryRow?.id ?? null,
          subcategory_id: subRow?.id ?? null,
          brand_id: brandRow?.id ?? null,
          unit_id: unitRow.id,
          purchase_price: num(r['Purchase Price'] ?? r.purchase_price),
          sale_price: num(r['Sale Price'] ?? r.sale_price),
          opening_stock: openingStock,
          current_stock: existing ? Number(existing.current_stock ?? 0) : openingStock,
          reorder_level: num(r['Reorder Level'] ?? r.reorder_level),
          is_active: text(r.Active || r.active).toLowerCase() !== 'no',
          created_by: user.id,
        })
      } catch (error) {
        errors.push({ row: rowNumber, message: error instanceof Error ? error.message : 'Unable to prepare row' })
      }
    }
    if (errors.length) return NextResponse.json({ error: 'Some Excel values could not be prepared.', errors, validRows: payload.length }, { status: 422 })

    const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'business_id,sku', ignoreDuplicates: false }).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ imported: data?.length ?? payload.length, message: `${data?.length ?? payload.length} products imported or updated successfully. Missing categories, subcategories, brands and units were created automatically. Existing stock was preserved.` })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read Excel file' }, { status: 400 })
  }
}
