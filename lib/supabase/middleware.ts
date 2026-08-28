import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentSessionId } from '@/lib/auth/session-lock'

const CUSTOMER_PORTAL_PATHS = ['/dashboard/orders', '/dashboard/my-ledger']
const PUBLIC_PATHS = ['/', '/login', '/signup', '/customer-signup', '/forgot-password', '/marketplace']

// Keep middleware aligned with the server/browser clients when Vercel project
// variables are missing. Environment variables still take precedence.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sgymvcjvbmtgodzinxdz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_GIYTy0RkTg24mMx4PmswCw_e1n8fVEh'

function isPublicPath(pathname: string) {
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') return true
  if (pathname.startsWith('/api/auth/session') || pathname.startsWith('/api/marketplace')) return true
  return PUBLIC_PATHS.some((path) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)))
}

function loginRedirect(request: NextRequest, reason = 'login_in_use') {
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/login'
  redirectUrl.search = `?error=${reason}`
  return NextResponse.redirect(redirectUrl)
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return response
  }

  // Enforce the BIZYBUK.IN one-device rule for every authenticated page and
  // protected API. Public marketplace/auth routes intentionally remain public.
  if (!isPublicPath(request.nextUrl.pathname)) {
    const sessionId = await getCurrentSessionId(supabase)
    if (!sessionId) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
      return loginRedirect(request, 'session_timeout')
    }

    // Never revive a stale session here. Fresh logins use claim_active_login;
    // normal requests only touch an already-active lock.
    const { data: active, error: touchError } = await supabase.rpc('touch_active_login', {
      p_session_id: sessionId,
    })

    if (touchError || !active) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
      return loginRedirect(request, 'session_timeout')
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  const pathname = request.nextUrl.pathname

  // API routes perform their own authentication/authorization and must never
  // be redirected to a customer portal page. Redirecting an API GET causes
  // fetch() to follow the 307 and parse the HTML page as JSON.
  if (pathname.startsWith('/api/')) {
    return response
  }

  if (profile?.role === 'user' && profile.is_active) {
    const isCustomerPortalPath = CUSTOMER_PORTAL_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )

    if (!isCustomerPortalPath) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard/orders'
      redirectUrl.search = ''
      return NextResponse.redirect(redirectUrl)
    }
  }

  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
