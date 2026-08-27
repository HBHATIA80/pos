import { createBrowserClient } from '@supabase/ssr'

// The publishable/anon key is safe for browser use. Environment variables are
// preferred for local/managed deployments; the fallback keeps the public POS
// usable when Vercel has not yet been given the project variables.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sgymvcjvbmtgodzinxdz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_GIYTy0RkTg24mMx4PmswCw_e1n8fVEh'

export function createClient() {
  const client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const signOut = client.auth.signOut.bind(client.auth)

  // Centralize lock release so every existing logout/signOut call across the
  // platform also releases the BIZYBUK.IN single-device login lock.
  client.auth.signOut = async (options) => {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
      keepalive: true,
    }).catch(() => undefined)
    return signOut(options)
  }

  return client
}
