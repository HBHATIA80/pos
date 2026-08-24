import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const adjustmentSchema = z.object({
  product_id: z.string().uuid(),
  direction: z.enum(['in', 'out']),
  quantity: z.coerce.number().positive(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id,is_active,role')
    .eq('id', user.id)
    .maybeSingle()
  return { supabase, user, profile }
}

export async function GET() {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: products, error: productError }, { data: movements, error: movementError }] = await Promise.all([
    supabase
      .from('products')
      .select('id,sku,barcode,name,current_stock,reorder_level,is_active,catalog_units(short_name)')
      .eq('business_id', profile.business_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('stock_movements')
      .select('id,product_id,movement_type,quantity,reference_type,reference_id,notes,created_at,products(name,sku)')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })
      .limit(150),
  ])

  if (productError) return NextResponse.json({ error: productError.message }, { status: 400 })
  if (movementError) return NextResponse.json({ error: movementError.message }, { status: 400 })

  return NextResponse.json({ products: products ?? [], movements: movements ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getContext()
  if (!user || !profile?.is_active || !profile.business_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = adjustmentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid adjustment' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('adjust_stock', {
    payload: {
      product_id: parsed.data.product_id,
      direction: parsed.data.direction,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes || null,
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ movement: data }, { status: 201 })
}
