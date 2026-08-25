'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, ListChecks, Plus, Trash2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Result = { imported?: number; error?: string; errors?: { row: number; message: string }[] }
type ProductRow = Record<string, string>
type MasterOption = { id: string; name: string; code?: string; shortName?: string; categoryId?: string }
type MasterKind = 'Category' | 'Subcategory' | 'Brand' | 'Unit'

const columns = [
  { key: 'SKU', label: 'SKU *', width: 'w-36' }, { key: 'Barcode', label: 'Barcode', width: 'w-40' },
  { key: 'Product Name', label: 'Product Name *', width: 'w-52' }, { key: 'Description', label: 'Description', width: 'w-60' },
  { key: 'Category', label: 'Category *', width: 'w-44' }, { key: 'Subcategory', label: 'Subcategory', width: 'w-44' },
  { key: 'Brand', label: 'Brand *', width: 'w-40' }, { key: 'Unit', label: 'Unit *', width: 'w-32' },
  { key: 'Purchase Price', label: 'Purchase Price *', width: 'w-40' }, { key: 'Sale Price', label: 'Sale Price *', width: 'w-36' },
  { key: 'Opening Stock', label: 'Opening Stock', width: 'w-36' }, { key: 'Current Stock', label: 'Current Stock', width: 'w-36' },
  { key: 'Reorder Level', label: 'Reorder Level', width: 'w-36' }, { key: 'Active', label: 'Active', width: 'w-28' },
] as const

const emptyRow = (): ProductRow => ({ SKU: '', Barcode: '', 'Product Name': '', Description: '', Category: '', Subcategory: '', Brand: '', Unit: '', 'Purchase Price': '', 'Sale Price': '', 'Opening Stock': '', 'Current Stock': '', 'Reorder Level': '', Active: 'Yes' })

