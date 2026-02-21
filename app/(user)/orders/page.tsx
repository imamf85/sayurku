export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardList, MapPin } from 'lucide-react'
import { formatPrice, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'

export default async function OrdersPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/orders')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        id,
        quantity,
        product_snapshot
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!orders || orders.length === 0) {
    return (
      <div className="container px-4 py-8">
        <h1 className="text-xl font-bold mb-6">Pesanan Saya</h1>
        <div className="text-center py-12">
          <ClipboardList className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Belum ada pesanan</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-4">
      <h1 className="text-xl font-bold mb-4">Pesanan Saya</h1>

      <div className="space-y-3">
        {orders.map((order) => {
          const items = order.items || []
          const firstItem = items[0]
          const totalItems = items.reduce((acc: number, item: any) => acc + item.quantity, 0)
          const canTrack = ['processing', 'shipping'].includes(order.status)

          return (
            <div
              key={order.id}
              className="bg-white rounded-lg border overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{formatDate(order.created_at)}</span>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>

              {/* Content */}
              <Link href={`/orders/${order.id}`}>
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {firstItem?.product_snapshot?.image_url ? (
                        <Image
                          src={firstItem.product_snapshot.image_url}
                          alt={firstItem.product_snapshot.name || 'Product'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No Img
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">
                        {firstItem?.product_snapshot?.name || 'Produk'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {totalItems} item
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {order.order_number}
                      </p>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="font-bold text-green-600">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Action Button */}
              {canTrack && order.tracking_token && (
                <div className="px-4 pb-3">
                  <Link href={`/track/${order.tracking_token}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Lacak Pesanan
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
