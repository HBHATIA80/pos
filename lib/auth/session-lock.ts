import type { SupabaseClient } from '@supabase/supabase-js'

export async function getCurrentSessionId(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims as { session_id?: string } | undefined
  return claims?.session_id ?? null
}
