import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

export async function GET() {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('expenses').select('*').eq('business_id', profile.business_id).order('expense_date', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ expenses: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const { data, error } = await supabase.rpc('create_expense', { payload: body })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ expense: data }, { status: 201 })
}
