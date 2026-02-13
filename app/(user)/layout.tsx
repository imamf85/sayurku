import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/user/Navbar'
import { BottomNav } from '@/components/user/BottomNav'

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let cartCount = 0
  if (user) {
    const { count } = await supabase
      .from('cart_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    cartCount = count || 0
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Navbar cartCount={cartCount} />
      <main>{children}</main>
      <BottomNav />
    </div>
  )
}
