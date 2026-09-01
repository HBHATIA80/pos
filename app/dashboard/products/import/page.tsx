'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClipboardEvent } from 'react'
import * as XLSX from 'xlsx'
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Info, ListChecks, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Result = { imported?: number; error?: string; errors?: { row: number; message: string }[] }
type ProductRow = Record<string, string>
type MasterOption = { id: string; name: string; code?: string; shortName?: string; categoryId?: string }
type MasterKind = 'Category' | 'Subcategory' | 'Brand' | 'Unit'

const columns = [
  { key: 'SKU', label: 'SKU *', width: 'w-36' }, { key: 'Barcode', label: 'Barcode', width: 'w-40' },
  { key: 'Product Name', label: 'Product Name *', width: 'w-56' }, { key: 'Description', label: 'Description', width: 'w-64' },
  { key: 'Category', label: 'Category *', width: 'w-44' }, { key: 'Subcategory', label: 'Subcategory', width: 'w-44' },
  { key: 'Brand', label: 'Brand *', width: 'w-40' }, { key: 'Unit', label: 'Unit *', width: 'w-32' },
  { key: 'Purchase Price', label: 'Purchase Price *', width: 'w-40' }, { key: 'Sale Price', label: 'Sale Price *', width: 'w-36' },
  { key: 'Opening Stock', label: 'Opening Stock', width: 'w-36' }, { key: 'Current Stock', label: 'Current Stock', width: 'w-36' },
  { key: 'Reorder Level', label: 'Reorder Level', width: 'w-36' }, { key: 'Active', label: 'Active', width: 'w-28' },
] as const

const emptyRow = (): ProductRow => ({ SKU: '', Barcode: '', 'Product Name': '', Description: '', Category: '', Subcategory: '', Brand: '', Unit: '', 'Purchase Price': '', 'Sale Price': '', 'Opening Stock': '', 'Current Stock': '', 'Reorder Level': '', Active: 'Yes' })

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'

