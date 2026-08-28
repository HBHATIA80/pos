import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentSessionId } from '@/lib/auth/session-lock'

const CONCURRENT_LOGIN_ERROR = 'This login credential is already in use on another device. Please log out there before signing in here.'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const sessionId = await getCurrentSessionId(supabase)
  if (!sessionId) return NextResponse.json({ error: 'Unable to establish a secure login session.' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { force?: boolean }
  const { data: claimed, error } = await supabase.rpc(
    body.force ? 'force_takeover_active_login' : 'claim_active_login',
    { p_session_id: sessionId },
  )
  if (error) {
    console.error('session claim failed', error)
    return NextResponse.json({ error: 'Secure session protection is temporarily unavailable. Please try again.' }, { status: 503 })
  }

  if (!claimed) {
    return NextResponse.json({ error: CONCURRENT_LOGIN_ERROR, code: 'LOGIN_ALREADY_IN_USE' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, takeover: Boolean(body.force) })
}

export async function PATCH() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const sessionId = await getCurrentSessionId(supabase)
  if (!sessionId) return NextResponse.json({ error: 'Session expired.' }, { status: 401 })

  const { data: active, error } = await supabase.rpc('touch_active_login', { p_session_id: sessionId })
  if (error) {
    console.error('session heartbeat failed', error)
    return NextResponse.json({ error: 'Unable to verify the secure session.' }, { status: 503 })
  }

  if (!active) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    return NextResponse.json({ error: 'Session expired due to inactivity.', code: 'SESSION_TIMEOUT' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true })

  const sessionId = await getCurrentSessionId(supabase)
  if (sessionId) {
    const { error } = await supabase.rpc('release_active_login', { p_session_id: sessionId })
    if (error) console.error('session release failed', error)
  }

  return NextResponse.json({ ok: true })
}
