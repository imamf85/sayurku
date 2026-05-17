'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatPrice, formatDateTime, calculateBulkWeight, formatBulkWeight } from '@/lib/utils'
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
  status: string
  total: number
  payment_method: string
  payment_proof_url: string | null
  created_at: string
  address_snapshot: {
    label: string
    address: string
    district: string
    city: string
    province?: string
    postal_code: string
  }
  items: OrderItem[]
}

interface ConfirmPaymentClientProps {
  order: Order
  customerInfo: {
    name: string
    phone: string
  }
  token: string
}

export function ConfirmPaymentClient({ order, customerInfo, token }: ConfirmPaymentClientProps) {
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(order.status !== 'pending_payment')
  const { toast } = useToast()

  const handleConfirm = async () => {
    setConfirming(true)

    try {
      const response = await fetch('/api/payments/confirm', {
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
        description: `Pesanan ${order.order_number} telah dikonfirmasi`,
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

  const paymentMethodLabel = order.payment_method === 'qris' ? 'QRIS' : 'Transfer Bank'

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
              Pesanan {order.order_number} telah dikonfirmasi dan sedang diproses.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">No. Pesanan</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-green-600">{formatPrice(order.total)}</span>
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
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Konfirmasi Pembayaran</h1>
          <p className="text-gray-500 mt-1">Sayurku</p>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">No. Pesanan</span>
            <span className="font-bold">{order.order_number}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Tanggal</span>
            <span>{formatDateTime(order.created_at)}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Metode</span>
            <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm">
              {paymentMethodLabel}
            </span>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Pembayaran</span>
            <span className="text-xl font-bold text-green-600">{formatPrice(order.total)}</span>
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
                  href={`tel:${customerInfo.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {customerInfo.phone}
                </a>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-gray-600">
                {order.address_snapshot.address}, {order.address_snapshot.district}, {order.address_snapshot.city}
              </span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-medium mb-3">Item Pesanan</h2>
          <div className="space-y-2">
            {order.items.map((item) => {
              const isBulk = item.product_snapshot.is_bulk_pricing
              const displayQty = isBulk
                ? formatBulkWeight(calculateBulkWeight(item.quantity, item.product_snapshot.price))
                : `x${item.quantity}`

              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product_snapshot.name} {displayQty}
                  </span>
                  <span>{formatPrice(item.subtotal)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Proof */}
        {order.payment_proof_url && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="font-medium mb-3">Bukti Pembayaran</h2>
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border">
              <Image
                src={order.payment_proof_url}
                alt="Bukti Pembayaran"
                fill
                className="object-contain"
              />
            </div>
            <a
              href={order.payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-blue-600 mt-2 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Lihat gambar asli
            </a>
          </div>
        )}

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
              Konfirmasi Pembayaran
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
