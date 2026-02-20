export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { StatsCard } from '@/components/admin/StatsCard'
import { OrderTable } from '@/components/admin/OrderTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export default async function AdminDashboard() {
  const supabase = createAdminClient()

  const [productsRes, ordersRes, usersRes, revenueRes, recentOrdersRes] =
    await Promise.all([
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('orders')
        .select('total')
        .in('status', ['paid', 'processing', 'shipping', 'delivered']),
      supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

  const totalRevenue =
    revenueRes.data?.reduce((acc, order) => acc + order.total, 0) || 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Produk"
          value={productsRes.count || 0}
          icon={Package}
        />
        <StatsCard
          title="Total Pesanan"
          value={ordersRes.count || 0}
          icon={ShoppingCart}
        />
        <StatsCard
          title="Total Pengguna"
          value={usersRes.count || 0}
          icon={Users}
        />
        <StatsCard
          title="Total Pendapatan"
          value={formatPrice(totalRevenue)}
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pesanan Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrdersRes.data && recentOrdersRes.data.length > 0 ? (
            <OrderTable orders={recentOrdersRes.data} />
          ) : (
            <p className="text-center py-8 text-gray-500">
              Belum ada pesanan
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
