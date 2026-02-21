import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
          return fetch(url, {
            ...options,
            cache: 'no-store',
          })
        }
      }
    }
  )
}