function StatCard({ icon, label, value, tone = 'default' }: { icon: React.ReactNode; label: string; value: string; tone?: 'default' | 'warning' | 'danger' }) {
  const toneClass = tone === 'warning' ? 'bg-amber-50 text-amber-700' : tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
  return <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${toneClass}`}>{icon}</span><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span></div><p className="mt-2 text-xl font-black text-slate-950">{value}</p></div>
}

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
  const validationErrors = useMemo(() => validateRows(), [filledRows])
  const validCount = filledRows.length > 0 && validationErrors.length === 0 ? filledRows.length : 0

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
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load master data.') }
    finally { setMastersLoading(false) }
  }

  useEffect(() => { if (bulkOpen) void loadMasters() }, [bulkOpen])

  function updateCell(rowIndex: number, key: string, value: string) { setRows(current => current.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row)) }
  function updateMasterCell(rowIndex: number, key: string, value: string) { setRows(current => current.map((row, index) => index === rowIndex ? key === 'Category' ? { ...row, Category: value, Subcategory: '' } : { ...row, [key]: value } : row)) }

  function openCreateMaster(kind: MasterKind, rowIndex: number) {
    const row = rows[rowIndex]
    if (kind === 'Subcategory' && !row.Category) { toast.error('Select a category first, then add the subcategory.'); return }
    const categoryId = kind === 'Subcategory' ? masters.categories.find(c => c.name === row.Category)?.id : undefined
    setNewMaster({ kind, rowIndex, categoryId }); setNewMasterName(''); setNewMasterCode(''); setNewUnitShortName(''); setNewUnitDecimals('2')
  }

  async function createMaster() {
    if (!newMaster || !newMasterName.trim()) { toast.error(`${newMaster?.kind ?? 'Master'} name is required.`); return }
    if (newMaster.kind === 'Unit' && !newUnitShortName.trim()) { toast.error('Unit short name is required.'); return }
    setCreatingMaster(true)
    try {
      const entity = newMaster.kind === 'Category' ? 'categories' : newMaster.kind === 'Subcategory' ? 'subcategories' : newMaster.kind === 'Brand' ? 'brands' : 'units'
      const data = newMaster.kind === 'Unit' ? { name: newMasterName.trim(), short_name: newUnitShortName.trim(), decimal_places: Number(newUnitDecimals) || 0, is_active: true } : { name: newMasterName.trim(), code: newMasterCode.trim(), is_active: true, ...(newMaster.kind === 'Subcategory' ? { category_id: newMaster.categoryId } : {}) }
      const response = await fetch('/api/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, data }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || `Unable to create ${newMaster.kind.toLowerCase()}.`)
      const item = body.item
      const option: MasterOption = newMaster.kind === 'Unit' ? { id: item.id, name: item.name, shortName: item.short_name } : { id: item.id, name: item.name, code: item.code ?? '', categoryId: item.category_id ?? newMaster.categoryId }
      setMasters(current => ({
        ...current,
        categories: newMaster.kind === 'Category' ? [...current.categories, option].sort((a, b) => a.name.localeCompare(b.name)) : current.categories,
        subcategories: newMaster.kind === 'Subcategory' ? [...current.subcategories, option].sort((a, b) => a.name.localeCompare(b.name)) : current.subcategories,
        brands: newMaster.kind === 'Brand' ? [...current.brands, option].sort((a, b) => a.name.localeCompare(b.name)) : current.brands,
        units: newMaster.kind === 'Unit' ? [...current.units, option].sort((a, b) => a.name.localeCompare(b.name)) : current.units,
      }))
      updateMasterCell(newMaster.rowIndex, newMaster.kind, item.name); toast.success(`${newMaster.kind} created and selected.`); setNewMaster(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create master data.') }
    finally { setCreatingMaster(false) }
  }

  function addRows(count = 5) { setRows(current => [...current, ...Array.from({ length: count }, emptyRow)]) }
  function deleteRow(index: number) { setRows(current => current.length === 1 ? [emptyRow()] : current.filter((_, i) => i !== index)) }
  function clearSheet() { setRows(Array.from({ length: 6 }, emptyRow)); setActiveCell({ row: 0, col: 0 }); setResult(null) }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return
    event.preventDefault()
    const matrix = text.split(/\r?\n/).filter(Boolean).map(line => line.split('\t'))
    setRows(current => {
      const next = current.map(row => ({ ...row }))
      matrix.forEach((pasteRow, rOffset) => pasteRow.forEach((value, cOffset) => { const col = columns[activeCell.col + cOffset]; if (!col) return; const rowIndex = activeCell.row + rOffset; while (!next[rowIndex]) next.push(emptyRow()); next[rowIndex][col.key] = value.trim() }))
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
    if (!filledRows.length) { toast.error('Enter at least one product row.'); return }
    if (validationErrors.length) { setResult({ errors: validationErrors }); toast.error('Please fix the highlighted required fields.'); return }
    const sheet = XLSX.utils.json_to_sheet(filledRows, { header: columns.map(column => column.key) }); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Products'); await postWorkbook(workbook)
  }

  async function upload() {
    if (!file) { toast.error('Choose an Excel file first.'); return }
    setBusy(true); setResult(null)
    try { const form = new FormData(); form.append('file', file); const response = await fetch('/api/catalog/import', { method: 'POST', body: form }); const body = await response.json(); setResult(body); if (!response.ok) toast.error(body.error || 'Import failed'); else toast.success(body.message || 'Products imported') }
    catch { toast.error('Unable to upload the Excel file.') } finally { setBusy(false) }
  }

  function downloadGrid() { const sheet = XLSX.utils.json_to_sheet(filledRows.length ? filledRows : [emptyRow()], { header: columns.map(column => column.key) }); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Products'); XLSX.writeFile(workbook, 'bulk-products.xlsx') }

  function renderMasterSelect(row: ProductRow, rowIndex: number, columnKey: string, options: MasterOption[], placeholder: string) {
    const filteredOptions = columnKey === 'Subcategory' ? options.filter(option => !row.Category || option.categoryId === masters.categories.find(category => category.name === row.Category)?.id) : options
    const kind = columnKey as MasterKind
    return <div className="flex h-11 w-full items-center"><select value={row[columnKey] ?? ''} onFocus={() => setActiveCell({ row: rowIndex, col: columns.findIndex(column => column.key === columnKey) })} onChange={event => event.target.value === '__create_new__' ? openCreateMaster(kind, rowIndex) : updateMasterCell(rowIndex, columnKey, event.target.value)} className="h-11 w-full border-0 bg-transparent px-3 text-sm font-semibold text-slate-800 outline-none focus:bg-emerald-50"><option value="">{mastersLoading ? 'Loading…' : placeholder}</option>{filteredOptions.map(option => <option key={option.id} value={option.name}>{columnKey === 'Unit' && option.shortName ? `${option.name} (${option.shortName})` : option.name}</option>)}<option value="__create_new__">＋ Add new {columnKey.toLowerCase()}…</option></select></div>
  }

  return <div className="mx-auto max-w-6xl space-y-6 pb-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><a href="/dashboard/products" className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"><ArrowLeft className="h-5 w-5" /></a><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Catalogue control centre</p><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Bulk tools</span></div><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Import & update products</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Add or update large product lists safely without entering every SKU one by one.</p></div></div>
      <button type="button" onClick={() => void loadMasters(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"><RefreshCw className={`h-4 w-4 ${mastersLoading ? 'animate-spin' : ''}`} />Refresh master data</button>
    </header>

    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#0f513f] via-[#13785c] to-[#1aa37d] p-6 text-white shadow-[0_18px_50px_rgba(15,81,63,.18)] sm:p-8">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-50"><FileSpreadsheet className="h-4 w-4" />Excel-style catalogue tools</div><h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Bring your catalogue in cleanly.</h2><p className="mt-2 text-sm leading-6 text-emerald-50/90 sm:text-base">Use the shop template for reliable imports, or open the bulk grid when you want to paste rows directly from Excel.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => setBulkOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"><Plus className="h-4 w-4" />Open bulk entry</button><a href="/api/catalog/import/template" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15"><Download className="h-4 w-4" />Download shop template</a></div></div><div className="grid w-full max-w-sm grid-cols-3 gap-3">{[['01','Prepare','Template or Excel file'],['02','Validate','Required fields checked'],['03','Import','Products added together']].map(([number,title,text]) => <div key={number} className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm"><div className="text-[11px] font-black tracking-widest text-emerald-100">{number}</div><div className="mt-2 text-sm font-black">{title}</div><div className="mt-1 text-[11px] leading-4 text-emerald-50/75">{text}</div></div>)}</div></div>
    </section>

    <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ListChecks className="h-5 w-5" /></div><h3 className="mt-4 font-black text-slate-950">Use existing master data</h3><p className="mt-1 text-sm leading-5 text-slate-500">Categories, brands, units and subcategories stay aligned with your live catalogue.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><CheckCircle2 className="h-5 w-5" /></div><h3 className="mt-4 font-black text-slate-950">Validate before saving</h3><p className="mt-1 text-sm leading-5 text-slate-500">Required fields and numeric prices are checked before the import request is sent.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Info className="h-5 w-5" /></div><h3 className="mt-4 font-black text-slate-950">Large catalog friendly</h3><p className="mt-1 text-sm leading-5 text-slate-500">Paste from Excel, work horizontally, and keep the grid inside its own scroll area.</p></div></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Recommended for existing files</p><h2 className="mt-1 text-xl font-black text-slate-950">Upload an Excel catalogue</h2><p className="mt-1 text-sm text-slate-500">Use the shop template or a workbook with the same Products columns.</p></div><a href="/api/catalog/import/template" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"><Download className="h-4 w-4" />Get template</a></div><div role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') input.current?.click() }} className="mt-5 cursor-pointer rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50 sm:p-8"><input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => setFile(event.target.files?.[0] ?? null)} /><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm"><Upload className="h-6 w-6" /></div><h3 className="mt-4 text-base font-black text-slate-950">{file ? file.name : 'Choose an Excel file'}</h3><p className="mt-1 text-sm text-slate-500">Drop a workbook here or click to browse • XLSX, XLS or CSV</p>{file && <p className="mt-2 text-xs font-bold text-emerald-700">Ready to import</p>}</div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-slate-500">Imports are processed through the same catalogue validation used by bulk entry.</div><div className="flex gap-2">{file && <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = '' }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" />Clear</button>}<button type="button" disabled={!file || busy} onClick={() => void upload()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? 'Importing…' : 'Import products'}</button></div></div></section>

    {result && <section className={`rounded-2xl border p-5 ${result.errors?.length || result.error ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex items-start gap-3"><CheckCircle2 className={`mt-0.5 h-5 w-5 ${result.errors?.length || result.error ? 'text-red-600' : 'text-emerald-700'}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-slate-950">{result.error || (result.errors?.length ? 'Import needs attention' : 'Import complete')}</h3>{typeof result.imported === 'number' && <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">{result.imported} imported</span>}</div>{!!result.errors?.length && <div className="mt-3 max-h-40 overflow-auto rounded-xl bg-white p-3 text-sm text-red-700">{result.errors.map((item,index) => <div key={`${item.row}-${index}`} className="border-b border-red-100 py-1.5 last:border-0"><b>Row {item.row}:</b> {item.message}</div>)}</div>}</div></div></section>}

    {bulkOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) setBulkOpen(false) }}><section className="flex max-h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"><div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Bulk product entry</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{filledRows.length} filled rows</span>{filledRows.length > 0 && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${validCount ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{validCount ? 'Ready to import' : 'Review required fields'}</span>}</div><h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">Add products in a spreadsheet-style grid</h2><p className="mt-1 text-sm text-slate-500">Paste directly from Excel. Use the final column to control whether each product is active.</p></div><button type="button" onClick={() => setBulkOpen(false)} className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 sm:static"><X className="h-5 w-5" /></button></div><div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5"><button type="button" onClick={() => addRows()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white hover:bg-emerald-800"><Plus className="h-4 w-4" />Add 5 rows</button><button type="button" onClick={downloadGrid} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-emerald-50"><Download className="h-4 w-4" />Export grid</button><button type="button" onClick={clearSheet} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" />Clear</button><div className="ml-auto hidden items-center gap-2 text-xs text-slate-500 sm:flex"><Info className="h-4 w-4" />Required fields are marked *</div></div><div className="min-h-0 flex-1 overflow-auto" onPaste={handlePaste}><table className="min-w-[2100px] border-collapse"><thead className="sticky top-0 z-10 bg-slate-900 text-left text-[11px] font-black uppercase tracking-wide text-white"><tr><th className="w-12 border-r border-slate-700 px-3 py-3 text-center">#</th>{columns.map(column => <th key={column.key} className={`${column.width} border-r border-slate-700 px-3 py-3`}>{column.label}</th>)}<th className="w-16 px-3 py-3">&nbsp;</th></tr></thead><tbody>{rows.map((row,rowIndex) => { const rowErrors = filledRows[rowIndex] ? validationErrors.filter(error => error.row === rowIndex + 2) : []; return <tr key={rowIndex} className="border-b border-slate-100 hover:bg-emerald-50/40"><td className="border-r border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-400">{rowIndex + 1}</td>{columns.map((column,colIndex) => { const isRequired = ['SKU','Product Name','Category','Brand','Unit','Purchase Price','Sale Price'].includes(column.key); const hasError = rowErrors.some(error => error.message.toLowerCase().startsWith(column.key.toLowerCase())); return <td key={column.key} className={`border-r border-slate-100 p-1.5 ${hasError ? 'bg-red-50' : ''}`}>{['Category','Subcategory','Brand','Unit'].includes(column.key) ? renderMasterSelect(row,rowIndex,column.key,column.key === 'Category' ? masters.categories : column.key === 'Subcategory' ? masters.subcategories : column.key === 'Brand' ? masters.brands : masters.units,`Select ${column.key.toLowerCase()}`) : column.key === 'Active' ? <select value={row.Active || 'Yes'} onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })} onChange={event => updateCell(rowIndex,'Active',event.target.value)} className="h-11 w-full rounded-xl border-0 bg-transparent px-3 text-sm font-semibold outline-none focus:bg-emerald-50"><option>Yes</option><option>No</option></select> : <input value={row[column.key] ?? ''} onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })} onChange={event => updateCell(rowIndex,column.key,event.target.value)} placeholder={isRequired ? 'Required' : 'Optional'} inputMode={['Purchase Price','Sale Price','Opening Stock','Current Stock','Reorder Level'].includes(column.key) ? 'decimal' : 'text'} className={`h-11 w-full rounded-xl border px-3 text-sm font-semibold text-slate-800 outline-none transition ${hasError ? 'border-red-300 bg-white focus:ring-4 focus:ring-red-500/10' : 'border-transparent bg-transparent focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'}`} />}</td>})}<td className="p-1.5 text-center"><button type="button" onClick={() => deleteRow(rowIndex)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete row"><Trash2 className="h-4 w-4" /></button></td></tr>})}</tbody></table></div><div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="text-xs text-slate-500"><b className="text-slate-700">Tip:</b> click any cell, then paste a block from Excel. The grid expands automatically when needed.</div><div className="flex gap-2"><button type="button" onClick={() => setBulkOpen(false)} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={busy || !filledRows.length} onClick={() => void importGrid()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{busy ? 'Importing…' : `Validate & import ${filledRows.length || ''}`}</button></div></div></section></div>}

    {newMaster && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Master data</p><h2 className="mt-1 text-xl font-black text-slate-950">Add {newMaster.kind.toLowerCase()}</h2></div><button type="button" onClick={() => setNewMaster(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Name *</span><input autoFocus value={newMasterName} onChange={event => setNewMasterName(event.target.value)} className={inputClass} placeholder={`e.g. ${newMaster.kind === 'Category' ? 'Accessories' : newMaster.kind === 'Brand' ? 'Samsung' : newMaster.kind === 'Unit' ? 'Piece' : 'Phone Cases'}`} /></label>{newMaster.kind !== 'Unit' && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Code</span><input value={newMasterCode} onChange={event => setNewMasterCode(event.target.value)} className={inputClass} placeholder="Optional code" /></label>}{newMaster.kind === 'Unit' && <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Short name *</span><input value={newUnitShortName} onChange={event => setNewUnitShortName(event.target.value)} className={inputClass} placeholder="pcs" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Decimals</span><input value={newUnitDecimals} onChange={event => setNewUnitDecimals(event.target.value)} className={inputClass} inputMode="numeric" /></label></div>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setNewMaster(null)} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={creatingMaster} onClick={() => void createMaster()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50">{creatingMaster && <RefreshCw className="h-4 w-4 animate-spin" />}Create & select</button></div></div></section></div>}
  </div>
}
