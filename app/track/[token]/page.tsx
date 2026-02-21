import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Circle,
  Package,
  Truck,
  Home,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { formatDate, formatDateTime, formatPrice, getStatusLabel } from '@/lib/utils'

interface TrackingPageProps {
  params: { token: string }
}

const statusIcons: Record<string, React.ReactNode> = {
  pending_payment: <Clock className="h-5 w-5" />,
  paid: <CheckCircle2 className="h-5 w-5" />,
  processing: <Package className="h-5 w-5" />,
  shipping: <Truck className="h-5 w-5" />,
  delivered: <Home className="h-5 w-5" />,
  cancelled: <Circle className="h-5 w-5" />,
}

const statusOrder = ['processing', 'shipping', 'delivered']

export default async function TrackingPage({ params }: TrackingPageProps) {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total,
      delivery_date,
      delivery_slot,
      received_by,
      delivery_proof_url,
      created_at,
      items:order_items(
        id,
        quantity,
        product_snapshot
      ),
      delivery_slot_info:delivery_slots(name)
    `)
    .eq('tracking_token', params.token)
    .single()

  if (!order) {
    notFound()
  }

  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('*, admin:admins(name)')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })

  // Get current status index for progress indicator
  const currentStatusIndex = statusOrder.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container px-4 py-3">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="font-medium">Kembali</span>
          </Link>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-2xl mx-auto">
        {/* Status Card */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <Badge
                className={
                  isCancelled
                    ? 'bg-red-100 text-red-800'
                    : order.status === 'delivered'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                }
              >
                {getStatusLabel(order.status)}
              </Badge>
              <p className="text-sm text-gray-500 mt-2">No. Pesanan</p>
              <p className="font-semibold">{order.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Estimasi Tiba</p>
              <p className="text-xl font-bold text-green-600">
                {formatDate(order.delivery_date)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        {!isCancelled && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between">
              {statusOrder.map((status, index) => {
                const isCompleted = currentStatusIndex >= index
                const isCurrent = currentStatusIndex === index

                return (
                  <div key={status} className="flex-1 flex flex-col items-center relative">
                    {/* Connector line */}
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

                    {/* Icon */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}
                    >
                      {statusIcons[status]}
                    </div>

                    {/* Label */}
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
          </div>
        )}

        {/* Delivery Info */}
        {order.status === 'delivered' && (order.received_by || order.delivery_proof_url) && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="font-semibold mb-3">Bukti Pengiriman</h3>
            {order.received_by && (
              <p className="text-sm text-gray-600 mb-2">
                Diterima oleh: <span className="font-medium">{order.received_by}</span>
              </p>
            )}
            {order.delivery_proof_url && (
              <div className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border">
                <Image
                  src={order.delivery_proof_url}
                  alt="Bukti pengiriman"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="font-semibold mb-4">Riwayat Status</h3>
          <div className="space-y-4">
            {statusHistory?.map((history, index) => {
              const isLatest = index === 0

              return (
                <div key={history.id} className="flex gap-3">
                  {/* Timeline dot and line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isLatest ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    {index < (statusHistory?.length || 0) - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <p className={`font-medium ${isLatest ? 'text-green-600' : 'text-gray-700'}`}>
                      {getStatusLabel(history.status)}
                    </p>
                    {history.note && (
                      <p className="text-sm text-gray-600 mt-0.5">{history.note}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(history.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Ringkasan Pesanan</h3>
          <div className="space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.product_snapshot.image_url ? (
                    <Image
                      src={item.product_snapshot.image_url}
                      alt={item.product_snapshot.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No Img
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">
                    {item.product_snapshot.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} item
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 flex justify-between">
            <span className="font-medium">Total</span>
            <span className="font-bold text-green-600">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
