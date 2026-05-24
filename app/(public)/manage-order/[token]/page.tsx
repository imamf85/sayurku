import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ManageOrderClient } from './manage-order-client'

interface ManageOrderPageProps {
  params: { token: string }
}

export default async function ManageOrderPage({ params }: ManageOrderPageProps) {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*),
      delivery_slot:delivery_slots(id, name)
    `)
    .eq('management_token', params.token)
    .single()

  if (!order) {
    notFound()
  }

  // Get customer info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', order.user_id)
    .single()

  const customerInfo = {
    name: profile?.full_name || 'Pelanggan',
    phone: profile?.phone || '',
  }

  return <ManageOrderClient order={order} customerInfo={customerInfo} token={params.token} />
}
