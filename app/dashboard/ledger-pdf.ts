export type LedgerPdfEntry = {
  date: string
  description: string
  reference: string
  debit: number
  credit: number
  balance: number
}

export type LedgerPdfBill = {
  invoice_no: string
  invoice_date: string
  bill_amount: number
  paid_amount: number
  balance_amount: number
  payment_date: string | null
  days_past: number
  status: 'paid' | 'partial' | 'unpaid'
}

export type LedgerPdfData = {
  businessName?: string | null
  businessCode?: string | null
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
  billWise?: LedgerPdfBill[]
}

const ascii = (value: string) => String(value ?? '')
  .replace(/₹/g, 'Rs. ')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\u00A0/g, ' ')
  .normalize('NFKD')
  .replace(/[^\x20-\x7E]/g, '')

const esc = (value: string) => ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

const money = (value: number) => `Rs. ${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`

function dateText(value: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${day} ${months[Math.max(0, Math.min(11, Number(month) - 1))]} ${year}`
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ascii(value)
  return `${String(parsed.getDate()).padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parsed.getMonth()]} ${parsed.getFullYear()}`
}

function wrap(text: string, max: number) {
  const words = ascii(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (word.length > max) {
      if (current) {
        lines.push(current)
        current = ''
      }
      for (let i = 0; i < word.length; i += max) lines.push(word.slice(i, i + max))
      continue
    }
    const next = current ? `${current} ${word}` : word
    if (next.length > max && current) {
      lines.push(current)
      current = word
    } else current = next
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

function balanceStatementLabel(data: LedgerPdfData) {
  const shop = ascii(data.businessName || 'Shop')
  if (data.balanceType === 'receivable') return `Payable To ${shop}`
  if (data.balanceType === 'payable') return `Payable By ${shop}`
  return 'Account Settled'
}

export function buildLedgerPdf(data: LedgerPdfData): Blob {
  const billWise = data.billWise ?? []
  const billPages = chunk(billWise, 9)
  const ledgerPages = chunk(data.entries, 20)
  const sections: Array<{ kind: 'bill' | 'ledger'; rows: LedgerPdfBill[] | LedgerPdfEntry[] }> = []
  billPages.forEach((rows) => sections.push({ kind: 'bill', rows }))
  ledgerPages.forEach((rows) => sections.push({ kind: 'ledger', rows }))
  if (!sections.length) sections.push({ kind: 'ledger', rows: [] })

  const pages: string[][] = []
  const COLORS = {
    ink: '0.08 0.14 0.11',
    muted: '0.28 0.38 0.33',
    green: '0.06 0.47 0.22',
    paleGreen: '0.92 0.98 0.94',
    softGreen: '0.96 0.99 0.97',
    tableGreen: '0.93 0.97 0.94',
    yellow: '1 0.95 0.72',
    redSoft: '0.99 0.94 0.94',
    border: '0.78 0.86 0.81',
    white: '1 1 1',
  }

  sections.forEach((section, pageIndex) => {
    const lines: string[] = []
    const add = (text: string, size: number, x: number, y: number, font = 'F1', color = COLORS.ink) => {
      lines.push(`${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET`)
    }
    const rect = (x: number, y: number, w: number, h: number, fill: string) => lines.push(`${fill} rg ${x} ${y} ${w} ${h} re f`)
    const line = (x1: number, y1: number, x2: number, y2: number) => lines.push(`${COLORS.border} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`)

    rect(0, 0, 595, 842, COLORS.white)
    rect(0, 775, 595, 67, COLORS.paleGreen)
    add(ascii(data.businessName || 'BIZYBUK.IN'), 18, 42, 812, 'F2', COLORS.green)
    add('PARTY LEDGER', 8.5, 43, 793, 'F2', COLORS.muted)
    add(data.balanceType === 'receivable' ? 'RECEIVABLE' : data.balanceType === 'payable' ? 'PAYABLE' : 'SETTLED', 9.5, 470, 812, 'F2', COLORS.ink)

    // Fixed-width header columns prevent long party names from overwriting the period.
    rect(42, 696, 511, 65, COLORS.softGreen)
    add('SHOP', 7.2, 54, 746, 'F2', COLORS.green)
    const shopLines = wrap(ascii(data.businessName || 'BIZYBUK.IN'), 25).slice(0, 2)
    shopLines.forEach((value, index) => add(value, 9.2, 54, 730 - index * 13, 'F2', COLORS.ink))
    if (data.businessCode) add(`Shop Code: ${ascii(data.businessCode)}`, 6.9, 54, 702, 'F1', COLORS.muted)

    add('PARTY', 7.2, 270, 746, 'F2', COLORS.green)
    const partyLines = wrap(ascii(data.partyName), 22).slice(0, 2)
    partyLines.forEach((value, index) => add(value, 9.2, 270, 730 - index * 13, 'F2', COLORS.ink))
    if (data.partyPhone) add(ascii(data.partyPhone), 6.9, 270, 702, 'F1', COLORS.muted)
    else if (data.partyCode) add(`Party Code: ${ascii(data.partyCode)}`, 6.7, 270, 702, 'F1', COLORS.muted)

    add('LEDGER PERIOD', 7.2, 435, 746, 'F2', COLORS.green)
    const periodLines = wrap(`${dateText(data.startDate)} to ${dateText(data.endDate || data.startDate)}`, 18).slice(0, 2)
    periodLines.forEach((value, index) => add(value, 7.1, 435, 730 - index * 13, 'F2', COLORS.ink))
    if (data.partyCode && data.partyPhone) add(`Party Code: ${ascii(data.partyCode)}`, 6.6, 435, 702, 'F1', COLORS.muted)

    let y = 678
    if (pageIndex === 0) {
      const summary = [
        ['OPENING', money(data.openingBalance)],
        ['DEBIT', money(data.debitTotal)],
        ['CREDIT', money(data.creditTotal)],
        ['CURRENT BALANCE', money(Math.abs(data.finalBalance))],
      ]
      summary.forEach(([label, value], index) => {
        const x = 42 + index * 128
        const fill = index === 1 ? COLORS.redSoft : index === 2 ? COLORS.paleGreen : index === 3 ? COLORS.yellow : COLORS.softGreen
        rect(x, y - 45, 119, 40, fill)
        add(label, 6.2, x + 7, y - 17, 'F2', COLORS.muted)
        add(value, 7.5, x + 7, y - 32, 'F2', COLORS.ink)
      })
      y -= 62
    }

    if (section.kind === 'bill') {
      rect(42, y - 23, 511, 23, COLORS.tableGreen)
      add('BILL-WISE PAYMENT AGEING', 8.2, 48, y - 15, 'F2', COLORS.green)
      add('BILL DATE', 6.8, 48, y - 37, 'F2', COLORS.green)
      add('BILL NO.', 6.8, 110, y - 37, 'F2', COLORS.green)
      add('AMOUNT', 6.8, 190, y - 37, 'F2', COLORS.green)
      add('PAID', 6.8, 260, y - 37, 'F2', COLORS.green)
      add('BALANCE', 6.8, 320, y - 37, 'F2', COLORS.green)
      add('PAYMENT DATE', 6.8, 385, y - 37, 'F2', COLORS.green)
      add('DAYS', 6.8, 478, y - 37, 'F2', COLORS.green)
      y -= 55
      ;(section.rows as LedgerPdfBill[]).forEach((bill) => {
        add(dateText(bill.invoice_date), 7.2, 48, y, 'F1', COLORS.ink)
        add(ascii(bill.invoice_no).slice(0, 14), 7.2, 110, y, 'F2', COLORS.green)
        add(money(bill.bill_amount), 7.1, 190, y, 'F1', COLORS.ink)
        add(money(bill.paid_amount), 7.1, 260, y, 'F1', COLORS.green)
        add(money(bill.balance_amount), 7.1, 320, y, 'F1', COLORS.ink)
        add(bill.payment_date ? dateText(bill.payment_date) : '-', 7.1, 385, y, 'F1', COLORS.muted)
        add(`${bill.days_past} d`, 7.1, 478, y, 'F2', COLORS.ink)
        add(bill.status.toUpperCase(), 6.4, 515, y, 'F2', bill.status === 'paid' ? COLORS.green : bill.status === 'partial' ? '0.54 0.39 0.00' : '0.60 0.18 0.18')
        line(42, y - 10, 553, y - 10)
        y -= 22
      })
      add('Paid bills show days from bill date to the last payment; unpaid/partial bills show outstanding days as of the period end.', 6.5, 48, Math.max(y - 5, 90), 'F1', COLORS.muted)
    } else {
      rect(42, y - 23, 511, 23, COLORS.tableGreen)
      add('LEDGER ENTRIES', 8.2, 48, y - 15, 'F2', COLORS.green)
      add('DATE', 7.2, 48, y - 36, 'F2', COLORS.green)
      add('DESCRIPTION', 7.2, 112, y - 36, 'F2', COLORS.green)
      add('REFERENCE', 7.2, 292, y - 36, 'F2', COLORS.green)
      add('DEBIT', 7.2, 365, y - 36, 'F2', COLORS.green)
      add('CREDIT', 7.2, 425, y - 36, 'F2', COLORS.green)
      add('BALANCE', 7.2, 482, y - 36, 'F2', COLORS.green)
      y -= 54
      ;(section.rows as LedgerPdfEntry[]).forEach((entry) => {
        const desc = wrap(entry.description, 26)
        add(dateText(entry.date), 7.1, 48, y, 'F1', COLORS.ink)
        add(desc[0].slice(0, 26), 7.1, 112, y, 'F1', COLORS.ink)
        add(ascii(entry.reference || '-').slice(0, 13), 7.1, 292, y, 'F1', COLORS.muted)
        add(entry.debit ? money(entry.debit) : '-', 7.1, 365, y, 'F1', COLORS.ink)
        add(entry.credit ? money(entry.credit) : '-', 7.1, 425, y, 'F1', COLORS.green)
        const balanceLabel = entry.balance < 0 ? 'Payable' : entry.balance > 0 ? 'Receivable' : 'Settled'
        add(`${money(Math.abs(entry.balance))} ${balanceLabel}`, 6.9, 482, y, 'F2', COLORS.ink)
        line(42, y - 11, 553, y - 11)
        y -= desc.length > 1 ? 27 : 20
      })

      if (pageIndex === sections.length - 1) {
        y = Math.max(y - 6, 145)
        line(350, y + 12, 553, y + 12)
        add('OPENING', 8.2, 380, y - 3, 'F1', COLORS.muted)
        add(money(data.openingBalance), 8.2, 480, y - 3, 'F2', COLORS.ink)
        add('DEBIT', 8.2, 380, y - 20, 'F1', COLORS.muted)
        add(money(data.debitTotal), 8.2, 480, y - 20, 'F2', COLORS.ink)
        add('CREDIT', 8.2, 380, y - 37, 'F1', COLORS.muted)
        add(money(data.creditTotal), 8.2, 480, y - 37, 'F2', COLORS.green)

        const statement = balanceStatementLabel(data)
        const statementLines = wrap(statement, 26).slice(0, 2)
        rect(350, y - (statementLines.length > 1 ? 91 : 77), 203, statementLines.length > 1 ? 40 : 26, COLORS.yellow)
        statementLines.forEach((value, index) => add(value, 7.8, 362, y - 68 - index * 11, 'F2', COLORS.green))
        add(money(Math.abs(data.finalBalance)), 8.7, 465, y - (statementLines.length > 1 ? 80 : 68), 'F2', COLORS.ink)
      }
    }

    if (pageIndex === sections.length - 1) {
      const footerY = 64
      rect(42, footerY, 511, 43, COLORS.softGreen)
      add('CUSTOMER ACCOUNT', 7.2, 52, footerY + 29, 'F2', COLORS.green)
      const footer = data.businessCode
        ? `Don't have a BIZYBUK.IN account? Use Shop Code ${ascii(data.businessCode)} to create your customer account today and connect with ${ascii(data.businessName || 'the shop')}.`
        : `Don't have a BIZYBUK.IN account? Visit BIZYBUK.IN to create your customer account and connect with this shop.`
      const footerLines = wrap(footer, 104)
      add(footerLines[0], 6.8, 52, footerY + 16, 'F1', COLORS.muted)
      if (footerLines[1]) add(footerLines[1], 6.8, 52, footerY + 7, 'F1', COLORS.muted)
    }

    add(`Page ${pageIndex + 1} of ${sections.length}`, 7.2, 485, 28, 'F1', COLORS.muted)
    pages.push(lines)
  })

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
