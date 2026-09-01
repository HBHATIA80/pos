'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClipboardEvent, ReactNode } from 'react'
import * as XLSX from 'xlsx'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, Download, FileSpreadsheet, Info, ListChecks, Plus, RefreshCw, Save, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Result = { imported?: number; validRows?: number; message?: string; error?: string; errors?: { row: number; message: string }[] }
type ProductRow = Record<string, string>
type MasterOption = { id: string; name: string; code?: string; shortName?: string; categoryId?: string }
type MasterKind = 'Category' | 'Subcategory' | 'Brand' | 'Unit'
type Column = { key: string; label: string; width: string; required?: boolean }
type Masters = { categories: MasterOption[]; subcategories: MasterOption[]; brands: MasterOption[]; units: MasterOption[] }

const columns: Column[] = [
  { key: 'SKU', label: 'SKU', width: 'w-44', required: true }, { key: 'Barcode', label: 'Barcode', width: 'w-44' },
  { key: 'Product Name', label: 'Product name', width: 'w-64', required: true }, { key: 'Description', label: 'Description', width: 'w-72' },
  { key: 'Category', label: 'Category', width: 'w-52', required: true }, { key: 'Subcategory', label: 'Subcategory', width: 'w-52' },
  { key: 'Brand', label: 'Brand', width: 'w-48', required: true }, { key: 'Unit', label: 'Unit', width: 'w-40', required: true },
  { key: 'Purchase Price', label: 'Purchase price', width: 'w-44', required: true }, { key: 'Sale Price', label: 'Sale price', width: 'w-40' },
  { key: 'Opening Stock', label: 'Opening stock', width: 'w-40' }, { key: 'Current Stock', label: 'Current stock', width: 'w-40' },
  { key: 'Reorder Level', label: 'Reorder level', width: 'w-40' }, { key: 'Active', label: 'Status', width: 'w-32' },
]

const emptyRow = (): ProductRow => ({ SKU: '', Barcode: '', 'Product Name': '', Description: '', Category: '', Subcategory: '', Brand: '', Unit: '', 'Purchase Price': '', 'Sale Price': '', 'Opening Stock': '', 'Current Stock': '', 'Reorder Level': '', Active: 'Yes' })
const draftKey = 'bizybuk.bulk-product-entry.v3'
const requiredKeys = ['SKU', 'Product Name', 'Category', 'Brand', 'Unit', 'Purchase Price']

function validateRows(rows: ProductRow[]) {
  const errors: { row: number; message: string }[] = []
  rows.forEach((row, index) => {
    if (!Object.values(row).some(value => value.trim())) return
    requiredKeys.forEach(key => { if (!row[key]?.trim()) errors.push({ row: index + 1, message: `${key} is required` }) })
    ;['Purchase Price', 'Sale Price', 'Opening Stock', 'Current Stock', 'Reorder Level'].forEach(key => {
      if (row[key]?.trim() && Number.isNaN(Number(row[key]))) errors.push({ row: index + 1, message: `${key} must be a number` })
    })
  })
  return errors
}

function StatCard({ icon, label, value, tone = 'default', helper }: { icon: ReactNode; label: string; value: string; tone?: 'default' | 'warning' | 'danger' | 'success'; helper?: string }) {
  const toneClass = tone === 'warning' ? 'bg-amber-50 text-amber-700 ring-amber-100' : tone === 'danger' ? 'bg-red-50 text-red-700 ring-red-100' : tone === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-50 text-slate-700 ring-slate-100'
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)]"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${toneClass}`}>{icon}</span><span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</span></div><div className="mt-2 flex items-end justify-between gap-2"><p className="text-2xl font-black tracking-tight text-slate-950">{value}</p>{helper && <span className="text-[11px] font-semibold text-slate-400">{helper}</span>}</div></div>
}

function Field({ value, onChange, placeholder, required, numeric, onFocus, className = '' }: { value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; numeric?: boolean; onFocus?: () => void; className?: string }) {
  return <input value={value} onFocus={onFocus} onChange={e => onChange(e.target.value)} placeholder={required ? 'Required' : placeholder} inputMode={numeric ? 'decimal' : undefined} className={`h-10 w-full rounded-xl border ${required && !value.trim() ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'} px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 placeholder:text-slate-400 ${className}`} />
}

