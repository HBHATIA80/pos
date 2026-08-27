type ClaimsClient = {
  auth: {
    getClaims: (...args: unknown[]) => Promise<{
      data: { claims: { session_id?: string } | null } | null
    }>
  }
}

export async function getCurrentSessionId(supabase: ClaimsClient) {
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.session_id ?? null
}
