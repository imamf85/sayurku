import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirect = requestUrl.searchParams.get('redirect') || '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && redirect.startsWith('/admin')) {
      // Verify admin access for admin routes
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: admin } = await supabase
          .from('admins')
          .select('id, is_active')
          .eq('email', user.email || '')
          .single()

        if (!admin || !admin.is_active) {
          // Not an admin - sign out and redirect to login with error
          await supabase.auth.signOut()
          const loginUrl = new URL('/admin/login', requestUrl.origin)
          loginUrl.searchParams.set('error', 'not_admin')
          return NextResponse.redirect(loginUrl)
        }
      }
    }
  }

  return NextResponse.redirect(new URL(redirect, requestUrl.origin))
}