export default function ProductImportPage() {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [rows, setRows] = useState<ProductRow[]>(() => Array.from({ length: 5 }, emptyRow))
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 })
  const [draftSaved, setDraftSaved] = useState(false)
  const [masters, setMasters] = useState<Masters>({ categories: [], subcategories: [], brands: [], units: [] })
  const [mastersLoading, setMastersLoading] = useState(false)
  const [newMaster, setNewMaster] = useState<{ kind: MasterKind; rowIndex: number; categoryId?: string } | null>(null)
  const [newMasterName, setNewMasterName] = useState('')
  const [newMasterCode, setNewMasterCode] = useState('')
  const [newUnitShortName, setNewUnitShortName] = useState('')
  const [newUnitDecimals, setNewUnitDecimals] = useState('2')
  const [creatingMaster, setCreatingMaster] = useState(false)

  const filledRows = useMemo(() => rows.filter(row => Object.values(row).some(value => value.trim())), [rows])
  const validationErrors = useMemo(() => validateRows(rows), [rows])
  const invalidRowCount = new Set(validationErrors.map(error => error.row)).size
  const validCount = Math.max(0, filledRows.length - invalidRowCount)
  const requiredMissing = useMemo(() => filledRows.reduce((total, row) => total + requiredKeys.filter(key => !row[key]?.trim()).length, 0), [filledRows])

  useEffect(() => {
    try { const saved = localStorage.getItem(draftKey); if (!saved) return; const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length) setRows(parsed) } catch { /* ignore invalid draft */ }
  }, [])

  useEffect(() => {
    try {
      if (!filledRows.length) return
      localStorage.setItem(draftKey, JSON.stringify(rows)); setDraftSaved(true)
      const timer = window.setTimeout(() => setDraftSaved(false), 1200)
      return () => window.clearTimeout(timer)
    } catch { /* ignore local storage failures */ }
  }, [rows, filledRows.length])

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

  function updateCell(rowIndex: number, key: string, value: string) { setRows(current => current.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row)); setResult(null) }
  function updateMasterCell(rowIndex: number, key: string, value: string) { setRows(current => current.map((row, index) => index === rowIndex ? key === 'Category' ? { ...row, Category: value, Subcategory: '' } : { ...row, [key]: value } : row)); setResult(null) }

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
  function clearSheet() { setRows(Array.from({ length: 5 }, emptyRow)); setActiveCell({ row: 0, col: 0 }); setResult(null); try { localStorage.removeItem(draftKey) } catch { /* ignore */ } }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return
    event.preventDefault()
    const matrix = text.split(/\r?\n/).filter(Boolean).map(line => line.split('\t'))
    setRows(current => {
      const next = current.map(row => ({ ...row }))
      matrix.forEach((pasteRow, rOffset) => pasteRow.forEach((value, cOffset) => {
        const col = columns[activeCell.col + cOffset]; if (!col) return
        const rowIndex = activeCell.row + rOffset; while (!next[rowIndex]) next.push(emptyRow()); next[rowIndex][col.key] = value.trim()
      }))
      return next
    })
    toast.success(`${matrix.length} row${matrix.length === 1 ? '' : 's'} pasted`)
  }

  async function postWorkbook(workbook: XLSX.WorkBook) {
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const form = new FormData(); form.append('file', new File([buffer], 'bulk-products.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    setBusy(true); setResult(null)
    try {
      const response = await fetch('/api/catalog/import', { method: 'POST', body: form }); const body = await response.json(); setResult(body)
      if (!response.ok) { toast.error(body.error || 'Import failed. Review the issues below.'); return }
      try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
      toast.success(body.message || 'Products saved successfully.'); setBulkOpen(false); setRows(Array.from({ length: 5 }, emptyRow))
    } catch { toast.error('Unable to save products. Please check your connection and try again.') }
    finally { setBusy(false) }
  }

  async function importGrid() {
    if (!filledRows.length) { toast.error('Enter at least one product row.'); return }
    if (validationErrors.length) { setResult({ errors: validationErrors }); toast.error(`Please fix ${validationErrors.length} validation issue${validationErrors.length === 1 ? '' : 's'} before saving.`); return }
    const normalized = filledRows.map(row => ({ ...row, 'Sale Price': row['Sale Price']?.trim() || '0' }))
    const sheet = XLSX.utils.json_to_sheet(normalized, { header: columns.map(column => column.key) }); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Products'); await postWorkbook(workbook)
  }

  async function upload() {
    if (!file) { toast.error('Choose an Excel file first.'); return }
    setBusy(true); setResult(null)
    try {
      const form = new FormData(); form.append('file', file); const response = await fetch('/api/catalog/import', { method: 'POST', body: form }); const body = await response.json(); setResult(body)
      if (!response.ok) toast.error(body.error || 'Import failed'); else { toast.success(body.message || 'Products imported successfully'); setFile(null); if (input.current) input.current.value = '' }
    } catch { toast.error('Unable to upload the Excel file.') } finally { setBusy(false) }
  }

  function downloadGrid() { const sheet = XLSX.utils.json_to_sheet(filledRows.length ? filledRows : [emptyRow()], { header: columns.map(column => column.key) }); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Products'); XLSX.writeFile(workbook, 'bulk-products.xlsx') }

  function renderMasterSelect(row: ProductRow, rowIndex: number, columnKey: string, options: MasterOption[], placeholder: string) {
    const filteredOptions = columnKey === 'Subcategory' ? options.filter(option => !row.Category || option.categoryId === masters.categories.find(category => category.name === row.Category)?.id) : options
    const kind = columnKey as MasterKind
    return <div className="relative h-10"><select value={row[columnKey] ?? ''} onFocus={() => setActiveCell({ row: rowIndex, col: columns.findIndex(column => column.key === columnKey) })} onChange={event => event.target.value === '__create_new__' ? openCreateMaster(kind, rowIndex) : updateMasterCell(rowIndex, columnKey, event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"><option value="">{mastersLoading ? 'Loading…' : placeholder}</option>{filteredOptions.map(option => <option key={option.id} value={option.name}>{option.name}{option.shortName ? ` (${option.shortName})` : ''}</option>)}<option value="__create_new__">＋ Add new {kind.toLowerCase()}…</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" /></div>
  }

  return <main className="min-h-screen bg-[#f5faf7] text-slate-900"><div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><button onClick={() => window.history.back()} aria-label="Go back" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700"><ArrowLeft className="h-5 w-5" /></button><div><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700"><span>Catalogue control centre</span><span className="rounded-full bg-emerald-100 px-2.5 py-1 tracking-[0.12em]">Bulk tools</span></div><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Import & update products</h1><p className="mt-1 text-sm text-slate-500">Add or update a large catalogue safely without entering every SKU one by one.</p></div></div><div className="flex items-center gap-2 self-start sm:self-auto">{draftSaved && <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:flex"><Check className="h-3.5 w-3.5" /> Draft saved</span>}<button onClick={() => void loadMasters(true)} disabled={mastersLoading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${mastersLoading ? 'animate-spin' : ''}`} /> Refresh master data</button></div></header>

    <section className="overflow-hidden rounded-[28px] border border-emerald-200/70 bg-white shadow-[0_18px_60px_rgba(16,94,70,0.10)]"><div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]"><div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-7 text-white sm:p-9"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-50"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel-style catalogue tools</div><h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Bring your catalogue in cleanly.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80 sm:text-base">Use the shop template for reliable imports, or open the bulk grid when you want to paste rows directly from Excel.</p><div className="mt-7 flex flex-wrap gap-3"><button onClick={() => setBulkOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-emerald-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"><Plus className="h-4 w-4" /> Open bulk entry</button><button onClick={downloadGrid} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15"><Download className="h-4 w-4" /> Download shop template</button></div></div><div className="bg-[#f0f9f4] p-7 sm:p-9"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Recommended workflow</p><div className="mt-5 space-y-4">{[['01', 'Prepare', 'Template or Excel file'], ['02', 'Validate', 'Required fields checked'], ['03', 'Import', 'Products added together']].map(([number, title, text]) => <div key={number} className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-800">{number}</span><div><p className="text-sm font-black text-slate-900">{title}</p><p className="mt-0.5 text-xs text-slate-500">{text}</p></div></div>)}</div></div></div></section>

    <section className="mt-5 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ListChecks className="h-5 w-5" /></div><h3 className="mt-3 font-black">Use existing master data</h3><p className="mt-1 text-sm leading-5 text-slate-500">Categories, brands, units and subcategories stay aligned with your live catalogue.</p></div><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><ShieldCheck className="h-5 w-5" /></div><h3 className="mt-3 font-black">Validate before saving</h3><p className="mt-1 text-sm leading-5 text-slate-500">Required fields and numeric prices are checked before an import request is sent.</p></div><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><Info className="h-5 w-5" /></div><h3 className="mt-3 font-black">Large catalogue friendly</h3><p className="mt-1 text-sm leading-5 text-slate-500">Paste from Excel, work horizontally, and keep the grid inside its own scroll area.</p></div></section>

    <section className="mt-5 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Recommended for existing files</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Upload an Excel catalogue</h2><p className="mt-1 text-sm text-slate-500">Use the shop template or a workbook with the same Products columns.</p></div><button onClick={downloadGrid} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"><Download className="h-4 w-4" /> Get template</button></div><div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]"><label className="flex min-h-[110px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-[#f6fbf8] px-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40"><input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} /><div>{file ? <><FileSpreadsheet className="mx-auto h-7 w-7 text-emerald-700" /><p className="mt-2 text-sm font-black text-slate-800">{file.name}</p><p className="mt-1 text-xs text-slate-500">Click to choose a different file</p></> : <><Upload className="mx-auto h-7 w-7 text-emerald-700" /><p className="mt-2 text-sm font-black text-slate-800">Drop or choose an Excel file</p><p className="mt-1 text-xs text-slate-500">.xlsx, .xls or .csv</p></>}</div></label><div className="flex items-center justify-end"><button onClick={() => void upload()} disabled={!file || busy} className="inline-flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? 'Importing…' : 'Import file'}</button></div></div>{result?.errors?.length ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="font-black text-rose-800">Please review these issues</p><div className="mt-2 max-h-32 overflow-auto text-sm text-rose-700">{result.errors.map((error, index) => <div key={`${error.row}-${index}`}>Row {error.row}: {error.message}</div>)}</div></div> : result?.message ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{result.message}</div> : null}</section>

    {bulkOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setBulkOpen(false) }}><section className="flex h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)] sm:h-[94vh] sm:rounded-[28px]">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700"><span>Bulk product entry</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">Excel-style grid</span></div><h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Add products quickly and accurately</h2><p className="mt-0.5 text-xs text-slate-500">Fill required fields, paste from Excel, then validate and save everything together.</p></div></div><button onClick={() => !busy && setBulkOpen(false)} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:opacity-50" disabled={busy}><X className="h-5 w-5" /></button></div><div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4"><StatCard icon={<ListChecks className="h-4 w-4" />} label="Rows ready" value={String(filledRows.length)} helper="with data" /><StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Valid rows" value={String(validCount)} tone="success" helper="ready to save" /><StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Required gaps" value={String(requiredMissing)} tone={requiredMissing ? 'warning' : 'success'} helper="fields" /><StatCard icon={<FileSpreadsheet className="h-4 w-4" />} label="Total rows" value={String(rows.length)} helper="in grid" /></div></div>
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#f7fbf8] px-4 py-3 sm:px-6"><div className="flex flex-wrap items-center gap-2"><button onClick={() => addRows(5)} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"><Plus className="h-4 w-4" /> Add 5 rows</button><button onClick={downloadGrid} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"><Download className="h-4 w-4" /> Export grid</button><button onClick={() => void loadMasters(true)} disabled={mastersLoading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${mastersLoading ? 'animate-spin' : ''}`} /> Refresh lists</button><button onClick={clearSheet} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Clear all</button></div><div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /> Active cell</div></div>
      <div className="min-h-0 flex-1 overflow-hidden bg-white" onPaste={handlePaste}><div className="h-full overflow-auto overscroll-contain"><table className="min-w-[2450px] border-separate border-spacing-0 text-left"><thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_rgba(15,23,42,0.08)]"><tr><th className="sticky left-0 z-30 w-14 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">#</th>{columns.map(column => <th key={column.key} className={`border-b border-r border-slate-200 px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-600 ${column.width}`}>{column.label}{column.required && <span className="ml-1 text-rose-500">*</span>}</th>)}<th className="sticky right-0 z-30 w-16 border-b border-slate-200 bg-slate-50 px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Action</th></tr></thead><tbody>{rows.map((row, rowIndex) => { const rowErrors = validationErrors.filter(error => error.row === rowIndex + 1); return <tr key={rowIndex} className="group bg-white hover:bg-emerald-50/20"><td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-2 text-center text-xs font-black text-slate-500 group-hover:bg-emerald-50/20">{rowIndex + 1}</td>{columns.map((column, colIndex) => { const active = activeCell.row === rowIndex && activeCell.col === colIndex; const cellHasError = rowErrors.some(error => error.message.startsWith(column.key)); return <td key={column.key} className={`border-b border-r border-slate-100 p-1.5 ${active ? 'bg-amber-50/50' : ''}`}>{['Category', 'Subcategory', 'Brand', 'Unit'].includes(column.key) ? renderMasterSelect(row, rowIndex, column.key, column.key === 'Category' ? masters.categories : column.key === 'Subcategory' ? masters.subcategories : column.key === 'Brand' ? masters.brands : masters.units, `Select ${column.key.toLowerCase()}`) : <Field value={row[column.key] ?? ''} onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })} onChange={value => updateCell(rowIndex, column.key, value)} placeholder={column.required ? 'Required' : 'Optional'} required={column.required} numeric={['Purchase Price', 'Sale Price', 'Opening Stock', 'Current Stock', 'Reorder Level'].includes(column.key)} className={cellHasError ? 'border-rose-400 ring-2 ring-rose-100' : active ? 'border-amber-300 ring-2 ring-amber-100' : ''} />}</td>})}<td className="sticky right-0 z-10 border-b border-slate-100 bg-white p-1.5 group-hover:bg-emerald-50/20"><button onClick={() => deleteRow(rowIndex)} disabled={busy} aria-label={`Delete row ${rowIndex + 1}`} className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></td></tr>})}</tbody></table></div></div>
      {result?.errors?.length ? <div className="shrink-0 max-h-28 overflow-auto border-t border-rose-200 bg-rose-50 px-4 py-2.5 sm:px-6"><div className="flex items-start gap-2 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><span className="font-black">Fix before saving:</span> {result.errors.slice(0, 8).map((error, index) => <span key={index} className="ml-2">Row {error.row}: {error.message}</span>)}</div></div></div> : null}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-2 text-xs leading-5 text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong className="text-slate-700">Required:</strong> SKU, product name, category, brand, unit and purchase price. Sale price is optional and saves as ₹0 when blank. <span className="hidden sm:inline">Your entries are kept as a local draft until successfully saved.</span></span></div><div className="flex shrink-0 items-center justify-end gap-2"><button onClick={() => !busy && setBulkOpen(false)} disabled={busy} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button><button onClick={() => void importGrid()} disabled={busy || !filledRows.length} className="inline-flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{busy ? 'Saving…' : `Save products${filledRows.length ? ` (${filledRows.length})` : ''}`}</button></div></div></footer>
    </section></div>}

    {newMaster && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><section className="w-full max-w-md rounded-3xl border border-white bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Master data</p><h2 className="mt-1 text-2xl font-black text-slate-950">Add {newMaster.kind}</h2><p className="mt-1 text-sm text-slate-500">Create it once and it will be selected in this row.</p></div><button onClick={() => !creatingMaster && setNewMaster(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-black text-slate-700">Name *</span><input autoFocus value={newMasterName} onChange={e => setNewMasterName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" placeholder={`Enter ${newMaster.kind.toLowerCase()} name`} /></label>{newMaster.kind !== 'Unit' && <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-700">Code <span className="font-medium text-slate-400">(optional)</span></span><input value={newMasterCode} onChange={e => setNewMasterCode(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" placeholder="Optional code" /></label>}{newMaster.kind === 'Unit' && <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-black text-slate-700">Short name *</span><input value={newUnitShortName} onChange={e => setNewUnitShortName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" placeholder="e.g. pcs" /></label><label className="block"><span className="mb-1.5 block text-xs font-black text-slate-700">Decimals</span><input value={newUnitDecimals} onChange={e => setNewUnitDecimals(e.target.value)} inputMode="numeric" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" /></label></div>}</div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setNewMaster(null)} disabled={creatingMaster} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700">Cancel</button><button onClick={() => void createMaster()} disabled={creatingMaster} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60">{creatingMaster && <RefreshCw className="h-4 w-4 animate-spin" />}Create & select</button></div></section></div>}
  </div></main>
}
