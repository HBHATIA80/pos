from pathlib import Path

api = Path('app/api/accounting/reports/route.ts')
s = api.read_text()

s = s.replace(
"type ProfitInvoice = { invoice_id: string; invoice_no: string; date: string; party_id: string | null; party_name: string; sales: number; cogs: number; profit: number; margin: number }",
"type ProfitInvoiceLine = { product_id: string; name: string; sku: string | null; quantity: number; cost_per_pc: number; sale_per_pc: number; profit_per_pc: number; total_sales: number; total_cost: number; total_profit: number }\ntype ProfitInvoice = { invoice_id: string; invoice_no: string; date: string; party_id: string | null; party_name: string; sales: number; cogs: number; profit: number; margin: number; lines: ProfitInvoiceLine[] }"
)
s = s.replace(
"    let calculatedInvoiceCogs = 0\n    for (const item of items) {",
"    let calculatedInvoiceCogs = 0\n    const invoiceLines: ProfitInvoiceLine[] = []\n    for (const item of items) {"
)
s = s.replace(
"      const lineProfit = lineSales - lineCogs\n      calculatedInvoiceCogs += lineCogs",
"      const lineProfit = lineSales - lineCogs\n      const salePerPc = qty ? lineSales / qty : 0\n      const profitPerPc = salePerPc - lineCost\n      calculatedInvoiceCogs += lineCogs\n      invoiceLines.push({ product_id: item.product_id, name: productName, sku, quantity: qty, cost_per_pc: round2(lineCost), sale_per_pc: round2(salePerPc), profit_per_pc: round2(profitPerPc), total_sales: round2(lineSales), total_cost: round2(lineCogs), total_profit: round2(lineProfit) })"
)
s = s.replace(
"profitInvoices.push({ invoice_id: invoice.id, invoice_no: invoice.invoice_no, date: saleDate.slice(0, 10), party_id: invoice.party_id ?? null, party_name: partyName, sales: invoiceSales, cogs: calculatedInvoiceCogs, profit: invProfit, margin: marginOf(invoiceSales, invProfit) })",
"profitInvoices.push({ invoice_id: invoice.id, invoice_no: invoice.invoice_no, date: saleDate.slice(0, 10), party_id: invoice.party_id ?? null, party_name: partyName, sales: invoiceSales, cogs: calculatedInvoiceCogs, profit: invProfit, margin: marginOf(invoiceSales, invProfit), lines: invoiceLines })"
)
s = s.replace(
"    const returnSales = n(ret.grand_total)\n    salesReturns += returnSales",
"    const returnSales = n(ret.grand_total)\n    const returnLines: ProfitInvoiceLine[] = []\n    salesReturns += returnSales"
)
s = s.replace(
"    const items = (ret.return_voucher_items ?? []) as ReturnItem[]\n    for (const item of items) {",
"    const items = (ret.return_voucher_items ?? []) as ReturnItem[]\n    for (const item of items) {"
)
s = s.replace(
"      const lineCogs = qty * costForReturnItem(item)\n      const product = productMeta.get(item.product_id)",
"      const lineCogs = qty * costForReturnItem(item)\n      const returnCostPerPc = costForReturnItem(item)\n      const returnSalePerPc = qty ? lineSales / qty : 0\n      const returnProfitPerPc = returnSalePerPc - returnCostPerPc\n      const product = productMeta.get(item.product_id)"
)
s = s.replace(
"      const sku = product?.sku ?? null\n      const old = profitProducts.get(item.product_id)",
"      const sku = product?.sku ?? null\n      returnLines.push({ product_id: item.product_id, name: productName, sku, quantity: qty, cost_per_pc: round2(returnCostPerPc), sale_per_pc: round2(returnSalePerPc), profit_per_pc: round2(returnProfitPerPc), total_sales: round2(-lineSales), total_cost: round2(-lineCogs), total_profit: round2(-(lineSales - lineCogs)) })\n      const old = profitProducts.get(item.product_id)"
)
s = s.replace(
"profitInvoices.push({ invoice_id: ret.id, invoice_no: ret.return_no, date: String(ret.return_date).slice(0, 10), party_id: ret.party_id ?? null, party_name: partyName, sales: -returnSales, cogs: -returnCogsValue, profit: -returnSales + returnCogsValue, margin: marginOf(-returnSales, -returnSales + returnCogsValue) })",
"profitInvoices.push({ invoice_id: ret.id, invoice_no: ret.return_no, date: String(ret.return_date).slice(0, 10), party_id: ret.party_id ?? null, party_name: partyName, sales: -returnSales, cogs: -returnCogsValue, profit: -returnSales + returnCogsValue, margin: marginOf(-returnSales, -returnSales + returnCogsValue), lines: returnLines })"
)
api.write_text(s)

