import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MapPin, CheckCircle2, Package, Truck, Home } from 'lucide-react'
import {
  formatPrice,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
} from '@/lib/utils'

interface OrderDetailPageProps {
  params: { id: string }
}

const statusOrder = ['processing', 'shipping', 'delivered']

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

  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', params.id)
    .order('created_at', { ascending: false })

  const canTrack = ['processing', 'shipping'].includes(order.status)
  const currentStatusIndex = statusOrder.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="container px-4 py-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Detail Pesanan</h1>
        <Badge className={getStatusColor(order.status)}>
          {getStatusLabel(order.status)}
        </Badge>
      </div>

      {/* Progress Steps */}
      {!isCancelled && (
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            {statusOrder.map((status, index) => {
              const isCompleted = currentStatusIndex >= index
              const isCurrent = currentStatusIndex === index
              const Icon = status === 'processing' ? Package
                : status === 'shipping' ? Truck
                : Home

              return (
                <div key={status} className="flex-1 flex flex-col items-center relative">
                  {index > 0 && (
                    <div
                      className={`absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2 ${
                        currentStatusIndex >= index ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  {index < statusOrder.length - 1 && (
                    <div
                      className={`absolute left-1/2 right-0 top-4 h-0.5 -translate-y-1/2 ${
                        currentStatusIndex > index ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <p
                    className={`text-xs mt-2 text-center ${
                      isCompleted ? 'text-green-600 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Track Button */}
          {canTrack && order.tracking_token && (
            <Link href={`/track/${order.tracking_token}`} className="block mt-4">
              <Button
                variant="outline"
                className="w-full border-green-600 text-green-600 hover:bg-green-50"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Lacak Pesanan
              </Button>
            </Link>
          )}
        </div>
      )}

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
          {order.received_by && (
            <p>
              <span className="text-gray-500">Diterima oleh: </span>
              {order.received_by}
            </p>
          )}
        </div>
      </div>

      {/* Delivery Proof */}
      {order.delivery_proof_url && (
        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-3">Bukti Pengiriman</h2>
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
            <Image
              src={order.delivery_proof_url}
              alt="Bukti pengiriman"
              fill
              className="object-cover"
            />
          </div>
        </div>
      )}

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

      {/* Status History */}
      {statusHistory && statusHistory.length > 0 && (
        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-3">Riwayat Status</h2>
          <div className="space-y-3">
            {statusHistory.slice(0, 5).map((history: any, index: number) => (
              <div key={history.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      index === 0 ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  {index < Math.min(statusHistory.length - 1, 4) && (
                    <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <p className={`text-sm font-medium ${index === 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {getStatusLabel(history.status)}
                  </p>
                  {history.note && (
                    <p className="text-xs text-gray-500">{history.note}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {formatDateTime(history.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
