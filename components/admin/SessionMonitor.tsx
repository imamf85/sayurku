'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

const SESSION_CHECK_INTERVAL = 60000 // Check every 1 minute
const SESSION_TIMEOUT_MS = 1200000 // 20 minutes in milliseconds

export function SessionMonitor() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSessionExpired = useCallback(() => {
    toast({
      title: 'Sesi berakhir',
      description: 'Silakan login kembali',
      variant: 'destructive',
    })

    // Small delay to show toast before redirect
    setTimeout(() => {
      router.push('/admin/login?expired=1')
    }, 500)
  }, [router, toast])

  const checkSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        handleSessionExpired()
        return
      }

      // Check session age
      const lastSignIn = new Date(session.user.last_sign_in_at || session.user.created_at).getTime()
      const now = Date.now()
      const sessionAge = now - lastSignIn

      if (sessionAge > SESSION_TIMEOUT_MS) {
        await supabase.auth.signOut()
        handleSessionExpired()
      }
    } catch (error) {
      console.error('Session check error:', error)
    }
  }, [supabase, handleSessionExpired])

  useEffect(() => {
    // Initial check
    checkSession()

    // Periodic check
    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        handleSessionExpired()
      }
    })

    // Check on window focus (user comes back to tab)
    const handleFocus = () => {
      checkSession()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkSession, handleSessionExpired, supabase.auth])

  // This component doesn't render anything
  return null
}
