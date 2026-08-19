import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const q = (params.get('q') || '').trim()
  const limit = Math.min(Math.max(Number(params.get('limit') || 30), 1), 50)

  let query = supabase
    .from('parties')
    .select('id, party_code, name, phone, alternate_phone, party_type, opening_balance, opening_balance_type, credit_limit')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(limit)

  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')
    query = query.or(`name.ilike.%${escaped}%,phone.ilike.%${escaped}%,party_code.ilike.%${escaped}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ parties: data || [] })
}
