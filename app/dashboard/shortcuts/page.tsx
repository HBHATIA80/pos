import Link from 'next/link'

const shortcuts = [
  ['F1', 'Open keyboard shortcut guide'],
  ['F2', 'Focus Product / Barcode search'],
  ['F3', 'Focus Customer / Supplier search'],
  ['F4', 'Focus first quantity field'],
  ['F6', 'Open Latest 20 Vouchers'],
  ['Ctrl + Enter', 'Complete / Checkout invoice'],
  ['Ctrl + D', 'Save as Draft / Hold'],
  ['Alt + R', 'Refresh billing data'],
  ['Enter', 'Select the first search result'],
  ['Tab', 'Next billing field'],
  ['Shift + Tab', 'Previous billing field'],
  ['Esc', 'Close open search/history windows'],
]

export default function ShortcutsPage() {
  return <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600">BIZBook POS</p>
      <h1 className="mt-1 text-2xl font-black text-slate-900">Keyboard Shortcuts</h1>
      <p className="mt-1 text-sm text-slate-500">Use these shortcuts on desktop to create Sales and Purchase vouchers faster without reaching for the mouse.</p>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {shortcuts.map(([key, label]) => <div key={key} className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0 sm:px-5"><span className="text-sm font-semibold text-slate-700">{label}</span><kbd className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm">{key}</kbd></div>)}
    </div>
    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm text-slate-700">
      <b>Barcode scanner tip:</b> a USB/Bluetooth scanner that acts like a keyboard can scan directly into Product / Barcode search. Press Enter after the scan if your scanner does not send Enter automatically.
    </div>
    <div className="flex flex-wrap gap-2">
      <Link href="/dashboard/sales" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-700">Open Sales POS</Link>
      <Link href="/dashboard/purchases" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Open Purchase POS</Link>
    </div>
  </div>
}
