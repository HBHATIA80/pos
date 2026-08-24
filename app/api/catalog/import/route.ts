import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 10 * 1024 * 1024
const text = (v: unknown) => String(v ?? '').trim()
const num = (v: unknown, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback }

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
    const cat = new Map((categories ?? []).map(x => [x.name.toLowerCase(), x]))
    const sub = new Map((subcategories ?? []).map(x => [x.name.toLowerCase(), x]))
    const brand = new Map((brands ?? []).map(x => [x.name.toLowerCase(), x]))
    const unit = new Map((units ?? []).flatMap(x => [[x.name.toLowerCase(), x] as const, [x.short_name.toLowerCase(), x] as const]))

    const skus = rows.map(r => text(r.SKU || r.sku)).filter(Boolean)
    const { data: existingProducts } = await supabase.from('products').select('id,sku,current_stock').eq('business_id', businessId).in('sku', skus)
    const existingBySku = new Map((existingProducts ?? []).map(p => [p.sku.toLowerCase(), p]))

    const errors: { row: number; message: string }[] = []
    const payload: Record<string, unknown>[] = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const sku = text(r.SKU || r.sku)
      const name = text(r['Product Name'] || r.name || r.Name)
      const unitRow = unit.get(text(r.Unit || r['Unit Name']).toLowerCase())
      const categoryRow = cat.get(text(r.Category).toLowerCase())
      const subRow = sub.get(text(r.Subcategory).toLowerCase())
      const brandRow = brand.get(text(r.Brand).toLowerCase())
      if (!sku || !name) { errors.push({ row: i + 2, message: 'SKU and Product Name are required' }); continue }
      if (!unitRow) { errors.push({ row: i + 2, message: `Unit not found: ${text(r.Unit)}. Use a Unit from the Units sheet.` }); continue }
      if (text(r.Category) && !categoryRow) { errors.push({ row: i + 2, message: `Category not found: ${text(r.Category)}. Use a Category from the Categories sheet.` }); continue }
      if (text(r.Subcategory) && !subRow) { errors.push({ row: i + 2, message: `Subcategory not found: ${text(r.Subcategory)}. Use a Subcategory from the Subcategories sheet.` }); continue }
      if (subRow && categoryRow && subRow.category_id !== categoryRow.id) { errors.push({ row: i + 2, message: 'Subcategory does not belong to the selected category' }); continue }
      if (text(r.Brand) && !brandRow) { errors.push({ row: i + 2, message: `Brand not found: ${text(r.Brand)}. Use a Brand from the Brands sheet.` }); continue }

      const existing = existingBySku.get(sku.toLowerCase())
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
        // Existing stock is operational inventory and must not be reset by a bulk product update.
        current_stock: existing ? Number(existing.current_stock ?? 0) : openingStock,
        reorder_level: num(r['Reorder Level'] ?? r.reorder_level),
        is_active: text(r.Active || r.active).toLowerCase() !== 'no',
        created_by: user.id,
      })
    }
    if (errors.length) return NextResponse.json({ error: 'Fix the Excel validation errors before importing.', errors, validRows: payload.length }, { status: 422 })

    const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'business_id,sku', ignoreDuplicates: false }).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ imported: data?.length ?? payload.length, message: `${data?.length ?? payload.length} products imported or updated successfully. Current stock was preserved for existing SKUs.` })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read Excel file' }, { status: 400 })
  }
}
