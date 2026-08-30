export type PdfInvoice = {
  invoice_no: string
  kind: 'purchase' | 'sale'
  status: string
  party?: { name?: string | null; phone?: string | null } | null
  subtotal: number
  discount_amount: number
  grand_total: number
  notes?: string | null
  date: string | null
  created_at: string
  items: Array<{ product_name: string; sku: string | null; unit_name: string | null; quantity: number; unit_price: number; discount_amount: number; line_total: number }>
}

const esc = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '?')
const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateText = (value: string | null, fallback: string) => new Date(value || fallback).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

function wrap(text: string, max: number) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > max && current) { lines.push(current); current = word } else current = next
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export function buildInvoicePdf(invoice: PdfInvoice): Blob {
  const items = invoice.items || []
  const rowsPerPage = 22
  const pages: string[][] = []
  const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage))

  // BIZYBUK palette: strong readable text with soft green/yellow surfaces.
  const COLORS = {
    ink: '0.08 0.14 0.11',
    muted: '0.28 0.38 0.33',
    green: '0.06 0.47 0.22',
    white: '1 1 1',
    paleGreen: '0.92 0.98 0.94',
    softGreen: '0.96 0.99 0.97',
    tableGreen: '0.93 0.97 0.94',
    yellow: '1 0.95 0.72',
    border: '0.78 0.86 0.81',
  }

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const lines: string[] = []
    const add = (
      text: string,
      size = 10,
      x = 42,
      y = 0,
      font = 'F1',
      color = COLORS.ink,
    ) => {
      // Always reset text color here. PDF fill color is stateful and otherwise
      // inherits the pale background used by the previous rectangle.
      lines.push(`${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET`)
    }
    const rect = (x: number, y: number, w: number, h: number, fill: string) => {
      lines.push(`${fill} rg ${x} ${y} ${w} ${h} re f`)
    }
    const line = (x1: number, y1: number, x2: number, y2: number) => {
      lines.push(`${COLORS.border} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`)
    }

    rect(0, 0, 595, 842, COLORS.white)
    rect(0, 775, 595, 67, COLORS.paleGreen)
    add('BIZYBUK.IN', 20, 42, 812, 'F2', COLORS.green)
    add(invoice.kind === 'purchase' ? 'PURCHASE INVOICE' : 'SALES INVOICE', 9, 43, 793, 'F2', COLORS.muted)
    add(invoice.invoice_no, 13, 390, 812, 'F2', COLORS.ink)
    add(`Status: ${invoice.status}`, 9, 390, 794, 'F2', COLORS.green)

    rect(42, 716, 511, 45, COLORS.softGreen)
    add(invoice.kind === 'purchase' ? 'SUPPLIER' : 'CUSTOMER', 8, 54, 746, 'F2', COLORS.green)
    add(invoice.party?.name || 'Walk-in / Other', 11, 54, 730, 'F2', COLORS.ink)
    if (invoice.party?.phone) add(invoice.party.phone, 8, 54, 716, 'F1', COLORS.muted)
    add('INVOICE DATE', 8, 350, 746, 'F2', COLORS.green)
    add(dateText(invoice.date, invoice.created_at), 10, 350, 730, 'F2', COLORS.ink)

    const tableTop = 680
    rect(42, tableTop - 22, 511, 22, COLORS.tableGreen)
    add('ITEM', 8, 50, tableTop - 15, 'F2', COLORS.green)
    add('QTY', 8, 315, tableTop - 15, 'F2', COLORS.green)
    add('RATE', 8, 370, tableTop - 15, 'F2', COLORS.green)
    add('DISC.', 8, 435, tableTop - 15, 'F2', COLORS.green)
    add('AMOUNT', 8, 490, tableTop - 15, 'F2', COLORS.green)

    let y = tableTop - 42
    const start = pageIndex * rowsPerPage
    const end = Math.min(items.length, start + rowsPerPage)
    for (let i = start; i < end; i++) {
      const item = items[i]
      const name = `${item.product_name}${item.sku ? ` (${item.sku})` : ''}`
      const itemLines = wrap(name, 42)
      add(itemLines[0].slice(0, 42), 8.5, 50, y, 'F1', COLORS.ink)
      if (itemLines[1]) add(itemLines[1].slice(0, 42), 7, 50, y - 11, 'F1', COLORS.muted)
      add(`${item.quantity} ${item.unit_name || ''}`.trim(), 8.5, 315, y, 'F1', COLORS.ink)
      add(money(item.unit_price), 8.5, 370, y, 'F1', COLORS.ink)
      add(money(item.discount_amount), 8.5, 435, y, 'F1', COLORS.muted)
      add(money(item.line_total), 8.5, 490, y, 'F2', COLORS.ink)
      line(42, y - 14, 553, y - 14)
      y -= itemLines.length > 1 ? 28 : 24
    }

    if (pageIndex === totalPages - 1) {
      y = Math.max(y - 10, 180)
      line(350, y + 12, 553, y + 12)
      add('Subtotal', 9, 370, y - 5, 'F1', COLORS.muted)
      add(money(invoice.subtotal), 9, 485, y - 5, 'F2', COLORS.ink)
      add('Discount', 9, 370, y - 23, 'F1', COLORS.muted)
      add(money(invoice.discount_amount), 9, 485, y - 23, 'F2', COLORS.ink)
      rect(350, y - 61, 203, 26, COLORS.yellow)
      add('GRAND TOTAL', 10, 362, y - 52, 'F2', COLORS.green)
      add(money(invoice.grand_total), 11, 475, y - 52, 'F2', COLORS.ink)
      if (invoice.notes) {
        add('NOTES', 8, 42, y - 95, 'F2', COLORS.green)
        wrap(invoice.notes, 92).slice(0, 4).forEach((text, index) => add(text, 8.5, 42, y - 111 - index * 13, 'F1', COLORS.muted))
      }
    }

    add(`Page ${pageIndex + 1} of ${totalPages}`, 7.5, 485, 28, 'F1', COLORS.muted)
    pages.push(lines)
  }

  const objects: string[] = []
  const pageObjectIds: number[] = []
  const contentObjectIds: number[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('<< /Type /Pages /Kids [] /Count 0 >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  pages.forEach((lines) => {
    contentObjectIds.push(objects.length + 1)
    const stream = lines.join('\n')
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    pageObjectIds.push(objects.length + 1)
    objects.push('')
  })

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  pageObjectIds.forEach((pageId, index) => {
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`
  })

  let pdf = '%PDF-1.4\n%----\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}
