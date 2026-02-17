import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { CheckCircle2, Wallet, FileText } from 'lucide-react'

interface PaymentPageProps {
  params: { orderId: string }
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', params.orderId)
    .eq('user_id', user.id)
    .single()

  if (!order) {
    notFound()
  }

  return (
    <div className="container px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-green-600">Pesanan Berhasil!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Terima kasih telah berbelanja di Sayurku
          </p>
        </div>

        {/* Total */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-500">Total Pembayaran (COD)</p>
          <p className="text-3xl font-bold text-green-600">
            {formatPrice(order.total)}
          </p>
        </div>

        {/* COD Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Wallet className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Bayar di Tempat (COD)</p>
              <p className="text-sm text-amber-700 mt-1">
                Siapkan uang pas sebesar <strong>{formatPrice(order.total)}</strong> saat pesanan tiba.
              </p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h2 className="font-medium mb-3">Detail Pesanan</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">No. Pesanan</span>
              <span className="font-medium">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span>{formatDateTime(order.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jumlah Item</span>
              <span>{order.items?.length || 0} item</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Metode Pembayaran</span>
              <span>Bayar di Tempat (COD)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <Link href={`/orders/${order.id}`}>
          <Button className="w-full h-12 bg-green-600 hover:bg-green-700 mb-3">
            <FileText className="w-5 h-5 mr-2" />
            Lihat Detail Pesanan
          </Button>
        </Link>

        <Link href="/orders">
          <Button variant="outline" className="w-full h-12">
            Lihat Semua Pesanan
          </Button>
        </Link>

        <Link href="/">
          <Button variant="ghost" className="w-full mt-2">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  )
}
