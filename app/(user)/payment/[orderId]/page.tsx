import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { PaymentClient } from './payment-client'

interface PaymentPageProps {
  params: { orderId: string }
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', params.orderId)
    .eq('user_id', user.id)
    .single()

  if (!order) {
    notFound()
  }

  return <PaymentClient order={order} />
}
