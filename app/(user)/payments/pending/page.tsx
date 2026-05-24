import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PendingPaymentsClient } from './pending-payments-client'

export default async function PendingPaymentsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/payments/pending')
  }

  // Fetch all pending payment orders
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: false })

  if (!orders || orders.length === 0) {
    redirect('/')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single()

  return (
    <PendingPaymentsClient
      orders={orders}
      userInfo={{
        name: profile?.full_name || '',
        phone: profile?.phone || '',
      }}
    />
  )
}
