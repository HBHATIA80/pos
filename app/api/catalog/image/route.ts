import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id,role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active || !profile.business_id || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only active admin or staff can upload product images.' }, { status: 403 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG or WebP images.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be 5 MB or smaller.' }, { status: 400 })

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
  const path = `${profile.business_id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message || 'Unable to upload image.' }, { status: 400 })

  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, path }, { status: 201 })
}
