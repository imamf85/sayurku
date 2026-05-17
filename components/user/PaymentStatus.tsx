'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types'

interface PaymentStatusProps {
  orderId: string
  initialStatus: OrderStatus
}

export function PaymentStatus({ orderId, initialStatus }: PaymentStatusProps) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to realtime changes on this order
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newOrder = payload.new as Order
          setStatus(newOrder.status)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, supabase])

  if (status === 'pending_payment') {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-yellow-600" />
        </div>
        <h2 className="text-xl font-bold text-yellow-600 mb-2">Menunggu Konfirmasi</h2>
        <p className="text-sm text-gray-500 mb-4">
          Pembayaran Anda sedang diverifikasi oleh admin
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Menunggu konfirmasi...</span>
        </div>

        <div className="mt-8 space-y-3">
          <Link href="/">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              Belanja Kembali
            </Button>
          </Link>
          <Link href="/orders">
            <Button variant="outline" className="w-full">
              Lihat Semua Pesanan
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Status is paid or beyond
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-green-600 mb-2">Pembayaran Berhasil!</h2>
      <p className="text-sm text-gray-500 mb-6">
        Terima kasih, pembayaran Anda telah dikonfirmasi
      </p>

      <div className="space-y-3">
        <Link href={`/orders/${orderId}`}>
          <Button className="w-full bg-green-600 hover:bg-green-700">
            Lihat Detail Pesanan
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="w-full">
            Belanja Kembali
          </Button>
        </Link>
      </div>
    </div>
  )
}
