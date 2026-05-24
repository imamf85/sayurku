'use client'

import Link from 'next/link'
import { AlertCircle, X, CreditCard, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

interface UnpaidOrder {
  id: string
  order_number: string
  total: number
  created_at: string
}

interface UnpaidOrdersBannerProps {
  unpaidOrders: UnpaidOrder[]
}

export function UnpaidOrdersBanner({ unpaidOrders }: UnpaidOrdersBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (unpaidOrders.length === 0 || dismissed) {
    return null
  }

  const count = unpaidOrders.length
  const totalAmount = unpaidOrders.reduce((sum, order) => sum + order.total, 0)
  const oldestOrder = unpaidOrders[0] // Orders are sorted by created_at desc, so first is newest

  return (
    <div className="relative bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-lg overflow-hidden">
      {/* Dismiss Button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors z-10"
        aria-label="Tutup"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-4 pr-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">
              {count} Pesanan Belum Dibayar
            </h3>
            <p className="text-sm text-red-50 mt-0.5">
              Total: {formatPrice(totalAmount)}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-red-50 mb-3 leading-relaxed">
          Anda memiliki {count} pesanan yang menunggu pembayaran. Segera selesaikan pembayaran agar pesanan dapat diproses.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href="/payments/pending" className="flex-1">
            <Button
              className="w-full bg-white text-red-600 hover:bg-red-50 font-medium"
              size="sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Bayar Sekarang
            </Button>
          </Link>
          <Link href="/orders">
            <Button
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              size="sm"
            >
              Lihat Semua
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
    </div>
  )
}
