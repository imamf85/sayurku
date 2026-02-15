import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Admin client to bypass RLS for admin checks
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Handle auth callback code from magic link (PKCE flow)
  const code = request.nextUrl.searchParams.get('code')
  if (code && pathname === '/') {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user is admin to redirect appropriately
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email) {
        const adminClient = getAdminClient()
        const { data: admin } = await adminClient
          .from('admins')
          .select('id')
          .ilike('email', user.email)
          .single()

        const redirectUrl = request.nextUrl.clone()
        redirectUrl.searchParams.delete('code')
        redirectUrl.pathname = admin ? '/admin' : '/'
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected user routes
  const protectedUserRoutes = [
    '/cart',
    '/checkout',
    '/orders',
    '/wishlist',
    '/profile',
    '/payment',
  ]

  const isProtectedUserRoute = protectedUserRoutes.some(
    (route) => pathname.startsWith(route)
  )

  if (isProtectedUserRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Admin routes protection
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!user?.email) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    const adminClient = getAdminClient()
    const { data: admin } = await adminClient
      .from('admins')
      .select('id, is_active')
      .ilike('email', user.email)
      .single()

    if (!admin || !admin.is_active) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users from login page
  if (pathname === '/login' && user) {
    const redirect = request.nextUrl.searchParams.get('redirect')
    const url = request.nextUrl.clone()
    url.pathname = redirect || '/'
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
