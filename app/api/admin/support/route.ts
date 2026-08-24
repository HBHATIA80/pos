import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isSuperAdminPhone(phone: string | null) {
  return (phone ?? '').replace(/\D/g, '').endsWith('9996609399')
}

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,phone,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

export async function GET() {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || profile.role !== 'admin' || !isSuperAdminPhone(profile.phone)) return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
  const { data, error } = await supabase.from('feedback_submissions').select('id,business_id,user_id,sender_name,sender_role,sender_phone,subject,message,status,admin_reply,created_at,updated_at,last_message_at').order('last_message_at', { ascending: false, nullsFirst: false }).limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ submissions: data ?? [] })
}
