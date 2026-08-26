import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAdminBusiness() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role, business_id').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'admin' || !profile.business_id) return { supabase, error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  return { supabase, businessId: profile.business_id }
}

export async function GET() {
  const result = await getAdminBusiness()
  if (result.error) return result.error
  const { data, error } = await result.supabase.from('businesses').select('id, name, code, phone, address').eq('id', result.businessId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ business: data })
}

export async function PATCH(request: Request) {
  const result = await getAdminBusiness()
  if (result.error) return result.error
  const body = await request.json().catch(() => null) as { name?: string; code?: string | null; phone?: string | null; address?: string | null } | null
  const name = body?.name?.trim() || ''
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: 'Business name must be between 2 and 120 characters.' }, { status: 400 })
  const { data, error } = await result.supabase.from('businesses').update({ name, code: body?.code?.trim() || null, phone: body?.phone?.trim() || null, address: body?.address?.trim() || null }).eq('id', result.businessId).select('id, name, code, phone, address').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ business: data })
}
