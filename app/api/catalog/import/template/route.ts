import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

const workbookHeaders = ['SKU', 'Barcode', 'Product Name', 'Description', 'Category', 'Subcategory', 'Brand', 'Unit', 'Purchase Price', 'Sale Price', 'Opening Stock', 'Current Stock', 'Reorder Level', 'Active']
type ProductRow = {
  sku: string; barcode: string | null; name: string; description: string | null; purchase_price: number; sale_price: number; opening_stock: number; current_stock: number; reorder_level: number; is_active: boolean
  catalog_categories: { name: string } | null
  catalog_subcategories: { name: string } | null
  catalog_brands: { name: string } | null
  catalog_units: { name: string; short_name: string } | null
}
type SubcategoryRow = { id: string; name: string; code: string | null; category_id: string; is_active: boolean; catalog_categories: { name: string } | null }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only active admin/staff can download the product template' }, { status: 403 })
  }

  const businessId = profile.business_id
  const [{ data: rawProducts }, { data: categories }, { data: rawSubcategories }, { data: brands }, { data: units }] = await Promise.all([
    supabase.from('products').select('sku,barcode,name,description,purchase_price,sale_price,opening_stock,current_stock,reorder_level,is_active,catalog_categories(name),catalog_subcategories(name),catalog_brands(name),catalog_units(name,short_name)').eq('business_id', businessId).order('name'),
    supabase.from('catalog_categories').select('id,name,code,is_active').eq('business_id', businessId).order('name'),
    supabase.from('catalog_subcategories').select('id,name,code,category_id,is_active,catalog_categories(name)').eq('business_id', businessId).order('name'),
    supabase.from('catalog_brands').select('id,name,code,is_active').eq('business_id', businessId).order('name'),
    supabase.from('catalog_units').select('id,name,short_name,decimal_places,is_active').eq('business_id', businessId).order('name'),
  ])
  const products = (rawProducts ?? []) as unknown as ProductRow[]
  const subcategories = (rawSubcategories ?? []) as unknown as SubcategoryRow[]

  const productRows = products.map(p => ({
    SKU: p.sku,
    Barcode: p.barcode ?? '',
    'Product Name': p.name,
    Description: p.description ?? '',
    Category: p.catalog_categories?.name ?? '',
    Subcategory: p.catalog_subcategories?.name ?? '',
    Brand: p.catalog_brands?.name ?? '',
    Unit: p.catalog_units?.short_name || p.catalog_units?.name || '',
    'Purchase Price': Number(p.purchase_price ?? 0),
    'Sale Price': Number(p.sale_price ?? 0),
    'Opening Stock': Number(p.opening_stock ?? 0),
    'Current Stock': Number(p.current_stock ?? 0),
    'Reorder Level': Number(p.reorder_level ?? 0),
    Active: p.is_active ? 'Yes' : 'No',
  }))

  const workbook = XLSX.utils.book_new()
  const productSheet = XLSX.utils.aoa_to_sheet([workbookHeaders, ...productRows.map(row => workbookHeaders.map(header => row[header as keyof typeof row]))])
  productSheet['!cols'] = [16, 18, 28, 34, 22, 24, 22, 14, 16, 14, 16, 16, 16, 10].map(wch => ({ wch }))
  productSheet['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(workbook, productSheet, 'Products')

  const categorySheet = XLSX.utils.aoa_to_sheet([
    ['Category ID', 'Category', 'Code', 'Active'],
    ...(categories ?? []).map(c => [c.id, c.name, c.code ?? '', c.is_active ? 'Yes' : 'No']),
  ])
  categorySheet['!cols'] = [{ wch: 38 }, { wch: 28 }, { wch: 18 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories')

  const subcategorySheet = XLSX.utils.aoa_to_sheet([
    ['Subcategory ID', 'Subcategory', 'Category', 'Category ID', 'Code', 'Active'],
    ...subcategories.map(s => [s.id, s.name, s.catalog_categories?.name ?? '', s.category_id, s.code ?? '', s.is_active ? 'Yes' : 'No']),
  ])
  subcategorySheet['!cols'] = [{ wch: 38 }, { wch: 28 }, { wch: 28 }, { wch: 38 }, { wch: 18 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, subcategorySheet, 'Subcategories')

  const brandSheet = XLSX.utils.aoa_to_sheet([
    ['Brand ID', 'Brand', 'Code', 'Active'],
    ...(brands ?? []).map(b => [b.id, b.name, b.code ?? '', b.is_active ? 'Yes' : 'No']),
  ])
  brandSheet['!cols'] = [{ wch: 38 }, { wch: 28 }, { wch: 18 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, brandSheet, 'Brands')

  const unitSheet = XLSX.utils.aoa_to_sheet([
    ['Unit ID', 'Unit', 'Short Name', 'Decimal Places', 'Active'],
    ...(units ?? []).map(u => [u.id, u.name, u.short_name, u.decimal_places, u.is_active ? 'Yes' : 'No']),
  ])
  unitSheet['!cols'] = [{ wch: 38 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, unitSheet, 'Units')

  const instructions = XLSX.utils.aoa_to_sheet([
    ['BIZBook Product Bulk Update Template'],
    ['This workbook is pre-filled with the products and masters already available in your shop.'],
    ['Edit rows on the Products sheet and upload the workbook to update products by SKU.'],
    ['Use the exact Category, Subcategory, Brand and Unit values from the lists on the other sheets.'],
    ['Current Stock is shown for reference and is never overwritten by a bulk update.'],
    ['Opening Stock is used only when a new SKU is created.'],
    ['Do not rename the column headers on the Products sheet.'],
    ['Products in the downloaded file are existing shop products; add a new row at the bottom for a new SKU.'],
  ])
  instructions['!cols'] = [{ wch: 115 }]
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="BIZBook_Product_Bulk_Update_Template.xlsx"',
    },
  })
}
