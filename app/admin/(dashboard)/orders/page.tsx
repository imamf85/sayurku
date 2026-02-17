import { createAdminClient } from '@/lib/supabase/admin'
import { OrderTable } from '@/components/admin/OrderTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function OrdersPage() {
  const supabase = createAdminClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  const allOrders = orders || []
  const pendingOrders = allOrders.filter((o) => o.status === 'pending_payment')
  const paidOrders = allOrders.filter((o) => o.status === 'paid')
  const processingOrders = allOrders.filter((o) => o.status === 'processing')
  const shippingOrders = allOrders.filter((o) => o.status === 'shipping')
  const deliveredOrders = allOrders.filter((o) => o.status === 'delivered')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pesanan</h1>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Semua ({allOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Menunggu Bayar ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="paid">Dibayar ({paidOrders.length})</TabsTrigger>
          <TabsTrigger value="processing">
            Diproses ({processingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="shipping">
            Dikirim ({shippingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Diterima ({deliveredOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="pt-6">
              {allOrders.length > 0 ? (
                <OrderTable orders={allOrders} />
              ) : (
                <p className="text-center py-8 text-gray-500">
                  Belum ada pesanan
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              {pendingOrders.length > 0 ? (
                <OrderTable orders={pendingOrders} />
              ) : (
                <p className="text-center py-8 text-gray-500">
                  Tidak ada pesanan menunggu pembayaran
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <CardContent className="pt-6">
              {paidOrders.length > 0 ? (
                <OrderTable orders={paidOrders} />
              ) : (
                <p className="text-center py-8 text-gray-500">
                  Tidak ada pesanan dibayar
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardContent className="pt-6">
              {processingOrders.length > 0 ? (
                <OrderTable orders={processingOrders} />
              ) : (
                <p className="text-center py-8 text-gray-500">
                  Tidak ada pesanan diproses
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping">
          <Card>
            <CardContent className="pt-6">
              {shippingOrders.length > 0 ? (
                <OrderTable orders={shippingOrders} />
              ) : (
                <p className="text-center py-8 text-gray-500">
                  Tidak ada pesanan dikirim
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered">
          <Card>
            <CardContent className="pt-6">
              {deliveredOrders.length > 0 ? (
                <OrderTable orders={deliveredOrders} />
              ) : (
                <p className="text-center py-8 text-gray-500">
                  Tidak ada pesanan diterima
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
