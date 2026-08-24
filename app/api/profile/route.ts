import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error } = await supabase.from('profiles').select('id,full_name,phone,role,business_id,is_active').eq('id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!profile?.is_active) return NextResponse.json({ error: 'Inactive account' }, { status: 403 })

  let business: { id: string; name: string; code: string | null } | null = null
  if (profile.business_id) {
    const { data } = await supabase.from('businesses').select('id,name,code').eq('id', profile.business_id).maybeSingle()
    business = data ?? null
  }
  return NextResponse.json({ profile, business })
}
