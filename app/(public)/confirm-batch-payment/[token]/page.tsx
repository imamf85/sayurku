import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConfirmBatchPaymentClient } from './confirm-batch-payment-client'

interface ConfirmBatchPaymentPageProps {
  params: { token: string }
}

export default async function ConfirmBatchPaymentPage({ params }: ConfirmBatchPaymentPageProps) {
  const supabase = createAdminClient()

  // Get batch payment by token
  const { data: batchPayment } = await supabase
    .from('batch_payments')
    .select('*')
    .eq('confirmation_token', params.token)
    .single()

  if (!batchPayment) {
    notFound()
  }

  // Get orders details
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total,
      created_at,
      address_snapshot,
      delivery_date,
      delivery_slot,
      items:order_items(*)
    `)
    .in('id', batchPayment.order_ids)
    .order('created_at', { ascending: false })

  // Get customer info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', batchPayment.user_id)
    .single()

  const customerInfo = {
    name: profile?.full_name || 'Pelanggan',
    phone: profile?.phone || '',
  }

  return (
    <ConfirmBatchPaymentClient
      batchPayment={batchPayment}
      orders={orders || []}
      customerInfo={customerInfo}
      token={params.token}
    />
  )
}
