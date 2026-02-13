import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { ClipboardList } from 'lucide-react'
import { formatPrice, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'

export default async function OrdersPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/orders')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(count)')
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
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <div className="bg-white rounded-lg p-4 border hover:border-green-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{order.order_number}</span>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">
                  {(order.items as any)?.[0]?.count || 0} item
                </span>
                <span className="font-bold text-green-600">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
