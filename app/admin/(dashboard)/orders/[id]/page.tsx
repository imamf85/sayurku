import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  formatPrice,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
} from '@/lib/utils'
import { UpdateOrderStatus } from './update-status'

interface OrderDetailPageProps {
  params: { id: string }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*), profile:profiles(full_name, phone)')
    .eq('id', params.id)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-gray-500">{formatDateTime(order.created_at)}</p>
        </div>
        <Badge className={getStatusColor(order.status)}>
          {getStatusLabel(order.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pemesan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nama</span>
              <span>{(order.profile as any)?.full_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">WhatsApp</span>
              <span>{(order.profile as any)?.phone || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alamat Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{order.address_snapshot.label}</p>
            <p className="text-gray-600">{order.address_snapshot.address}</p>
            <p className="text-gray-600">
              {order.address_snapshot.village && `${order.address_snapshot.village}, `}
              {order.address_snapshot.district}, {order.address_snapshot.city}
              {order.address_snapshot.province && `, ${order.address_snapshot.province}`}{' '}
              {order.address_snapshot.postal_code}
            </p>
            {order.address_snapshot.notes && (
              <p className="text-gray-500 mt-1">
                Patokan: {order.address_snapshot.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span>{formatDate(order.delivery_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Waktu</span>
              <span>{slot?.name || order.delivery_slot}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Metode</span>
              <span>{order.payment_method || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ID Pembayaran</span>
              <span className="font-mono text-xs">{order.payment_id || '-'}</span>
            </div>
            {order.paid_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Dibayar</span>
                <span>{formatDateTime(order.paid_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex gap-4">
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
                  <p className="font-medium">{item.product_snapshot.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} x {formatPrice(item.price)}
                  </p>
                </div>
                <p className="font-medium">{formatPrice(item.subtotal)}</p>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
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
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-green-600">{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Catatan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
        </CardHeader>
        <CardContent>
          <UpdateOrderStatus orderId={order.id} currentStatus={order.status} />
        </CardContent>
      </Card>
    </div>
  )
}
