import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { PaymentButton } from './payment-button'

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

  if (order.status !== 'pending_payment') {
    redirect(`/orders/${order.id}`)
  }

  return (
    <div className="container px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">Menunggu Pembayaran</h1>
          <p className="text-sm text-gray-500 mt-1">
            Selesaikan pembayaran sebelum batas waktu
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-500">Total Pembayaran</p>
          <p className="text-3xl font-bold text-green-600">
            {formatPrice(order.total)}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-2">Detail Pesanan</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">No. Pesanan</span>
              <span className="font-medium">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span>{formatDateTime(order.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jumlah Item</span>
              <span>{order.items?.length || 0} item</span>
            </div>
          </div>
        </div>

        <PaymentButton orderId={order.id} amount={order.total} />

        <div className="text-center mt-4">
          <Link href="/orders">
            <Button variant="ghost">Lihat Pesanan Saya</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
