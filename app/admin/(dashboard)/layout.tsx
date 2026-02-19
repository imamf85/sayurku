import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/admin/Sidebar'
import { SessionMonitor } from '@/components/admin/SessionMonitor'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware already verified admin access, just get admin data for sidebar
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get admin info for sidebar (middleware already verified this user is admin)
  const adminClient = createAdminClient()
  const { data: admin } = await adminClient
    .from('admins')
    .select('name, role')
    .ilike('email', user?.email || '')
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <SessionMonitor />
      <Sidebar
        adminName={admin?.name || 'Admin'}
        isSuperAdmin={admin?.role === 'super_admin'}
      />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
