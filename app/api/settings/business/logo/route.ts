import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
])
const MAX_BYTES = 2 * 1024 * 1024

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, business_id').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'admin' || !profile.business_id) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('logo')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Please select a logo image.' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Logo must be PNG, JPG or WebP.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Logo must be 2 MB or smaller.' }, { status: 400 })

  const extension = ALLOWED_TYPES.get(file.type)!
  const path = `${profile.business_id}/branding/logo-${Date.now()}-${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })

  const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(path)
  const logoUrl = publicData.publicUrl
  const { error: updateError } = await supabase.from('businesses').update({ logo_url: logoUrl }).eq('id', profile.business_id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  return NextResponse.json({ logoUrl })
}
