import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const SESSION_TIMEOUT_SECONDS = 1200

// Admin client to bypass RLS for admin checks
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Public routes that don't need auth check
const publicRoutes = ['/', '/product', '/category', '/search', '/login', '/admin/login']

function isPublicRoute(pathname: string) {
  return publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip auth check entirely for public routes (faster!)
  if (isPublicRoute(pathname) && !pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get session and user
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  // Check session timeout
  if (session) {
    const sessionCreatedAt = new Date(session.user.last_sign_in_at || session.user.created_at).getTime()
    const now = Date.now()
    const sessionAge = (now - sessionCreatedAt) / 1000

    if (sessionAge > SESSION_TIMEOUT_SECONDS) {
      // Session expired - sign out and redirect to login
      await supabase.auth.signOut()

      const protectedRoutes = ['/cart', '/checkout', '/orders', '/wishlist', '/profile', '/payment', '/admin']
      const isProtected = protectedRoutes.some(route => pathname.startsWith(route))

      if (isProtected) {
        const url = request.nextUrl.clone()
        url.pathname = pathname.startsWith('/admin') ? '/admin/login' : '/login'
        url.searchParams.set('redirect', pathname)
        url.searchParams.set('expired', '1')
        return NextResponse.redirect(url)
      }
    }
  }

  // Protected user routes
  const protectedUserRoutes = ['/cart', '/checkout', '/orders', '/wishlist', '/profile', '/payment']
  const isProtectedUserRoute = protectedUserRoutes.some(route => pathname.startsWith(route))

  if (isProtectedUserRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Auto-create profile if user exists but profile doesn't
  if (user && isProtectedUserRoute) {
    const adminClient = getAdminClient()

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Extract phone from email or metadata
      const phone = user.user_metadata?.phone ||
        (user.email?.endsWith('@whatsapp.sayurku.local')
          ? user.email.replace('@whatsapp.sayurku.local', '')
          : null)

      await adminClient.from('profiles').insert({
        id: user.id,
        phone: phone,
        full_name: user.user_metadata?.full_name || null,
      })
    }
  }

  // Admin routes protection
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!user?.email) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const adminClient = getAdminClient()
    const { data: admin } = await adminClient
      .from('admins')
      .select('id, is_active')
      .ilike('email', user.email)
      .single()

    if (!admin || !admin.is_active) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Redirect logged-in users from login page
  if (pathname === '/login' && user) {
    const redirect = request.nextUrl.searchParams.get('redirect') || '/'
    return NextResponse.redirect(new URL(redirect, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
