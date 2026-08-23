import { createBrowserClient } from '@supabase/ssr'

// The publishable/anon key is safe for browser use. Environment variables are
// preferred for local/managed deployments; the fallback keeps the public POS
// usable when Vercel has not yet been given the project variables.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sgymvcjvbmtgodzinxdz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_GIYTy0RkTg24mMx4PmswCw_e1n8fVEh'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
