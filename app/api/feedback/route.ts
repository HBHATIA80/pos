import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ name: z.string().trim().min(1).max(120), role: z.string().trim().min(1).max(40), phone: z.string().trim().max(30).optional(), subject: z.string().trim().min(2).max(160), message: z.string().trim().min(5).max(3000) })
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please complete the form' }, { status: 400 })
  const { data: profile } = user ? await supabase.from('profiles').select('business_id').eq('id', user.id).maybeSingle() : { data: null }
  const { error } = await supabase.from('feedback_submissions').insert({ ...parsed.data, user_id: user?.id ?? null, business_id: profile?.business_id ?? null })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ message: 'Thanks. Your suggestion/question has been submitted to the BIZBook support team.' }, { status: 201 })
}
