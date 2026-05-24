'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Loader2, Phone, Calendar, ExternalLink, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  formatPrice,
  formatDateTime,
  calculateBulkWeight,
  formatBulkWeight,
} from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface OrderItem {
  id: string
  quantity: number
  subtotal: number
  product_snapshot: {
    name: string
    price: number
    is_bulk_pricing?: boolean
  }
}

interface Order {
  id: string
  order_number: string
  total: number
  created_at: string
  address_snapshot: any
  delivery_date: string
  delivery_slot: string
  items: OrderItem[]
}

interface BatchPayment {
  id: string
  payment_proof_url: string
  payment_method: string
  total_amount: number
  order_count: number
  status: string
  created_at: string
}

interface ConfirmBatchPaymentClientProps {
  batchPayment: BatchPayment
  orders: Order[]
  customerInfo: {
    name: string
    phone: string
  }
  token: string
}

export function ConfirmBatchPaymentClient({
  batchPayment,
  orders,
  customerInfo,
  token,
}: ConfirmBatchPaymentClientProps) {
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(batchPayment.status !== 'pending')
  const { toast } = useToast()

  const handleConfirm = async () => {
    setConfirming(true)

    try {
      const response = await fetch('/api/payments/batch-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment')
      }

      setConfirmed(true)
      toast({
        title: 'Pembayaran dikonfirmasi',
        description: `${batchPayment.order_count} pesanan berhasil dikonfirmasi`,
      })
    } catch (error: any) {
      toast({
        title: 'Gagal mengkonfirmasi',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setConfirming(false)
    }
  }

  const paymentMethodLabel = {
    qris: 'QRIS',
    transfer: 'Transfer Bank',
    cod: 'COD',
  }[batchPayment.payment_method] || batchPayment.payment_method

  // Already confirmed
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-green-600 mb-2">
              Pembayaran Dikonfirmasi!
            </h1>
            <p className="text-gray-500 mb-4">
              {batchPayment.order_count} pesanan telah dikonfirmasi dan sedang diproses.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Jumlah Pesanan</span>
                  <span className="font-medium">{batchPayment.order_count} pesanan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-green-600">
                    {formatPrice(batchPayment.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pelanggan</span>
                  <span>{customerInfo.name}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              Notifikasi telah dikirim ke pelanggan via WhatsApp.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Konfirmasi Pembayaran Batch</h1>
          <p className="text-gray-500 mt-1">Sayurku</p>
        </div>

        {/* Batch Payment Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-green-600" />
            <h2 className="font-medium">Info Pembayaran</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Jumlah Pesanan</span>
              <span className="font-medium">{batchPayment.order_count} pesanan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Pembayaran</span>
              <span className="text-xl font-bold text-green-600">
                {formatPrice(batchPayment.total_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Metode</span>
              <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                {paymentMethodLabel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Waktu Submit</span>
              <span>{formatDateTime(batchPayment.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-medium mb-3">Info Pelanggan</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Nama:</span>
              <span className="font-medium">{customerInfo.name}</span>
            </div>
            {customerInfo.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <a
                  href={`https://wa.me/${customerInfo.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {customerInfo.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-medium mb-3">Daftar Pesanan ({orders.length})</h2>
          <div className="space-y-3">
            {orders.map((order, index) => (
              <div key={order.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">
                      {index + 1}. {order.order_number}
                    </p>
                    <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                  </div>
                  <p className="font-bold text-green-600">{formatPrice(order.total)}</p>
                </div>

                {/* Items */}
                <div className="space-y-1 text-xs text-gray-600 mt-2">
                  {order.items.map((item) => {
                    const isBulk = item.product_snapshot.is_bulk_pricing
                    const displayQty = isBulk
                      ? formatBulkWeight(
                          calculateBulkWeight(item.quantity, item.product_snapshot.price)
                        )
                      : `x${item.quantity}`

                    return (
                      <div key={item.id} className="flex justify-between">
                        <span>
                          {item.product_snapshot.name} {displayQty}
                        </span>
                        <span>{formatPrice(item.subtotal)}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Delivery Info */}
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(order.delivery_date).toLocaleDateString('id-ID')} -{' '}
                    {order.delivery_slot}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Proof */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-medium mb-3">Bukti Pembayaran</h2>
          <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border">
            <Image
              src={batchPayment.payment_proof_url}
              alt="Bukti Pembayaran"
              fill
              className="object-contain"
            />
          </div>
          <a
            href={batchPayment.payment_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-blue-600 mt-2 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Lihat gambar asli
          </a>
        </div>

        {/* Confirm Button */}
        <Button
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg"
          onClick={handleConfirm}
          disabled={confirming}
        >
          {confirming ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Mengkonfirmasi...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Konfirmasi {batchPayment.order_count} Pesanan
            </>
          )}
        </Button>

        <p className="text-center text-sm text-gray-400 mt-4">
          Setelah dikonfirmasi, pelanggan akan menerima notifikasi via WhatsApp
        </p>
      </div>
    </div>
  )
}
