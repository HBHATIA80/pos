import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  staff_profile_id: z.string().uuid(),
  payment_method: z.enum(['cash', 'bank']),
  amount: z.coerce.number().positive(),
  reference_no: z.string().trim().max(200).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  paid_at: z.string().datetime().optional(),
})

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('id,business_id,role,is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

export async function GET() {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id || profile.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const { data, error } = await supabase.from('profiles').select('id,full_name,phone,is_active,party_id').eq('business_id', profile.business_id).eq('role', 'staff').order('full_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ staff: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id || profile.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid salary payment' }, { status: 400 })
  const value = parsed.data
  const { data, error } = await supabase.rpc('record_staff_salary_payment', {
    p_staff_profile_id: value.staff_profile_id,
    p_payment_method: value.payment_method,
    p_amount: value.amount,
    p_reference_no: value.reference_no || null,
    p_notes: value.notes || null,
    p_paid_at: value.paid_at || new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message || 'Unable to save salary payment' }, { status: 400 })
  return NextResponse.json({ voucher: data, message: 'Salary payment recorded and staff ledger updated.' }, { status: 201 })
}
