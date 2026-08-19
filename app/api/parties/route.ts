import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const partyType = z.enum(['customer', 'supplier', 'both'])
const balanceType = z.enum(['none', 'receivable', 'payable'])

const partySchema = z.object({
  party_code: z.string().trim().max(40).optional().or(z.literal('')),
  party_type: partyType,
  name: z.string().trim().min(1).max(180),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  alternate_phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email().max(180).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  state: z.string().trim().max(100).optional().or(z.literal('')),
  postal_code: z.string().trim().max(20).optional().or(z.literal('')),
  opening_balance: z.coerce.number().min(0),
  opening_balance_type: balanceType,
  credit_limit: z.coerce.number().min(0),
  notes: z.string().trim().max(1500).optional().or(z.literal('')),
  is_active: z.boolean().optional(),
})

function clean(value?: string) {
  return value?.trim() || null
}

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, business_id, role, is_active')
    .eq('id', user.id)
    .maybeSingle()
  return { supabase, user, profile }
}

export async function GET() {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('parties')
    .select('id, party_code, party_type, name, phone, alternate_phone, email, address, city, state, postal_code, opening_balance, opening_balance_type, credit_limit, notes, is_active, created_at, updated_at')
    .eq('business_id', profile.business_id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ parties: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = partySchema.safeParse((await request.json().catch(() => null))?.data)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid party' }, { status: 400 })

  const data = parsed.data
  if (data.opening_balance > 0 && data.opening_balance_type === 'none') {
    return NextResponse.json({ error: 'Choose receivable or payable for a non-zero opening balance' }, { status: 400 })
  }

  const row = {
    business_id: profile.business_id,
    party_code: clean(data.party_code),
    party_type: data.party_type,
    name: data.name,
    phone: clean(data.phone),
    alternate_phone: clean(data.alternate_phone),
    email: clean(data.email),
    address: clean(data.address),
    city: clean(data.city),
    state: clean(data.state),
    postal_code: clean(data.postal_code),
    opening_balance: data.opening_balance,
    opening_balance_type: data.opening_balance_type,
    credit_limit: data.credit_limit,
    notes: clean(data.notes),
    is_active: data.is_active ?? true,
    created_by: user.id,
  }

  const { data: party, error } = await supabase.from('parties').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ party }, { status: 201 })
}

export async function PATCH(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const id = z.string().uuid().safeParse(body?.id)
  const parsed = partySchema.partial().safeParse(body?.data ?? {})
  if (!id.success || !parsed.success) return NextResponse.json({ error: parsed.success ? 'Invalid party id' : parsed.error.issues[0]?.message ?? 'Invalid party' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed.data)) updates[key] = typeof value === 'string' ? clean(value) : value

  if ('opening_balance' in updates && Number(updates.opening_balance) > 0 && updates.opening_balance_type === 'none') {
    return NextResponse.json({ error: 'Choose receivable or payable for a non-zero opening balance' }, { status: 400 })
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data: party, error } = await supabase
    .from('parties')
    .update(updates)
    .eq('id', id.data)
    .eq('business_id', profile.business_id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ party })
}
