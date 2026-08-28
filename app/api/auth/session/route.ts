import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Session endpoint kept for backwards compatibility with the login client.
 *
 * The previous implementation enforced a single-device active-login lock and
 * expired that lock after inactivity. That behavior caused legitimate logins
 * to be rejected when another browser/device still had a stale session.
 *
 * Login/session ownership is now handled by Supabase Auth itself. This route
 * intentionally does not claim, lock, expire, or release an application-level
 * active-login record.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * Backwards-compatible no-op for clients that still call the old release
 * endpoint during logout.
 */
export async function DELETE() {
  return NextResponse.json({ ok: true })
}
