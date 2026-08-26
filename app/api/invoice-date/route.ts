import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const COOKIE = 'bizbook_invoice_date'

function todayUtc() {
  return new Date().toISOString().slice(0, 10)
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export async function GET() {
  const store = await cookies()
  const value = store.get(COOKIE)?.value
  const date = value && validDate(value) && value <= todayUtc() ? value : todayUtc()
  return NextResponse.json({ date })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid invoice date') }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid invoice date' }, { status: 400 })

  const date = parsed.data.date
  if (!validDate(date)) return NextResponse.json({ error: 'Enter a valid invoice date' }, { status: 400 })
  if (date > todayUtc()) return NextResponse.json({ error: 'Invoice date cannot be in the future' }, { status: 400 })

  const response = NextResponse.json({ date })
  response.cookies.set(COOKIE, date, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
  return response
}
