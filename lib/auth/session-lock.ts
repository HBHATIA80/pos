type ClaimsClient = {
  auth: {
    getClaims: () => Promise<{ data: { claims: { session_id?: string } | null } }>
  }
}

export async function getCurrentSessionId(supabase: ClaimsClient) {
  const { data } = await supabase.auth.getClaims()
  return data.claims?.session_id ?? null
}
