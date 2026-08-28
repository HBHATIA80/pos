import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const SUPER_ADMIN_TABLE = 'platform_super_admins'
const LANDING_ASSET_KEY = 'shop-owner'
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

async function requireSuperAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required.', status: 401 as const, supabase }

  const { data: access, error } = await supabase
    .from(SUPER_ADMIN_TABLE)
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !access) return { error: 'Super admin access required.', status: 403 as const, supabase }
  return { user, supabase }
}

export async function GET() {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { data, error } = await auth.supabase.rpc('get_platform_control_center')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load platform analytics.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const action = body?.action
  const targetId = body?.targetId

  if (!['activate_shop', 'deactivate_shop', 'activate_user', 'deactivate_user'].includes(action) || typeof targetId !== 'string') {
    return NextResponse.json({ error: 'Invalid control action.' }, { status: 400 })
  }

  try {
    const { data, error } = await auth.supabase.rpc('control_platform_entity', {
      p_action: action,
      p_target_id: targetId,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to apply control action.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const form = await request.formData()
    const file = form.get('image')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Please select an image.' }, { status: 400 })
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: 'Only PNG, JPEG or WebP images are supported.' }, { status: 400 })
    if (file.size === 0) return NextResponse.json({ error: 'The selected image is empty.' }, { status: 400 })
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image must be 8 MB or smaller.' }, { status: 400 })

    const bytes = Buffer.from(await file.arrayBuffer())
    const base64 = bytes.toString('base64')

    // Do not write landing_assets directly through the user's RLS context.
    // The table intentionally has no client INSERT/UPDATE policy. The RPC
    // performs the same super-admin check again inside a SECURITY DEFINER
    // transaction, so the write cannot silently become a zero-row update.
    const { data: assetId, error: saveError } = await auth.supabase.rpc('set_landing_asset', {
      p_asset_key: LANDING_ASSET_KEY,
      p_mime_type: file.type,
      p_data_base64: base64,
    })

    if (saveError) {
      console.error('set_landing_asset failed', saveError)
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    const { data: saved, error: verifyError } = await auth.supabase
      .from('landing_assets')
      .select('id,mime_type,updated_at')
      .eq('asset_key', LANDING_ASSET_KEY)
      .maybeSingle()

    if (verifyError || !saved || saved.id !== assetId) {
      console.error('Homepage image verification failed', verifyError)
      return NextResponse.json({ error: 'Image was saved but could not be verified. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Homepage image published successfully.',
      assetUrl: `/api/landing-assets/${LANDING_ASSET_KEY}?v=${encodeURIComponent(saved.updated_at)}`,
      updatedAt: saved.updated_at,
      mimeType: saved.mime_type,
    })
  } catch (error) {
    console.error('Homepage image upload failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update homepage image.' }, { status: 500 })
  }
}
