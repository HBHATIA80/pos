export type LedgerPdfEntry = {
  date: string
  description: string
  reference: string
  debit: number
  credit: number
  balance: number
}

export type LedgerPdfData = {
  partyName: string
  partyPhone?: string | null
  partyCode?: string | null
  startDate: string
  endDate?: string | null
  openingBalance: number
  debitTotal: number
  creditTotal: number
  finalBalance: number
  balanceType: 'receivable' | 'payable' | 'settled'
  entries: LedgerPdfEntry[]
}

const esc = (value: string) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\\x20-\\x7E]/g, '?')
const money = (value: number) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateText = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function wrap(text: string, max: number) {
  const words = String(text || '').split(/\\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > max && current) {
      lines.push(current)
      current = word
    } else current = next
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export function buildLedgerPdf(data: LedgerPdfData): Blob {
  const rowsPerPage = 26
  const totalPages = Math.max(1, Math.ceil(data.entries.length / rowsPerPage))
  const pages: string[][] = []
  const COLORS = {
    ink: '0.08 0.14 0.11',
    muted: '0.28 0.38 0.33',
    green: '0.06 0.47 0.22',
    paleGreen: '0.92 0.98 0.94',
    softGreen: '0.96 0.99 0.97',
    tableGreen: '0.93 0.97 0.94',
    yellow: '1 0.95 0.72',
    border: '0.78 0.86 0.81',
    white: '1 1 1',
  }

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const lines: string[] = []
    const add = (text: string, size: number, x: number, y: number, font = 'F1', color = COLORS.ink) => {
      lines.push(`${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET`)
    }
    const rect = (x: number, y: number, w: number, h: number, fill: string) => lines.push(`${fill} rg ${x} ${y} ${w} ${h} re f`)
    const line = (x1: number, y1: number, x2: number, y2: number) => lines.push(`${COLORS.border} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`)

    rect(0, 0, 595, 842, COLORS.white)
    rect(0, 775, 595, 67, COLORS.paleGreen)
    add('BIZYBUK.IN', 20, 42, 812, 'F2', COLORS.green)
    add('PARTY LEDGER', 9, 43, 793, 'F2', COLORS.muted)
    add(`${data.partyName}  |  ${data.balanceType.toUpperCase()}`, 13, 330, 812, 'F2', COLORS.ink)

    rect(42, 716, 511, 45, COLORS.softGreen)
    add('PARTY', 8, 54, 746, 'F2', COLORS.green)
    add(data.partyName, 11, 54, 730, 'F2', COLORS.ink)
    if (data.partyPhone) add(data.partyPhone, 8, 54, 716, 'F1', COLORS.muted)
    add('PERIOD', 8, 350, 746, 'F2', COLORS.green)
    add(`${dateText(data.startDate)}${data.endDate ? ` to ${dateText(data.endDate)}` : ''}`, 9, 350, 730, 'F2', COLORS.ink)

    const summaryY = 665
    const summary = [
      ['OPENING BALANCE', money(data.openingBalance)],
      ['DEBIT', money(data.debitTotal)],
      ['CREDIT', money(data.creditTotal)],
      ['FINAL BALANCE', `${money(Math.abs(data.finalBalance))} ${data.balanceType}`],
    ]
    summary.forEach(([label, value], index) => {
      const x = 42 + index * 128
      const fill = index === 1 ? '0.99 0.94 0.94' : index === 2 ? '0.92 0.98 0.94' : index === 3 ? COLORS.yellow : COLORS.softGreen
      rect(x, summaryY - 48, 119, 42, fill)
      add(label, 6.8, x + 8, summaryY - 19, 'F2', COLORS.muted)
      add(value.slice(0, 22), 8.8, x + 8, summaryY - 35, 'F2', COLORS.ink)
    })

    const tableTop = 590
    rect(42, tableTop - 22, 511, 22, COLORS.tableGreen)
    add('DATE', 7.5, 48, tableTop - 15, 'F2', COLORS.green)
    add('DESCRIPTION', 7.5, 112, tableTop - 15, 'F2', COLORS.green)
    add('REFERENCE', 7.5, 292, tableTop - 15, 'F2', COLORS.green)
    add('DEBIT', 7.5, 365, tableTop - 15, 'F2', COLORS.green)
    add('CREDIT', 7.5, 425, tableTop - 15, 'F2', COLORS.green)
    add('BALANCE', 7.5, 482, tableTop - 15, 'F2', COLORS.green)

    let y = tableTop - 40
    const start = pageIndex * rowsPerPage
    const end = Math.min(data.entries.length, start + rowsPerPage)
    for (let i = start; i < end; i++) {
      const entry = data.entries[i]
      const desc = wrap(entry.description, 27)
      add(dateText(entry.date), 7.3, 48, y, 'F1', COLORS.ink)
      add(desc[0].slice(0, 27), 7.3, 112, y, 'F1', COLORS.ink)
      add(entry.reference || '—', 7.3, 292, y, 'F1', COLORS.muted)
      add(entry.debit ? money(entry.debit) : '—', 7.3, 365, y, 'F1', COLORS.ink)
      add(entry.credit ? money(entry.credit) : '—', 7.3, 425, y, 'F1', COLORS.green)
      add(`${money(Math.abs(entry.balance))} ${entry.balance < 0 ? 'Payable' : entry.balance > 0 ? 'Receivable' : ''}`.slice(0, 23), 7.1, 482, y, 'F2', COLORS.ink)
      line(42, y - 12, 553, y - 12)
      y -= desc.length > 1 ? 27 : 20
    }

    if (pageIndex === totalPages - 1) {
      y = Math.max(y - 8, 135)
      line(350, y + 12, 553, y + 12)
      add('OPENING', 8.5, 380, y - 3, 'F1', COLORS.muted)
      add(money(data.openingBalance), 8.5, 480, y - 3, 'F2', COLORS.ink)
      add('DEBIT', 8.5, 380, y - 20, 'F1', COLORS.muted)
      add(money(data.debitTotal), 8.5, 480, y - 20, 'F2', COLORS.ink)
      add('CREDIT', 8.5, 380, y - 37, 'F1', COLORS.muted)
      add(money(data.creditTotal), 8.5, 480, y - 37, 'F2', COLORS.green)
      rect(350, y - 77, 203, 26, COLORS.yellow)
      add('FINAL BALANCE', 9.5, 362, y - 68, 'F2', COLORS.green)
      add(`${money(Math.abs(data.finalBalance))} ${data.balanceType}`, 9.5, 462, y - 68, 'F2', COLORS.ink)
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

  pages.forEach((pageLines) => {
    contentObjectIds.push(objects.length + 1)
    const stream = pageLines.join('\n')
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
