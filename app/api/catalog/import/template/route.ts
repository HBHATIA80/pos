import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const rows = [{ SKU: 'SKU-001', Barcode: '890000000001', 'Product Name': 'Sample Product', Description: 'Optional description', Category: 'Grocery', Subcategory: 'Snacks', Brand: 'Sample Brand', Unit: 'PCS', 'Purchase Price': 10, 'Sale Price': 15, 'Opening Stock': 100, 'Reorder Level': 10, Active: 'Yes' }]
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(rows)
  sheet['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 28 }, { wch: 34 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products')
  const categories = XLSX.utils.aoa_to_sheet([['Category'], ['Use the exact category name already created in BIZBook']])
  XLSX.utils.book_append_sheet(workbook, categories, 'Instructions')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="BIZBook_Product_Import_Template.xlsx"' } })
}
