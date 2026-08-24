import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ feedback_id: z.string().uuid(), body: z.string().trim().min(1).max(5000) })

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const feedbackId = z.string().uuid().safeParse(url.searchParams.get('feedback_id'))
  if (!feedbackId.success) return NextResponse.json({ error: 'feedback_id is required' }, { status: 400 })
  const { data, error } = await supabase.from('feedback_messages').select('id,feedback_id,sender_id,sender_role,body,created_at').eq('feedback_id', feedbackId.data).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid message' }, { status: 400 })
  const { data, error } = await supabase.rpc('send_feedback_message', { p_feedback_id: parsed.data.feedback_id, p_body: parsed.data.body })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ message: data }, { status: 201 })
}
