export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ExternalLink, Copy } from 'lucide-react'
import {
  formatPrice,
  formatDate,
  formatDateTime,
  getStatusColor,
} from '@/lib/utils'
import { UpdateOrderStatus } from './update-status'
import { PickupHandover } from './pickup-handover'
import { FULFILLMENT_LABELS, statusLabelFor } from '@/lib/fulfillment/labels'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

interface OrderDetailPageProps {
  params: { id: string }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const supabase = createAdminClient()

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

  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('*, admin:admins(name)')
    .eq('order_id', params.id)
    .order('created_at', { ascending: false })

  const pickup = order.fulfillment_method === 'pickup'

  const trackingUrl = order.tracking_token
    ? `${APP_URL}/track/${order.tracking_token}`
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-gray-500">{formatDateTime(order.created_at)}</p>
        </div>
        <Badge className={getStatusColor(order.status)}>
          {statusLabelFor(order.status, order.fulfillment_method)}
        </Badge>
      </div>

      {/* Tracking Link */}
      {trackingUrl && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-green-800">Link Tracking Publik</p>
                <p className="text-xs text-green-600 break-all">{trackingUrl}</p>
              </div>
              <div className="flex gap-2">
                <Link href={trackingUrl} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

        {pickup && (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle>Ambil di Toko</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-gray-600">Pelanggan datang sendiri ke toko.</p>
              <div className="flex justify-between">
                <span className="text-gray-500">Kode ambil</span>
                <span className="font-mono font-bold tracking-widest">{order.pickup_code}</span>
              </div>
              {order.payment_method === 'cod' && !order.paid_at && (
                <p className="rounded bg-amber-50 text-amber-800 px-3 py-2">
                  Bayar di Toko: belum dibayar. Terima {formatPrice(order.total)} saat serah-terima.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {!pickup && (
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
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Metode</span>
              <span>{FULFILLMENT_LABELS[order.fulfillment_method as keyof typeof FULFILLMENT_LABELS] ?? 'Kurir Sayurku'}</span>
            </div>
            {order.distance_km != null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Jarak</span>
                <span>{Number(order.distance_km).toFixed(1)} km</span>
              </div>
            )}
            {order.total_weight_grams != null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Berat (taksiran)</span>
                <span>{(order.total_weight_grams / 1000).toFixed(1)} kg</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span>{formatDate(order.delivery_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Waktu</span>
              <span>{order.delivery_slot_name || slot?.name || order.delivery_slot}</span>
            </div>
            {order.received_by && (
              <div className="flex justify-between">
                <span className="text-gray-500">Diterima oleh</span>
                <span>{order.received_by}</span>
              </div>
            )}
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

      {/* Delivery Proof */}
      {order.delivery_proof_url && (
        <Card>
          <CardHeader>
            <CardTitle>Bukti Pengiriman</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-48 h-48 rounded-lg overflow-hidden border">
              <Image
                src={order.delivery_proof_url}
                alt="Bukti pengiriman"
                fill
                className="object-cover"
              />
            </div>
          </CardContent>
        </Card>
      )}

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
            {order.shipping_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Ongkos kirim</span>
                <span>{formatPrice(order.shipping_fee)}</span>
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
            <CardTitle>Catatan Pembeli</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Status History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Status</CardTitle>
        </CardHeader>
        <CardContent>
          {statusHistory && statusHistory.length > 0 ? (
            <div className="space-y-4">
              {statusHistory.map((history: any, index: number) => (
                <div key={history.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    {index < statusHistory.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(history.status)} variant="outline">
                        {statusLabelFor(history.status, order.fulfillment_method)}
                      </Badge>
                      {history.admin?.name && (
                        <span className="text-xs text-gray-500">
                          oleh {history.admin.name}
                        </span>
                      )}
                    </div>
                    {history.note && (
                      <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(history.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Belum ada riwayat status</p>
          )}
        </CardContent>
      </Card>

      {pickup && (
        <Card>
          <CardHeader>
            <CardTitle>Serah-terima Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <PickupHandover
              orderId={order.id}
              status={order.status}
              payAtStore={order.payment_method === 'cod'}
              total={order.total}
              readyAt={order.ready_at}
              remindedAt={order.pickup_reminded_at}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
        </CardHeader>
        <CardContent>
          <UpdateOrderStatus
            fulfillmentMethod={order.fulfillment_method}
            orderId={order.id}
            currentStatus={order.status}
            currentReceivedBy={order.received_by}
            currentDeliveryProof={order.delivery_proof_url}
          />
        </CardContent>
      </Card>
    </div>
  )
}