export default function ProductImportPage() {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [rows, setRows] = useState<ProductRow[]>(() => Array.from({ length: 6 }, emptyRow))
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 })
  const [masters, setMasters] = useState({ categories: [] as MasterOption[], subcategories: [] as MasterOption[], brands: [] as MasterOption[], units: [] as MasterOption[] })
  const [mastersLoading, setMastersLoading] = useState(false)
  const [newMaster, setNewMaster] = useState<{ kind: MasterKind; rowIndex: number; categoryId?: string } | null>(null)
  const [newMasterName, setNewMasterName] = useState('')
  const [newMasterCode, setNewMasterCode] = useState('')
  const [newUnitShortName, setNewUnitShortName] = useState('')
  const [newUnitDecimals, setNewUnitDecimals] = useState('2')
  const [creatingMaster, setCreatingMaster] = useState(false)

  const filledRows = useMemo(() => rows.filter(row => Object.values(row).some(value => value.trim())), [rows])

  async function loadMasters(force = false) {
    if (!force && (masters.categories.length || mastersLoading)) return
    setMastersLoading(true)
    try {
      const response = await fetch('/api/catalog/import/template', { cache: 'no-store' })
      if (!response.ok) throw new Error('Unable to load your shop master lists.')
      const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' })
      const read = (sheetName: string) => XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName] ?? {}, { defval: '' })
      const categories = read('Categories').filter(r => String(r.Active).toLowerCase() === 'yes').map(r => ({ id: String(r['Category ID']), name: String(r.Category), code: String(r.Code) }))
      const subcategories = read('Subcategories').filter(r => String(r.Active).toLowerCase() === 'yes').map(r => ({ id: String(r['Subcategory ID']), name: String(r.Subcategory), categoryId: String(r['Category ID']) }))
      const brands = read('Brands').filter(r => String(r.Active).toLowerCase() === 'yes').map(r => ({ id: String(r['Brand ID']), name: String(r.Brand), code: String(r.Code) }))
      const units = read('Units').filter(r => String(r.Active).toLowerCase() === 'yes').map(r => ({ id: String(r['Unit ID']), name: String(r.Unit), shortName: String(r['Short Name']) }))
      setMasters({ categories, subcategories, brands, units })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load your shop master lists.') } finally { setMastersLoading(false) }
  }

  useEffect(() => { if (bulkOpen) void loadMasters() }, [bulkOpen])

  function updateCell(rowIndex: number, key: string, value: string) {
    setRows(current => current.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row))
  }

  function updateMasterCell(rowIndex: number, key: string, value: string) {
    setRows(current => current.map((row, index) => index === rowIndex ? (key === 'Category' ? { ...row, Category: value, Subcategory: '' } : { ...row, [key]: value }) : row))
  }

  function openCreateMaster(kind: MasterKind, rowIndex: number) {
    const row = rows[rowIndex]
    if (kind === 'Subcategory' && !row.Category) { toast.error('Select a category first, then add the subcategory.') ; return }
    const categoryId = kind === 'Subcategory' ? masters.categories.find(c => c.name === row.Category)?.id : undefined
    setNewMaster({ kind, rowIndex, categoryId })
    setNewMasterName(''); setNewMasterCode(''); setNewUnitShortName(''); setNewUnitDecimals('2')
  }

  async function createMaster() {
    if (!newMaster || !newMasterName.trim()) return toast.error(`${newMaster?.kind ?? 'Master'} name is required.`)
    if (newMaster.kind === 'Unit' && !newUnitShortName.trim()) return toast.error('Unit short name is required.')
    setCreatingMaster(true)
    try {
      const entity = newMaster.kind === 'Category' ? 'categories' : newMaster.kind === 'Subcategory' ? 'subcategories' : newMaster.kind === 'Brand' ? 'brands' : 'units'
      const data = newMaster.kind === 'Unit'
        ? { name: newMasterName.trim(), short_name: newUnitShortName.trim(), decimal_places: Number(newUnitDecimals) || 0, is_active: true }
        : { name: newMasterName.trim(), code: newMasterCode.trim(), is_active: true, ...(newMaster.kind === 'Subcategory' ? { category_id: newMaster.categoryId } : {}) }
      const response = await fetch('/api/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, data }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || `Unable to create ${newMaster.kind.toLowerCase()}.`)
      const item = body.item
      const option: MasterOption = newMaster.kind === 'Unit'
        ? { id: item.id, name: item.name, shortName: item.short_name }
        : { id: item.id, name: item.name, code: item.code ?? '', categoryId: item.category_id ?? newMaster.categoryId }
      setMasters(current => ({
        ...current,
        categories: newMaster.kind === 'Category' ? [...current.categories, option].sort((a, b) => a.name.localeCompare(b.name)) : current.categories,
        subcategories: newMaster.kind === 'Subcategory' ? [...current.subcategories, option].sort((a, b) => a.name.localeCompare(b.name)) : current.subcategories,
        brands: newMaster.kind === 'Brand' ? [...current.brands, option].sort((a, b) => a.name.localeCompare(b.name)) : current.brands,
        units: newMaster.kind === 'Unit' ? [...current.units, option].sort((a, b) => a.name.localeCompare(b.name)) : current.units,
      }))
      updateMasterCell(newMaster.rowIndex, newMaster.kind, item.name)
      toast.success(`${newMaster.kind} created and selected.`)
      setNewMaster(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create master data.') } finally { setCreatingMaster(false) }
  }

  function addRows(count = 5) { setRows(current => [...current, ...Array.from({ length: count }, emptyRow)]) }
  function deleteRow(index: number) { setRows(current => current.length === 1 ? [emptyRow()] : current.filter((_, i) => i !== index)) }
  function clearSheet() { setRows(Array.from({ length: 6 }, emptyRow)); setActiveCell({ row: 0, col: 0 }) }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return
    event.preventDefault()
    const matrix = text.split(/\r?\n/).filter(Boolean).map(line => line.split('\t'))
    setRows(current => {
      const next = current.map(row => ({ ...row }))
      matrix.forEach((pasteRow, rOffset) => pasteRow.forEach((value, cOffset) => { const col = columns[activeCell.col + cOffset]; if (col) { const rowIndex = activeCell.row + rOffset; while (!next[rowIndex]) next.push(emptyRow()); next[rowIndex][col.key] = value.trim() } }))
      return next
    })
  }

  function validateRows() {
    const errors: { row: number; message: string }[] = []
    filledRows.forEach((row, index) => {
      const rowNumber = index + 2
      for (const key of ['SKU', 'Product Name', 'Category', 'Brand', 'Unit']) if (!row[key]?.trim()) errors.push({ row: rowNumber, message: `${key} is required` })
      for (const key of ['Purchase Price', 'Sale Price']) if (row[key] && !Number.isFinite(Number(row[key]))) errors.push({ row: rowNumber, message: `${key} must be a number` })
    })
    return errors
  }

  async function postWorkbook(workbook: XLSX.WorkBook) {
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }); const form = new FormData()
    form.append('file', new File([buffer], 'bulk-products.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); setBusy(true); setResult(null)
    try { const response = await fetch('/api/catalog/import', { method: 'POST', body: form }); const body = await response.json(); setResult(body); if (!response.ok) toast.error(body.error || 'Import failed'); else { toast.success(body.message || 'Products imported'); setBulkOpen(false) } }
    catch { toast.error('Unable to import the products.') } finally { setBusy(false) }
  }

  async function importGrid() {
    if (!filledRows.length) return toast.error('Enter at least one product row.')
    const errors = validateRows(); if (errors.length) { setResult({ errors }); toast.error('Please fix the highlighted required fields.'); return }
    const sheet = XLSX.utils.json_to_sheet(filledRows, { header: columns.map(column => column.key) }); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Products'); await postWorkbook(workbook)
  }

  async function upload() {
    if (!file) return toast.error('Choose an Excel file first.'); setBusy(true); setResult(null)
    try { const form = new FormData(); form.append('file', file); const response = await fetch('/api/catalog/import', { method: 'POST', body: form }); const body = await response.json(); setResult(body); if (!response.ok) toast.error(body.error || 'Import failed'); else toast.success(body.message || 'Products imported') }
    catch { toast.error('Unable to upload the Excel file.') } finally { setBusy(false) }
  }

  function downloadGrid() { const sheet = XLSX.utils.json_to_sheet(filledRows.length ? filledRows : [emptyRow()], { header: columns.map(column => column.key) }); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Products'); XLSX.writeFile(workbook, 'bulk-products.xlsx') }

  function renderMasterSelect(row: ProductRow, rowIndex: number, columnKey: string, options: MasterOption[], placeholder: string) {
    const filteredOptions = columnKey === 'Subcategory' ? options.filter(option => !row.Category || option.categoryId === masters.categories.find(category => category.name === row.Category)?.id) : options
    const kind = columnKey as MasterKind
    return <div className="flex h-10 w-full items-center"><select value={row[columnKey] ?? ''} onFocus={() => setActiveCell({ row: rowIndex, col: columns.findIndex(column => column.key === columnKey) })} onChange={event => event.target.value === '__create_new__' ? openCreateMaster(kind, rowIndex) : updateMasterCell(rowIndex, columnKey, event.target.value)} className="h-10 w-full border-0 bg-transparent px-2 text-xs font-medium outline-none focus:bg-indigo-50"><option value="">{mastersLoading ? 'Loading…' : placeholder}</option>{filteredOptions.map(option => <option key={option.id} value={option.name}>{columnKey === 'Unit' && option.shortName ? `${option.name} (${option.shortName})` : option.name}</option>)}<option value="__create_new__">＋ Add new {columnKey.toLowerCase()}…</option></select></div>
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center gap-3"><a href="/dashboard/products" className="rounded-xl border p-2 hover:bg-slate-50"><ArrowLeft className="h-5 w-5" /></a><div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">BIZBook Catalog</p><h1 className="text-3xl font-black">Import & Update Products</h1><p className="text-sm text-slate-500">Bulk update your shop catalog without manually re-entering existing products.</p></div></div>
    <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><div className="rounded-2xl bg-white/15 p-3"><FileSpreadsheet className="h-7 w-7" /></div><div><h2 className="text-xl font-black">Bulk add products in an Excel-style window</h2><p className="mt-1 max-w-2xl text-sm text-indigo-100">Enter many products in one grid, paste rows directly from Excel, then validate and add them together.</p></div></div><button type="button" onClick={() => setBulkOpen(true)} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-indigo-700 shadow-sm"><Plus className="h-4 w-4" /> Open Bulk Product Entry</button></div><a href="/api/catalog/import/template" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold text-white hover:bg-white/20"><Download className="h-4 w-4" /> Download Shop Template</a></section>
    <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ListChecks className="h-6 w-6 text-indigo-600" /><h3 className="mt-3 font-black">Existing master data</h3><p className="mt-1 text-sm leading-6 text-slate-500">Category, subcategory, brand and unit fields use your live shop lists.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ListChecks className="h-6 w-6 text-emerald-600" /><h3 className="mt-3 font-black">Create while entering</h3><p className="mt-1 text-sm leading-6 text-slate-500">If something is missing, choose “Add new” directly in that cell. The new master is saved and immediately selected.</p></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-black">Upload an existing Excel file</h2><p className="mt-1 text-sm text-slate-500">You can still upload the shop template or any workbook using the same Products columns.</p><div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center"><input ref={input} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} /><button type="button" onClick={() => input.current?.click()} className="mx-auto flex min-h-12 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white"><Upload className="h-4 w-4" /> Choose Excel file</button><p className="mt-3 text-sm font-semibold text-slate-600">{file ? file.name : 'XLSX or XLS · maximum 10 MB'}</p></div><button type="button" disabled={!file || busy} onClick={() => void upload()} className="mt-5 min-h-12 w-full rounded-xl bg-indigo-600 px-5 text-sm font-black text-white disabled:opacity-50">{busy ? 'Validating & importing…' : 'Upload & Update Products'}</button></section>
    {result?.imported !== undefined && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="h-6 w-6" /><div><div className="font-black">{result.imported.toLocaleString('en-IN')} products imported or updated</div><div className="text-sm">Existing stock was preserved. The catalog is ready for live use.</div></div></div>}
    {result?.errors?.length ? <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><h3 className="font-black text-rose-800">Validation errors</h3><div className="mt-3 max-h-72 space-y-2 overflow-auto text-sm text-rose-700">{result.errors.map(error => <div key={`${error.row}-${error.message}`}><b>Row {error.row}:</b> {error.message}</div>)}</div></section> : null}

    {bulkOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" onMouseDown={event => { if (event.target === event.currentTarget && !newMaster) setBulkOpen(false) }}><div className="flex h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-indigo-600" /><h2 className="text-xl font-black">Bulk Product Entry</h2></div><p className="mt-1 text-xs text-slate-500">Excel-style grid · paste from Excel · fields marked * are required · up to 5,000 products</p></div><button type="button" onClick={() => setBulkOpen(false)} className="rounded-xl border border-slate-300 p-2"><X className="h-5 w-5" /></button></div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3"><button type="button" onClick={() => addRows()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-black text-white"><Plus className="h-4 w-4" /> Add 5 Rows</button><button type="button" onClick={downloadGrid} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-black text-slate-700"><Download className="h-4 w-4" /> Download Filled Excel</button><button type="button" onClick={clearSheet} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-black text-slate-700">Clear All</button><span className="ml-auto text-xs font-bold text-slate-500">{filledRows.length} product{filledRows.length === 1 ? '' : 's'} ready</span></div>
      <div className="min-h-0 flex-1 overflow-auto" onPaste={handlePaste}><table className="min-w-[2100px] border-collapse text-xs"><thead className="sticky top-0 z-10 bg-slate-100"><tr><th className="sticky left-0 z-20 w-12 border border-slate-200 bg-slate-100 px-2 py-2 text-center">#</th>{columns.map(column => <th key={column.key} className={`${column.width} border border-slate-200 px-2 py-2 text-left font-black text-slate-700`}>{column.label}</th>)}<th className="sticky right-0 z-20 w-14 border border-slate-200 bg-slate-100" /></tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-indigo-50/30"><td className="sticky left-0 z-10 border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-400">{rowIndex + 1}</td>{columns.map((column, colIndex) => { const required = ['SKU', 'Product Name', 'Category', 'Brand', 'Unit'].includes(column.key); const invalid = required && filledRows.includes(row) && !row[column.key]?.trim(); const masterConfig = column.key === 'Category' ? ['Category', masters.categories, 'Select category'] as const : column.key === 'Subcategory' ? ['Subcategory', masters.subcategories, 'Select subcategory'] as const : column.key === 'Brand' ? ['Brand', masters.brands, 'Select brand'] as const : column.key === 'Unit' ? ['Unit', masters.units, 'Select unit'] as const : null; return <td key={column.key} className={`border border-slate-200 p-0 ${invalid ? 'bg-rose-50' : 'bg-white'}`}>{masterConfig ? renderMasterSelect(row, rowIndex, masterConfig[0], masterConfig[1], masterConfig[2]) : <input value={row[column.key] ?? ''} onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })} onChange={event => updateCell(rowIndex, column.key, event.target.value)} className={`h-10 w-full border-0 bg-transparent px-2 outline-none focus:bg-indigo-50 ${invalid ? 'ring-1 ring-inset ring-rose-300' : ''}`} placeholder={column.key === 'Active' ? 'Yes' : ''} />}</td> })}<td className="sticky right-0 border border-slate-200 bg-white p-1"><button type="button" onClick={() => deleteRow(rowIndex)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label={`Delete row ${rowIndex + 1}`}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Tip: use the dropdowns for existing master data. Each dropdown also has <b>＋ Add new…</b> so missing category, subcategory, brand or unit can be created without leaving this window.</p><div className="flex items-center gap-2 sm:shrink-0"><button type="button" onClick={() => setBulkOpen(false)} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700">Cancel</button><button type="button" disabled={busy} onClick={() => void importGrid()} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white disabled:opacity-50">{busy ? 'Validating & adding…' : `Add ${filledRows.length} Product${filledRows.length === 1 ? '' : 's'}`}</button></div></div>
    </div></div>}

    {newMaster && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="text-lg font-black">Add new {newMaster.kind.toLowerCase()}</h3><p className="mt-1 text-xs text-slate-500">Create it here and it will be selected in the current product row.</p></div><button type="button" onClick={() => setNewMaster(null)} className="rounded-lg border p-2"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-bold text-slate-700">Name<input autoFocus value={newMasterName} onChange={e => setNewMasterName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void createMaster() }} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-indigo-500" placeholder={`Enter ${newMaster.kind.toLowerCase()} name`} /></label>{newMaster.kind === 'Subcategory' && <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Category: {rows[newMaster.rowIndex]?.Category}</div>}{(newMaster.kind === 'Category' || newMaster.kind === 'Brand') && <label className="block text-sm font-bold text-slate-700">Code <span className="font-normal text-slate-400">(optional)</span><input value={newMasterCode} onChange={e => setNewMasterCode(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-indigo-500" /></label>}{newMaster.kind === 'Unit' && <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold text-slate-700">Short name<input value={newUnitShortName} onChange={e => setNewUnitShortName(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="e.g. kg" /></label><label className="text-sm font-bold text-slate-700">Decimal places<input type="number" min="0" max="6" value={newUnitDecimals} onChange={e => setNewUnitDecimals(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3" /></label></div>}</div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setNewMaster(null)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold">Cancel</button><button type="button" disabled={creatingMaster} onClick={() => void createMaster()} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white disabled:opacity-50">{creatingMaster ? 'Creating…' : 'Create & Select'}</button></div></div></div>}
  </div>
}
