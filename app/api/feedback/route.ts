import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ name: z.string().trim().min(1).max(120), role: z.string().trim().min(1).max(40), phone: z.string().trim().max(30).optional(), subject: z.string().trim().min(2).max(160), message: z.string().trim().min(5).max(3000) })

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('feedback_submissions').select('id,subject,message,status,admin_reply,created_at,updated_at,last_message_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ submissions: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in before submitting a support request.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please complete the form' }, { status: 400 })
  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).maybeSingle()
  const now = new Date().toISOString()
  const { data: submission, error } = await supabase.from('feedback_submissions').insert({ ...parsed.data, user_id: user.id, business_id: profile?.business_id ?? null, status: 'open', last_message_at: now, updated_at: now }).select('id,subject,message,status,created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ message: 'Your request has been sent to the BIZBook Super Admin support queue.', submission }, { status: 201 })
}
