import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const CUSTOMER_PORTAL_PATHS = ['/dashboard/orders', '/dashboard/my-ledger']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return response
  }

  const supabase = createServerClient(url, key, {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'user' && profile.is_active) {
    const pathname = request.nextUrl.pathname
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

  return response
}
