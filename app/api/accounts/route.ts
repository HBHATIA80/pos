import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const accountSchema = z.object({
  account_group_id: z.string().uuid(),
  account_code: z.string().trim().max(40).optional().or(z.literal('')),
  name: z.string().trim().min(1).max(180),
  account_nature: z.enum(['asset','liability','income','expense','equity']),
  opening_balance: z.coerce.number().min(0).default(0),
  opening_balance_type: z.enum(['none','debit','credit']).default('none'),
  notes: z.string().trim().max(1500).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
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
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [{ data: groups, error: groupsError }, { data: accounts, error: accountsError }] = await Promise.all([
    supabase.from('account_groups').select('id,name,code,nature,parent_id,is_system,is_active').eq('business_id', profile.business_id).eq('is_active', true).order('name'),
    supabase.from('accounts').select('id,account_group_id,account_code,name,account_nature,party_id,opening_balance,opening_balance_type,is_party_account,is_system,is_active,notes').eq('business_id', profile.business_id).order('name'),
  ])
  if (groupsError) return NextResponse.json({ error: groupsError.message }, { status: 400 })
  if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 400 })
  return NextResponse.json({ groups: groups ?? [], accounts: accounts ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await context()
  if (!user || !profile?.is_active || !profile.business_id || profile.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const parsed = accountSchema.safeParse((await request.json().catch(() => null))?.data)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid account' }, { status: 400 })
  const data = parsed.data
  if (data.opening_balance > 0 && data.opening_balance_type === 'none') return NextResponse.json({ error: 'Choose debit or credit for a non-zero opening balance' }, { status: 400 })
  const { data: group } = await supabase.from('account_groups').select('id,nature').eq('id', data.account_group_id).eq('business_id', profile.business_id).maybeSingle()
  if (!group) return NextResponse.json({ error: 'Invalid account group' }, { status: 400 })
  if (group.nature !== data.account_nature) return NextResponse.json({ error: 'Account nature must match its group' }, { status: 400 })
  const { data: account, error } = await supabase.from('accounts').insert({ business_id: profile.business_id, account_group_id: data.account_group_id, account_code: data.account_code?.trim() || null, name: data.name, account_nature: data.account_nature, opening_balance: data.opening_balance, opening_balance_type: data.opening_balance_type, notes: data.notes?.trim() || null, is_active: data.is_active, created_by: user.id }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ account }, { status: 201 })
}