'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Calendar, CheckCircle, XCircle, Clock, ShoppingCart, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductInquiry } from '@/types'
import { formatPrice, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface InquiryListProps {
  inquiries: ProductInquiry[]
}

function getInquiryStatusInfo(status: string) {
  switch (status) {
    case 'pending':
      return {
        label: 'Menunggu',
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
      }
    case 'accepted':
      return {
        label: 'Disetujui',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
      }
    case 'rejected':
      return {
        label: 'Ditolak',
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
      }
    case 'ordered':
      return {
        label: 'Sudah Dipesan',
        color: 'bg-blue-100 text-blue-800',
        icon: ShoppingCart,
      }
    case 'cancelled':
      return {
        label: 'Dibatalkan',
        color: 'bg-gray-100 text-gray-800',
        icon: XCircle,
      }
    default:
      return {
        label: status,
        color: 'bg-gray-100 text-gray-800',
        icon: Clock,
      }
  }
}

export function InquiryList({ inquiries }: InquiryListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleCheckout = async (inquiry: ProductInquiry) => {
    setProcessingId(inquiry.id)

    try {
      const response = await fetch('/api/inquiries/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId: inquiry.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Gagal',
          description: data.error || 'Gagal memproses checkout',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Pesanan dibuat!',
        description: 'Pesanan Anda berhasil dibuat',
      })

      // Redirect to payment page
      router.push(`/payment/${data.orderId}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {inquiries.map((inquiry) => {
        const statusInfo = getInquiryStatusInfo(inquiry.status)
        const StatusIcon = statusInfo.icon

        return (
          <div
            key={inquiry.id}
            className="bg-white rounded-lg p-4 border"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <h3 className="font-medium truncate">{inquiry.item_name}</h3>
                </div>
                <p className="text-sm text-gray-600">
                  {inquiry.quantity} {inquiry.quantity_unit}
                  {inquiry.brand_preference && ` • ${inquiry.brand_preference}`}
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>Dibutuhkan: {formatDate(inquiry.needed_by)}</span>
                </div>
              </div>
              <Badge className={statusInfo.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>

            {/* Rejection reason */}
            {inquiry.status === 'rejected' && inquiry.rejection_reason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Alasan:</strong> {inquiry.rejection_reason}
                </p>
              </div>
            )}

            {/* Accepted - show price and checkout button */}
            {inquiry.status === 'accepted' && inquiry.estimated_price && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Estimasi Harga</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatPrice(inquiry.estimated_price)}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCheckout(inquiry)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={processingId === inquiry.id}
                  >
                    {processingId === inquiry.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Pesan Sekarang
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            {inquiry.notes && (
              <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                Catatan: {inquiry.notes}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-2">
              Diajukan: {formatDate(inquiry.created_at)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
