'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClipboardEvent, ReactNode } from 'react'
import * as XLSX from 'xlsx'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Download, FileSpreadsheet, Info, ListChecks, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Result = { imported?: number; error?: string; errors?: { row: number; message: string }[] }
type ProductRow = Record<string, string>
type MasterOption = { id: string; name: string; code?: string; shortName?: string; categoryId?: string }
type MasterKind = 'Category' | 'Subcategory' | 'Brand' | 'Unit'

const columns = [
  { key: 'SKU', label: 'SKU', width: 'w-44', required: true },
  { key: 'Barcode', label: 'Barcode', width: 'w-44', required: false },
  { key: 'Product Name', label: 'Product name', width: 'w-64', required: true },
  { key: 'Description', label: 'Description', width: 'w-72', required: false },
  { key: 'Category', label: 'Category', width: 'w-48', required: true },
  { key: 'Subcategory', label: 'Subcategory', width: 'w-48', required: false },
  { key: 'Brand', label: 'Brand', width: 'w-44', required: true },
  { key: 'Unit', label: 'Unit', width: 'w-36', required: true },
  { key: 'Purchase Price', label: 'Purchase price', width: 'w-44', required: true },
  { key: 'Sale Price', label: 'Sale price', width: 'w-40', required: true },
  { key: 'Opening Stock', label: 'Opening stock', width: 'w-40', required: false },
  { key: 'Current Stock', label: 'Current stock', width: 'w-40', required: false },
  { key: 'Reorder Level', label: 'Reorder level', width: 'w-40', required: false },
  { key: 'Active', label: 'Status', width: 'w-32', required: false },
] as const

const emptyRow = (): ProductRow => ({
  SKU: '', Barcode: '', 'Product Name': '', Description: '', Category: '', Subcategory: '', Brand: '', Unit: '',
  'Purchase Price': '', 'Sale Price': '', 'Opening Stock': '', 'Current Stock': '', 'Reorder Level': '', Active: 'Yes',
})

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'

