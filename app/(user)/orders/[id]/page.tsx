import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  formatPrice,
  formatDate,
  getStatusLabel,
  getStatusColor,
} from '@/lib/utils'

interface OrderDetailPageProps {
  params: { id: string }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!order) {
    notFound()
  }

  const { data: slot } = await supabase
    .from('delivery_slots')
    .select('name')
    .eq('id', order.delivery_slot)
    .single()

  return (
    <div className="container px-4 py-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Detail Pesanan</h1>
        <Badge className={getStatusColor(order.status)}>
          {getStatusLabel(order.status)}
        </Badge>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">No. Pesanan</span>
            <span className="font-medium">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tanggal Pesanan</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          {order.paid_at && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal Bayar</span>
              <span>{formatDate(order.paid_at)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Alamat Pengiriman</h2>
        <div className="text-sm">
          <p className="font-medium">{order.address_snapshot.label}</p>
          <p className="text-gray-600">{order.address_snapshot.address}</p>
          <p className="text-gray-600">
            {order.address_snapshot.district}, {order.address_snapshot.city}{' '}
            {order.address_snapshot.postal_code}
          </p>
          {order.address_snapshot.notes && (
            <p className="text-gray-500 mt-1">
              Patokan: {order.address_snapshot.notes}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Pengiriman</h2>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-gray-500">Tanggal: </span>
            {formatDate(order.delivery_date)}
          </p>
          <p>
            <span className="text-gray-500">Waktu: </span>
            {slot?.name || order.delivery_slot}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Produk</h2>
        <div className="space-y-3">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex gap-3">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {item.product_snapshot.image_url ? (
                  <Image
                    src={item.product_snapshot.image_url}
                    alt={item.product_snapshot.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-2">
                  {item.product_snapshot.name}
                </p>
                <p className="text-sm text-gray-500">
                  {item.quantity} x {formatPrice(item.price)}
                </p>
              </div>
              <p className="font-medium text-sm">
                {formatPrice(item.subtotal)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {order.notes && (
        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-2">Catatan</h2>
          <p className="text-sm text-gray-600">{order.notes}</p>
        </div>
      )}

      <div className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Ringkasan Pembayaran</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Diskon</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-green-600">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {order.status === 'pending_payment' && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 md:bottom-0">
          <Link href={`/payment/${order.id}`}>
            <Button className="w-full h-12 bg-green-600 hover:bg-green-700">
              Bayar Sekarang
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
