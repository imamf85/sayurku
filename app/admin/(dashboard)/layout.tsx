import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/admin/Sidebar'
import { SessionMonitor } from '@/components/admin/SessionMonitor'

async function getAdminInfo(): Promise<{ name: string; role: string }> {
  // Middleware sudah memverifikasi admin dan meneruskan datanya lewat header
  const h = headers()
  const role = h.get('x-admin-role')
  if (role) {
    return { name: decodeURIComponent(h.get('x-admin-name') || '') || 'Admin', role }
  }

  // Fallback jika header tidak ada
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminClient = createAdminClient()
  const { data: admin } = await adminClient
    .from('admins')
    .select('name, role')
    .ilike('email', user?.email || '')
    .single()
  return { name: admin?.name || 'Admin', role: admin?.role || '' }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdminInfo()

  return (
    <div className="min-h-screen bg-gray-50">
      <SessionMonitor />
      <Sidebar adminName={admin.name} isSuperAdmin={admin.role === 'super_admin'} />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
