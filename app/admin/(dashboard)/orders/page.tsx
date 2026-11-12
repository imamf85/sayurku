export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { OrderTable } from '@/components/admin/OrderTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AutoRefresh } from '@/components/admin/AutoRefresh'

export default async function OrdersPage() {
  const supabase = createAdminClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, shipments(is_active, status)')
    .order('created_at', { ascending: false })

  const allOrders = orders || []
  const pendingOrders = allOrders.filter((o) => o.status === 'pending_payment')
  const paidOrders = allOrders.filter((o) => o.status === 'paid')
  const processingOrders = allOrders.filter((o) => o.status === 'processing')
  const readyOrders = allOrders.filter((o) => o.status === 'ready_for_pickup')
  const shippingOrders = allOrders.filter((o) => o.status === 'shipping')
  const deliveredOrders = allOrders.filter((o) => o.status === 'delivered')

  // Antrean Grab: sudah dibayar (paid_at, BUKAN status 'paid': konfirmasi manual langsung 'processing')
  // tetapi belum ada pengiriman aktif. Driver datang ±1 jam setelah dipanggil, jadi urutkan dari yang terlama.
  const needGrabOrders = allOrders
    .filter(
      (o) =>
        o.fulfillment_method === 'grab' &&
        o.paid_at &&
        !['delivered', 'cancelled'].includes(o.status) &&
        !(o.shipments || []).some((s: { is_active: boolean }) => s.is_active)
    )
    .sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime())

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pesanan</h1>

      {needGrabOrders.length > 0 && <AutoRefresh seconds={30} />}

      <Tabs defaultValue={needGrabOrders.length > 0 ? 'needgrab' : 'all'}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="needgrab" className={needGrabOrders.length > 0 ? 'text-red-600 font-semibold' : ''}>
            Perlu Panggil Grab ({needGrabOrders.length})
          </TabsTrigger>
          <TabsTrigger value="all">Semua ({allOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Menunggu Bayar ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="paid">Dibayar ({paidOrders.length})</TabsTrigger>
          <TabsTrigger value="processing">
            Diproses ({processingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="ready">
            Siap Diambil ({readyOrders.length})
          </TabsTrigger>
          <TabsTrigger value="shipping">
            Dikirim ({shippingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Diterima ({deliveredOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="needgrab">
          <Card>
            <CardContent className="pt-6">
              {needGrabOrders.length > 0 ? (
                <>
                  <p className="text-sm text-red-600 mb-3">
                    Driver datang ±1 jam setelah dipanggil. Panggil Grab sekarang, lalu packing sambil menunggu.
                  </p>
                  <OrderTable orders={needGrabOrders} />
                </>
              ) : (
                <p className="text-center py-8 text-gray-500">Tidak ada pesanan Grab yang menunggu dipanggil</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="ready">
          <Card>
            <CardContent className="pt-6">
              {readyOrders.length > 0 ? (
                <OrderTable orders={readyOrders} />
              ) : (
                <p className="text-center py-8 text-gray-500">
                  Tidak ada pesanan siap diambil
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
