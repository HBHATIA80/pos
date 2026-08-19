import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin' || !profile.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const { data: permissions, error } = await supabase
    .from('permissions')
    .select('code, name, module, description, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ permissions: permissions ?? [] })
}
