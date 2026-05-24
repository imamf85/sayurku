'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Loader2,
  Phone,
  MapPin,
  Calendar,
  Clock,
  FileText,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  formatPrice,
  formatDateTime,
  calculateBulkWeight,
  formatBulkWeight
} from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { OrderStatus } from '@/types'

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
  status: OrderStatus
  total: number
  payment_method: string
  payment_proof_url: string | null
  created_at: string
  delivery_date: string
  notes: string | null
  address_snapshot: {
    label: string
    address: string
    district: string
    city: string
    province?: string
    postal_code: string
  }
  items: OrderItem[]
  delivery_slot: {
    name: string
  }
}

interface ManageOrderClientProps {
  order: Order
  customerInfo: {
    name: string
    phone: string
  }
  token: string
}

const STATUS_FLOW: { status: OrderStatus; label: string; icon: any; color: string }[] = [
  { status: 'processing', label: 'Sedang Diproses', icon: Package, color: 'blue' },
  { status: 'shipping', label: 'Dalam Pengiriman', icon: Truck, color: 'purple' },
  { status: 'delivered', label: 'Pesanan Tiba', icon: CheckCircle2, color: 'green' },
]

export function ManageOrderClient({ order, customerInfo, token }: ManageOrderClientProps) {
  const [updating, setUpdating] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(order.status)
  const { toast } = useToast()

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (currentStatus === newStatus) return

    setUpdating(true)

    try {
      const response = await fetch('/api/admin/orders/update-status-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          status: newStatus,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      setCurrentStatus(newStatus)
      toast({
        title: 'Status berhasil diupdate',
        description: `Pesanan ${order.order_number} diupdate ke ${STATUS_FLOW.find(s => s.status === newStatus)?.label}`,
      })
    } catch (error: any) {
      toast({
        title: 'Gagal mengupdate status',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  const paymentMethodLabel = {
    qris: 'QRIS',
    transfer: 'Transfer Bank',
    cod: 'Bayar di Tempat (COD)',
  }[order.payment_method] || order.payment_method

  const statusColors = {
    pending_payment: 'bg-amber-100 text-amber-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-blue-100 text-blue-800',
    shipping: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const statusLabels = {
    pending_payment: 'Menunggu Pembayaran',
    paid: 'Dibayar',
    processing: 'Sedang Diproses',
    shipping: 'Dalam Pengiriman',
    delivered: 'Pesanan Tiba',
    cancelled: 'Dibatalkan',
  }

  // Filter available actions based on current status
  const getAvailableActions = () => {
    const currentIndex = STATUS_FLOW.findIndex(s => s.status === currentStatus)
    if (currentIndex === -1) {
      // If current status is pending_payment or paid, start from processing
      return STATUS_FLOW
    }
    // Return current and next statuses
    return STATUS_FLOW.slice(currentIndex)
  }

  const availableActions = getAvailableActions()

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Kelola Pesanan</h1>
          <p className="text-gray-500 mt-1">Sayurku Admin</p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Status Pesanan</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[currentStatus]}`}>
              {statusLabels[currentStatus]}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">No. Pesanan</p>
              <p className="font-bold">{order.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold text-green-600">{formatPrice(order.total)}</p>
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

        {/* Delivery Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-medium mb-3">Info Pengiriman</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500">Tanggal Pengiriman</p>
                <p className="font-medium">
                  {new Date(order.delivery_date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500">Waktu Pengiriman</p>
                <p className="font-medium">{order.delivery_slot.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500">Alamat</p>
                <p className="font-medium">
                  {order.address_snapshot.address}, {order.address_snapshot.district}, {order.address_snapshot.city}
                  {order.address_snapshot.province && `, ${order.address_snapshot.province}`} {order.address_snapshot.postal_code}
                </p>
              </div>
            </div>
            {order.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500">Catatan</p>
                  <p className="font-medium">{order.notes}</p>
                </div>
              </div>
            )}
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
                  <span className="font-medium">{formatPrice(item.subtotal)}</span>
                </div>
              )
            })}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-green-600">{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-medium mb-3">Info Pembayaran</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Metode</span>
              <span className="font-medium">{paymentMethodLabel}</span>
            </div>
            {order.payment_proof_url && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-2">Bukti Pembayaran</p>
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border">
                  <Image
                    src={order.payment_proof_url}
                    alt="Bukti Pembayaran"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {currentStatus !== 'delivered' && currentStatus !== 'cancelled' && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h2 className="font-medium mb-3">Update Status Pesanan</h2>
            <div className="space-y-2">
              {availableActions.map((action) => {
                const Icon = action.icon
                const isActive = currentStatus === action.status
                const colorClasses = {
                  blue: isActive ? 'bg-blue-600 text-white' : 'border-blue-600 text-blue-600 hover:bg-blue-50',
                  purple: isActive ? 'bg-purple-600 text-white' : 'border-purple-600 text-purple-600 hover:bg-purple-50',
                  green: isActive ? 'bg-green-600 text-white' : 'border-green-600 text-green-600 hover:bg-green-50',
                }[action.color]

                return (
                  <Button
                    key={action.status}
                    variant={isActive ? 'default' : 'outline'}
                    className={`w-full h-12 justify-between ${colorClasses}`}
                    onClick={() => handleUpdateStatus(action.status)}
                    disabled={updating || isActive}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <span>{action.label}</span>
                    </div>
                    {!isActive && <ChevronRight className="h-5 w-5" />}
                    {isActive && <CheckCircle2 className="h-5 w-5" />}
                  </Button>
                )
              })}
            </div>
            {updating && (
              <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Mengupdate status...
              </div>
            )}
          </div>
        )}

        {currentStatus === 'delivered' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-800">Pesanan Selesai</p>
            <p className="text-sm text-green-600 mt-1">
              Pesanan telah diterima oleh pelanggan
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
