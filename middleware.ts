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

  // Only get user for protected routes
  const { data: { user } } = await supabase.auth.getUser()

  // Protected user routes
  const protectedUserRoutes = ['/cart', '/checkout', '/orders', '/wishlist', '/profile', '/payment']
  const isProtectedUserRoute = protectedUserRoutes.some(route => pathname.startsWith(route))

  if (isProtectedUserRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
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
