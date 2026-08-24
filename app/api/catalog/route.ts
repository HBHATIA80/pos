import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const entitySchema = z.enum(['categories', 'subcategories', 'brands', 'units', 'products'])
const baseSchema = z.object({ name: z.string().trim().min(1).max(180), code: z.string().trim().max(40).optional().or(z.literal('')), description: z.string().trim().max(1000).optional().or(z.literal('')), is_active: z.boolean().optional() })
const productSchema = z.object({ sku: z.string().trim().min(1).max(80), barcode: z.string().trim().max(80).optional().or(z.literal('')), name: z.string().trim().min(1).max(180), description: z.string().trim().max(1000).optional().or(z.literal('')), category_id: z.string().uuid().nullable().optional(), subcategory_id: z.string().uuid().nullable().optional(), brand_id: z.string().uuid().nullable().optional(), unit_id: z.string().uuid(), purchase_price: z.coerce.number().min(0), sale_price: z.coerce.number().min(0), opening_stock: z.coerce.number().min(0), reorder_level: z.coerce.number().min(0), image_url: z.string().url().max(1200).nullable().optional().or(z.literal('')), is_active: z.boolean().optional() })
const unitSchema = z.object({ name: z.string().trim().min(1).max(60), short_name: z.string().trim().min(1).max(20), decimal_places: z.coerce.number().int().min(0).max(6), is_active: z.boolean().optional() })

function cleanOptional(value?: string | null) { return value?.trim() || null }
async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

export async function GET(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const entity = entitySchema.safeParse(url.searchParams.get('entity') ?? 'products')
  if (!entity.success) return NextResponse.json({ error: 'Invalid catalog entity' }, { status: 400 })
  const businessId = profile.business_id
  if (entity.data === 'products') {
    const q = (url.searchParams.get('q') || '').trim()
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 100)
    const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0)
    const categoryId = url.searchParams.get('category_id')
    const brandId = url.searchParams.get('brand_id')
    let query = supabase.from('products').select('id,sku,barcode,name,description,category_id,subcategory_id,brand_id,unit_id,purchase_price,sale_price,opening_stock,current_stock,reorder_level,image_url,is_active,catalog_categories(id,name),catalog_subcategories(id,name),catalog_brands(id,name),catalog_units(id,name,short_name,decimal_places)', { count: 'exact' }).eq('business_id', businessId).order('name').range(offset, offset + limit - 1)
    if (q) { const escaped = q.replace(/[%_]/g, '\\$&'); query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`) }
    if (categoryId) query = query.eq('category_id', categoryId)
    if (brandId) query = query.eq('brand_id', brandId)
    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ products: data ?? [], total: count ?? 0, offset, limit, hasMore: offset + (data?.length ?? 0) < (count ?? 0) })
  }
  const table = entity.data === 'categories' ? 'catalog_categories' : entity.data === 'subcategories' ? 'catalog_subcategories' : entity.data === 'brands' ? 'catalog_brands' : 'catalog_units'
  const { data, error } = await supabase.from(table).select('*').eq('business_id', businessId).order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ [entity.data]: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const entity = entitySchema.safeParse(body?.entity)
  if (!entity.success) return NextResponse.json({ error: 'Invalid catalog entity' }, { status: 400 })
  const payload = body?.data
  let row: Record<string, unknown>
  if (entity.data === 'products') {
    const parsed = productSchema.safeParse(payload)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product' }, { status: 400 })
    row = { business_id: profile.business_id, sku: parsed.data.sku, barcode: cleanOptional(parsed.data.barcode), name: parsed.data.name, description: cleanOptional(parsed.data.description), category_id: parsed.data.category_id ?? null, subcategory_id: parsed.data.subcategory_id ?? null, brand_id: parsed.data.brand_id ?? null, unit_id: parsed.data.unit_id, purchase_price: parsed.data.purchase_price, sale_price: parsed.data.sale_price, opening_stock: parsed.data.opening_stock, current_stock: parsed.data.opening_stock, reorder_level: parsed.data.reorder_level, image_url: cleanOptional(parsed.data.image_url), is_active: parsed.data.is_active ?? true, created_by: user.id }
  } else if (entity.data === 'units') {
    const parsed = unitSchema.safeParse(payload)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid unit' }, { status: 400 })
    row = { ...parsed.data, business_id: profile.business_id, created_by: user.id }
  } else {
    const parsed = baseSchema.safeParse(payload)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid master' }, { status: 400 })
    row = { business_id: profile.business_id, name: parsed.data.name, code: cleanOptional(parsed.data.code), description: cleanOptional(parsed.data.description), is_active: parsed.data.is_active ?? true, created_by: user.id, ...(entity.data === 'subcategories' ? { category_id: body?.data?.category_id } : {}) }
    if (entity.data === 'subcategories' && !z.string().uuid().safeParse(row.category_id).success) return NextResponse.json({ error: 'Category is required for a subcategory' }, { status: 400 })
  }
  const table = entity.data === 'products' ? 'products' : entity.data === 'categories' ? 'catalog_categories' : entity.data === 'subcategories' ? 'catalog_subcategories' : entity.data === 'brands' ? 'catalog_brands' : 'catalog_units'
  const { data, error } = await supabase.from(table).insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const entity = entitySchema.safeParse(body?.entity)
  const id = z.string().uuid().safeParse(body?.id)
  if (!entity.success || !id.success) return NextResponse.json({ error: 'Invalid catalog update' }, { status: 400 })
  const payload = body?.data ?? {}
  const allowed = entity.data === 'products' ? ['sku','barcode','name','description','category_id','subcategory_id','brand_id','unit_id','purchase_price','sale_price','reorder_level','image_url','is_active'] : entity.data === 'units' ? ['name','short_name','decimal_places','is_active'] : entity.data === 'subcategories' ? ['name','code','description','category_id','is_active'] : ['name','code','description','is_active']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) if (key in payload) updates[key] = payload[key] === '' ? null : payload[key]
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const table = entity.data === 'products' ? 'products' : entity.data === 'categories' ? 'catalog_categories' : entity.data === 'subcategories' ? 'catalog_subcategories' : entity.data === 'brands' ? 'catalog_brands' : 'catalog_units'
  const { data, error } = await supabase.from(table).update(updates).eq('id', id.data).eq('business_id', profile.business_id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ item: data })
}
