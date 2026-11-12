import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AdminSession {
  id: string
  email: string
  role: 'super_admin' | 'admin'
}

/** Verifikasi pemanggil adalah admin aktif. Return null bila bukan. */
export async function verifyAdmin(): Promise<AdminSession | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data: admin } = await createAdminClient()
    .from('admins')
    .select('id, role')
    .ilike('email', user.email)
    .eq('is_active', true)
    .single()

  return admin ? { id: admin.id, email: user.email, role: admin.role } : null
}