function StatCard({ icon, label, value, tone = 'default' }: { icon: ReactNode; label: string; value: string; tone?: 'default' | 'warning' | 'danger' }) {
  const toneClass = tone === 'warning' ? 'bg-amber-50 text-amber-700' : tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
  return <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${toneClass}`}>{icon}</span><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span></div><p className="mt-2 text-xl font-black text-slate-950">{value}</p></div>
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
  const requiredMissing = useMemo(() => {
    const required = ['SKU', 'Product Name', 'Category', 'Brand', 'Unit', 'Purchase Price', 'Sale Price']
    return filledRows.reduce((total, row) => total + required.filter(key => !row[key]?.trim()).length, 0)
  }, [filledRows])

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
      for (const key of ['Purchase Price', 'Sale Price']) if (!row[key]?.trim() || !Number.isFinite(Number(row[key])) || Number(row[key]) < 0) errors.push({ row: rowNumber, message: `${key} must be a valid non-negative number` })
      for (const key of ['Opening Stock', 'Current Stock', 'Reorder Level']) if (row[key] && (!Number.isFinite(Number(row[key])) || Number(row[key]) < 0)) errors.push({ row: rowNumber, message: `${key} must be a valid non-negative number` })
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
    if (validationErrors.length) { setResult({ errors: validationErrors }); toast.error('Please fix the highlighted fields before importing.'); return }
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
    return <div className="relative flex h-10 w-full items-center"><select value={row[columnKey] ?? ''} onFocus={() => setActiveCell({ row: rowIndex, col: columns.findIndex(column => column.key === columnKey) })} onChange={event => event.target.value === '__create_new__' ? openCreateMaster(kind, rowIndex) : updateMasterCell(rowIndex, columnKey, event.target.value)} className="h-10 w-full appearance-none rounded-lg border border-transparent bg-white px-2.5 pr-8 text-sm font-semibold text-slate-800 outline-none transition hover:border-amber-200 focus:border-emerald-400 focus:bg-emerald-50 focus:ring-4 focus:ring-emerald-500/10"><option value="">{mastersLoading ? 'Loading…' : placeholder}</option>{filteredOptions.map(option => <option key={option.id} value={option.name}>{columnKey === 'Unit' && option.shortName ? `${option.name} (${option.shortName})` : option.name}</option>)}<option value="__create_new__">＋ Add new {columnKey.toLowerCase()}…</option></select><ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" /></div>
  }

  return <div className="mx-auto max-w-6xl space-y-6 pb-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><a href="/dashboard/products" className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"><ArrowLeft className="h-5 w-5" /></a><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Catalogue control centre</p><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Bulk tools</span></div><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Import & update products</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Add or update large product lists safely without entering every SKU one by one.</p></div></div>
      <button type="button" onClick={() => void loadMasters(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"><RefreshCw className={`h-4 w-4 ${mastersLoading ? 'animate-spin' : ''}`} />Refresh master data</button>
    </header>

    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#0f513f] via-[#13785c] to-[#1aa37d] p-6 text-white shadow-[0_18px_50px_rgba(15,81,63,.18)] sm:p-8">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-50"><FileSpreadsheet className="h-4 w-4" />Excel-style catalogue tools</div><h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Bring your catalogue in cleanly.</h2><p className="mt-2 text-sm leading-6 text-emerald-50/90 sm:text-base">Use the shop template for reliable imports, or open the bulk grid when you want to paste rows directly from Excel.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => setBulkOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-50"><Plus className="h-4 w-4" />Open bulk entry</button><a href="/api/catalog/import/template" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15"><Download className="h-4 w-4" />Download shop template</a></div></div><div className="grid w-full max-w-sm grid-cols-3 gap-3">{[['01','Prepare','Template or Excel file'],['02','Validate','Required fields checked'],['03','Import','Products added together']].map(([number,title,text]) => <div key={number} className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm"><div className="text-[11px] font-black tracking-widest text-emerald-100">{number}</div><div className="mt-2 text-sm font-black">{title}</div><div className="mt-1 text-[11px] leading-4 text-emerald-50/75">{text}</div></div>)}</div></div>
    </section>

    <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ListChecks className="h-5 w-5" /></div><h3 className="mt-4 font-black text-slate-950">Use existing master data</h3><p className="mt-1 text-sm leading-5 text-slate-500">Categories, brands, units and subcategories stay aligned with your live catalogue.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><CheckCircle2 className="h-5 w-5" /></div><h3 className="mt-4 font-black text-slate-950">Validate before saving</h3><p className="mt-1 text-sm leading-5 text-slate-500">Required fields and numeric prices are checked before the import request is sent.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Info className="h-5 w-5" /></div><h3 className="mt-4 font-black text-slate-950">Large catalog friendly</h3><p className="mt-1 text-sm leading-5 text-slate-500">Paste from Excel, work horizontally, and keep the grid inside its own scroll area.</p></div></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Recommended for existing files</p><h2 className="mt-1 text-xl font-black text-slate-950">Upload an Excel catalogue</h2><p className="mt-1 text-sm text-slate-500">Use the shop template or a workbook with the same Products columns.</p></div><a href="/api/catalog/import/template" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"><Download className="h-4 w-4" />Get template</a></div><div role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') input.current?.click() }} className="mt-5 cursor-pointer rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center transition hover:border-amber-300 hover:bg-amber-50/60 sm:p-8"><input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => setFile(event.target.files?.[0] ?? null)} /><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm"><Upload className="h-6 w-6" /></div><h3 className="mt-4 text-base font-black text-slate-950">{file ? file.name : 'Choose an Excel file'}</h3><p className="mt-1 text-sm text-slate-500">Drop a workbook here or click to browse • XLSX, XLS or CSV</p>{file && <p className="mt-2 text-xs font-bold text-emerald-700">Ready to import</p>}</div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-slate-500">Imports are processed through the same catalogue validation used by bulk entry.</div><div className="flex gap-2">{file && <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = '' }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" />Clear</button>}<button type="button" disabled={!file || busy} onClick={() => void upload()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? 'Importing…' : 'Import products'}</button></div></div></section>

    {result && <section className={`rounded-2xl border p-5 ${result.errors?.length || result.error ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex items-start gap-3"><CheckCircle2 className={`mt-0.5 h-5 w-5 ${result.errors?.length || result.error ? 'text-red-600' : 'text-emerald-700'}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-slate-950">{result.error || (result.errors?.length ? 'Import needs attention' : 'Import complete')}</h3>{typeof result.imported === 'number' && <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">{result.imported} imported</span>}</div>{!!result.errors?.length && <div className="mt-3 max-h-40 overflow-auto rounded-xl bg-white p-3 text-sm text-red-700">{result.errors.map((item,index) => <div key={`${item.row}-${index}`} className="border-b border-red-100 py-1.5 last:border-0"><b>Row {item.row}:</b> {item.message}</div>)}</div>}</div></div></section>}

    {bulkOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-2 backdrop-blur-[3px] sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setBulkOpen(false) }}><section className="flex h-[96vh] w-full max-w-[1540px] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-[#f8faf9] shadow-[0_30px_90px_rgba(15,23,42,.25)]">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-700">Bulk product entry</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Excel-style grid</span></div><h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Add products quickly and accurately</h2><p className="mt-1 text-xs text-slate-500 sm:text-sm">Paste from Excel, choose master data, review issues, then import everything together.</p></div></div><button type="button" disabled={busy} onClick={() => setBulkOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-40" aria-label="Close bulk product entry"><X className="h-5 w-5" /></button></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4"><StatCard icon={<ListChecks className="h-4 w-4" />} label="Rows ready" value={String(filledRows.length)} /><StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Valid rows" value={String(validCount)} /><StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Required gaps" value={String(requiredMissing)} tone={requiredMissing ? 'warning' : 'default'} /><StatCard icon={<FileSpreadsheet className="h-4 w-4" />} label="Total rows" value={String(rows.length)} /></div>
      </div>

      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-5"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => addRows()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800"><Plus className="h-4 w-4" />Add 5 rows</button><button type="button" onClick={downloadGrid} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"><Download className="h-4 w-4" />Export grid</button><button type="button" onClick={() => void loadMasters(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"><RefreshCw className={`h-4 w-4 ${mastersLoading ? 'animate-spin' : ''}`} />Refresh lists</button><button type="button" onClick={clearSheet} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" />Clear all</button><div className="ml-auto hidden items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 lg:flex"><Info className="h-4 w-4" />Yellow highlight = active field</div></div></div>

      <div className="min-h-0 flex-1 overflow-auto bg-white" onPaste={handlePaste}><table className="min-w-[2300px] border-collapse"><thead className="sticky top-0 z-20 bg-[#0d3f32] text-left text-[10px] font-black uppercase tracking-[.08em] text-white shadow-sm"><tr><th className="sticky left-0 z-30 w-14 border-r border-white/10 bg-[#0d3f32] px-3 py-3 text-center">#</th>{columns.map(column => <th key={column.key} className={`${column.width} border-r border-white/10 px-3 py-3.5`}><div className="flex items-center gap-1.5">{column.label}{column.required && <span className="rounded bg-amber-300 px-1.5 py-0.5 text-[8px] font-black text-amber-950">REQ</span>}</div></th>)}<th className="sticky right-0 z-30 w-16 border-l border-white/10 bg-[#0d3f32] px-2 py-3">&nbsp;</th></tr></thead><tbody>{rows.map((row,rowIndex) => { const rowErrors = validationErrors.filter(error => error.row === rowIndex + 2); const hasRowError = rowErrors.length > 0; return <tr key={rowIndex} className={`border-b border-slate-100 transition ${hasRowError ? 'bg-red-50/40' : rowIndex % 2 ? 'bg-slate-50/45' : 'bg-white'} hover:bg-amber-50/55`}><td className={`sticky left-0 z-10 border-r border-slate-200 px-3 py-2.5 text-center text-xs font-black ${hasRowError ? 'bg-red-50 text-red-600' : 'bg-inherit text-slate-400'}`}>{rowIndex + 1}</td>{columns.map((column,colIndex) => { const hasError = rowErrors.some(error => error.message.toLowerCase().startsWith(column.key.toLowerCase())); const isRequired = column.required; const isNumeric = ['Purchase Price','Sale Price','Opening Stock','Current Stock','Reorder Level'].includes(column.key); return <td key={column.key} className={`border-r border-slate-100 p-1.5 align-middle ${hasError ? 'bg-red-50' : ''}`}>{['Category','Subcategory','Brand','Unit'].includes(column.key) ? renderMasterSelect(row,rowIndex,column.key,column.key === 'Category' ? masters.categories : column.key === 'Subcategory' ? masters.subcategories : column.key === 'Brand' ? masters.brands : masters.units,`Select ${column.key.toLowerCase()}`) : column.key === 'Active' ? <div className="relative"><select value={row.Active || 'Yes'} onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })} onChange={event => updateCell(rowIndex,'Active',event.target.value)} className="h-10 w-full appearance-none rounded-lg border border-transparent bg-white px-2.5 pr-8 text-sm font-semibold text-slate-800 outline-none transition hover:border-amber-200 focus:border-emerald-400 focus:bg-emerald-50 focus:ring-4 focus:ring-emerald-500/10"><option>Yes</option><option>No</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" /></div> : <input value={row[column.key] ?? ''} onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })} onChange={event => updateCell(rowIndex,column.key,event.target.value)} placeholder={isRequired ? 'Required' : 'Optional'} inputMode={isNumeric ? 'decimal' : 'text'} className={`h-10 w-full rounded-lg border px-2.5 text-sm font-semibold text-slate-800 outline-none transition ${hasError ? 'border-red-300 bg-white focus:ring-4 focus:ring-red-500/10' : 'border-transparent bg-white hover:border-amber-200 focus:border-emerald-400 focus:bg-emerald-50 focus:ring-4 focus:ring-emerald-500/10'}`} />}</td>})}<td className="sticky right-0 border-l border-slate-200 bg-inherit p-1.5 text-center"><button type="button" onClick={() => deleteRow(rowIndex)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Delete row"><Trash2 className="h-4 w-4" /></button></td></tr>})}</tbody></table></div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-start gap-2 text-xs text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p><b className="text-slate-700">Tip:</b> click a cell and paste a block from Excel. The grid expands automatically. Required columns are marked <b>*</b>.</p></div><div className="flex shrink-0 gap-2"><button type="button" disabled={busy} onClick={() => setBulkOpen(false)} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-40">Cancel</button><button type="button" disabled={busy || !filledRows.length || validationErrors.length > 0} onClick={() => void importGrid()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{busy ? 'Importing…' : filledRows.length ? `Validate & import ${filledRows.length}` : 'Enter products to import'}</button></div></div></div>
    </section></div>}

    {newMaster && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Master data</p><h2 className="mt-1 text-xl font-black text-slate-950">Add {newMaster.kind.toLowerCase()}</h2><p className="mt-1 text-xs text-slate-500">Create it once and it will be selected in the current row.</p></div><button type="button" onClick={() => setNewMaster(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-slate-700"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Name *</span><input autoFocus value={newMasterName} onChange={event => setNewMasterName(event.target.value)} className={inputClass} placeholder={`e.g. ${newMaster.kind === 'Category' ? 'Accessories' : newMaster.kind === 'Brand' ? 'Samsung' : newMaster.kind === 'Unit' ? 'Piece' : 'Phone Cases'}`} /></label>{newMaster.kind !== 'Unit' && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Code</span><input value={newMasterCode} onChange={event => setNewMasterCode(event.target.value)} className={inputClass} placeholder="Optional code" /></label>}{newMaster.kind === 'Unit' && <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Short name *</span><input value={newUnitShortName} onChange={event => setNewUnitShortName(event.target.value)} className={inputClass} placeholder="pcs" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Decimals</span><input value={newUnitDecimals} onChange={event => setNewUnitDecimals(event.target.value)} className={inputClass} inputMode="numeric" /></label></div>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setNewMaster(null)} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={creatingMaster} onClick={() => void createMaster()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50">{creatingMaster && <RefreshCw className="h-4 w-4 animate-spin" />}Create & select</button></div></div></section></div>}
  </div>
}
