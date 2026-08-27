type SessionClaims = { session_id?: string }

function decodeAccessToken(accessToken: string): SessionClaims | null {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionClaims
  } catch {
    return null
  }
}

export async function getCurrentSessionId(supabase: { auth: { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> } }) {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ? decodeAccessToken(data.session.access_token)?.session_id ?? null : null
}
