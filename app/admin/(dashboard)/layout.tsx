import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/admin/Sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('*')
    .eq('email', user.email)
    .eq('is_active', true)
    .single()

  if (!admin) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        adminName={admin.name}
        isSuperAdmin={admin.role === 'super_admin'}
      />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
