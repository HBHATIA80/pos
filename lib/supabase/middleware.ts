import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return response

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

  const { data: { user } } = await supabase.auth.getUser()

  // UI route guard. API routes have their own permission checks and are never
  // redirected by middleware.
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role,is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.is_active) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (profile.role === 'user') {
      const allowed = ['/dashboard/products', '/dashboard/orders']
      if (request.nextUrl.pathname === '/dashboard' || request.nextUrl.pathname === '/dashboard/') {
        return NextResponse.redirect(new URL('/dashboard/products', request.url))
      }
      if (!allowed.some((path) => request.nextUrl.pathname === path)) {
        return NextResponse.redirect(new URL('/dashboard/products', request.url))
      }
    }
  }

  return response
}