page = Path('app/dashboard/analysis/page.tsx')
p = page.read_text()
p = p.replace("import { BarChart3, BookOpen, CalendarDays, Download, FileText, Loader2, RefreshCw, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'", "import { BarChart3, BookOpen, CalendarDays, Download, FileText, Loader2, RefreshCw, TrendingDown, TrendingUp, WalletCards, X, Eye } from 'lucide-react'")
p = p.replace(
"  topExpenses:{name:string;amount:number}[]\n}",
"  topExpenses:{name:string;amount:number}[]\n  profitAnalysis:{\n    invoiceWise:{invoice_id:string;invoice_no:string;date:string;party_id:string|null;party_name:string;sales:number;cogs:number;profit:number;margin:number;lines:{product_id:string;name:string;sku:string|null;quantity:number;cost_per_pc:number;sale_per_pc:number;profit_per_pc:number;total_sales:number;total_cost:number;total_profit:number}[]}[]\n    productWise:{product_id:string;name:string;sku:string|null;quantity:number;sales:number;cogs:number;profit:number;margin:number;average_purchase_cost:number}[]\n    categoryWise:{category_id:string|null;name:string;sales:number;cogs:number;profit:number;margin:number}[]\n    partyWise:{party_id:string|null;name:string;invoices:number;sales:number;cogs:number;profit:number;margin:number}[]\n  }\n}"
)
p = p.replace("const [data,setData]=useState<Report|null>(null); const [loading,setLoading]=useState(true); const [tab,setTab]=useState<'pnl'|'balance'|'trial'|'parties'|'ratios'>('pnl');", "const [data,setData]=useState<Report|null>(null); const [loading,setLoading]=useState(true); const [tab,setTab]=useState<'pnl'|'invoice'|'balance'|'trial'|'parties'|'ratios'>('pnl'); const [selectedInvoice,setSelectedInvoice]=useState<Report['profitAnalysis']['invoiceWise'][number]|null>(null);")
p = p.replace(
"{[['pnl','Profit & Loss'],['balance','Balance Sheet'],['trial','Trial Balance'],['parties','Debtors / Creditors'],['ratios','Ratios & KPIs']].map",
"{[['pnl','Profit & Loss'],['invoice','Invoice-wise Profit'],['balance','Balance Sheet'],['trial','Trial Balance'],['parties','Debtors / Creditors'],['ratios','Ratios & KPIs']].map"
)
marker = "  {tab==='balance'&&"
insert = '''  {tab==='invoice'&&<section className="rounded-2xl border bg-white shadow-sm overflow-hidden"><div className="border-b p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-black text-lg">Invoice-wise Profit Analysis</h2><p className="mt-1 text-sm text-slate-500">Every invoice with model-wise cost, realized sale price, per-piece profit and total profit.</p></div><div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{data.profitAnalysis.invoiceWise.length} invoices / returns</div></div></div><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-sm"><thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-wide text-slate-400"><tr><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Margin</th><th className="p-3 text-center">Details</th></tr></thead><tbody className="divide-y">{data.profitAnalysis.invoiceWise.map(inv=><tr key={inv.invoice_id} className="hover:bg-slate-50"><td className="p-3 font-black">{inv.invoice_no}</td><td className="p-3 tabular-nums">{inv.date}</td><td className="p-3 max-w-[260px] truncate">{inv.party_name}</td><td className="p-3 text-right font-semibold">{money(inv.sales)}</td><td className="p-3 text-right">{money(inv.cogs)}</td><td className={`p-3 text-right font-black ${inv.profit<0?'text-red-600':'text-emerald-700'}`}>{money(inv.profit)}</td><td className="p-3 text-right font-bold">{pct(inv.margin)}</td><td className="p-3 text-center"><button onClick={()=>setSelectedInvoice(inv)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100"><Eye className="h-3.5 w-3.5"/> View</button></td></tr>)}</tbody></table></div></section>}\n\n'''
p = p.replace(marker, insert + marker)
modal = '''  {selectedInvoice&&<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedInvoice(null)}}><section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between gap-4 border-b bg-white px-4 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-600">Profit Analysis · Invoice</p><h2 className="mt-1 text-xl font-black text-slate-950">{selectedInvoice.invoice_no}</h2><p className="mt-1 text-xs font-semibold text-slate-500">{selectedInvoice.date} · {selectedInvoice.party_name}</p></div><button onClick={()=>setSelectedInvoice(null)} className="rounded-xl border p-2.5 text-slate-600 hover:bg-slate-100" aria-label="Close invoice profit details"><X className="h-5 w-5"/></button></header><div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6"><div className="grid gap-3 sm:grid-cols-4"><Kpi title="Invoice Sales" value={money(selectedInvoice.sales)} hint="Net realized sales"/><Kpi title="Cost" value={money(selectedInvoice.cogs)} hint="Cost of goods sold"/><Kpi title="Total Profit" value={money(selectedInvoice.profit)} hint="Sales less cost"/><Kpi title="Margin" value={pct(selectedInvoice.margin)} hint="Profit / sales"/></div><div className="mt-5 overflow-x-auto rounded-xl border"><table className="min-w-[1000px] w-full text-sm"><thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-wide text-slate-400"><tr><th className="p-3">Model / Product</th><th className="p-3">SKU</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Cost / PC</th><th className="p-3 text-right">Sale / PC</th><th className="p-3 text-right">Profit / PC</th><th className="p-3 text-right">Total Sales</th><th className="p-3 text-right">Total Cost</th><th className="p-3 text-right">Total Profit</th></tr></thead><tbody className="divide-y">{selectedInvoice.lines.map((line,i)=><tr key={`${line.product_id}-${i}`}><td className="p-3 font-black">{line.name}</td><td className="p-3 text-slate-500">{line.sku||'—'}</td><td className="p-3 text-right font-bold tabular-nums">{line.quantity}</td><td className="p-3 text-right tabular-nums">{money(line.cost_per_pc)}</td><td className="p-3 text-right font-bold tabular-nums">{money(line.sale_per_pc)}</td><td className={`p-3 text-right font-black tabular-nums ${line.profit_per_pc<0?'text-red-600':'text-emerald-700'}`}>{money(line.profit_per_pc)}</td><td className="p-3 text-right tabular-nums">{money(line.total_sales)}</td><td className="p-3 text-right tabular-nums">{money(line.total_cost)}</td><td className={`p-3 text-right font-black tabular-nums ${line.total_profit<0?'text-red-600':'text-emerald-700'}`}>{money(line.total_profit)}</td></tr>)}</tbody><tfoot className="border-t bg-slate-50 font-black"><tr><td className="p-3" colSpan={6}>TOTAL</td><td className="p-3 text-right">{money(selectedInvoice.sales)}</td><td className="p-3 text-right">{money(selectedInvoice.cogs)}</td><td className="p-3 text-right">{money(selectedInvoice.profit)}</td></tr></tfoot></table></div></div></section></div>}\n'''
p = p.replace(" </div>\n}\nfunction ReportCard", " </div>\n" + modal + "}\nfunction ReportCard")
page.write_text(p)
''