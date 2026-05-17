import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConfirmPaymentClient } from './confirm-client'

interface ConfirmPaymentPageProps {
  params: { token: string }
}

export default async function ConfirmPaymentPage({ params }: ConfirmPaymentPageProps) {
  const supabase = createAdminClient()

  // Find order by payment token
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total,
      payment_method,
      payment_proof_url,
      payment_token,
      created_at,
      address_snapshot,
      items:order_items(
        id,
        quantity,
        subtotal,
        product_snapshot
      )
    `)
    .eq('payment_token', params.token)
    .single()

  if (error || !order) {
    notFound()
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('orders')
    .select('user_id')
    .eq('id', order.id)
    .single()

  let customerInfo = { name: 'Pelanggan', phone: '' }

  if (profile?.user_id) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', profile.user_id)
      .single()

    if (userProfile) {
      customerInfo = {
        name: userProfile.full_name || 'Pelanggan',
        phone: userProfile.phone || '',
      }
    }
  }

  return (
    <ConfirmPaymentClient
      order={order}
      customerInfo={customerInfo}
      token={params.token}
    />
  )
}
