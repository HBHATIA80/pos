import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const SUPER_ADMIN_TABLE = 'platform_super_admins'

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
