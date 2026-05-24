'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  CheckCircle2,
  Loader2,
  QrCode,
  Building2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { PaymentProofUpload } from '@/components/user/PaymentProofUpload'
import { formatPrice, formatDateTime, calculateBulkWeight, formatBulkWeight } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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
  items: OrderItem[]
}

interface PendingPaymentsClientProps {
  orders: Order[]
  userInfo: {
    name: string
    phone: string
  }
}

type PaymentMethod = 'qris' | 'transfer'

const QRIS_IMAGE_URL = 'https://tyitamjixsimjzgquxcs.supabase.co/storage/v1/object/public/utilities/qris_sayurku.jpeg'

const BANK_ACCOUNTS = [
  {
    bank: 'BCA',
    accountName: 'Rini Suswati',
    accountNumber: '8680799238',
    logo: 'https://tyitamjixsimjzgquxcs.supabase.co/storage/v1/object/public/utilities/Logo%20BCA_Biru.png',
  },
  {
    bank: 'Mandiri',
    accountName: 'Rini Suswati',
    accountNumber: '1110024104644',
    logo: 'https://tyitamjixsimjzgquxcs.supabase.co/storage/v1/object/public/utilities/bank_mandiri_logo.jpeg',
  },
]

export function PendingPaymentsClient({ orders, userInfo }: PendingPaymentsClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(
    new Set(orders.map((o) => o.id))
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris')
  const [paymentProofUrl, setPaymentProofUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  const toggleOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const toggleExpand = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const selectedOrdersList = orders.filter((o) => selectedOrders.has(o.id))
  const totalAmount = selectedOrdersList.reduce((sum, order) => sum + order.total, 0)

  const handleCopyAccount = async (accountNumber: string) => {
    await navigator.clipboard.writeText(accountNumber)
    setCopiedAccount(accountNumber)
    toast({
      title: 'Berhasil disalin',
      description: `Nomor rekening ${accountNumber} disalin ke clipboard`,
    })
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  const handleSubmit = async () => {
    if (selectedOrders.size === 0) {
      toast({
        title: 'Pilih pesanan',
        description: 'Pilih minimal 1 pesanan untuk dibayar',
        variant: 'destructive',
      })
      return
    }

    if (!paymentProofUrl) {
      toast({
        title: 'Upload bukti pembayaran',
        description: 'Silakan upload bukti transfer terlebih dahulu',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/payments/batch-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrders),
          paymentProofUrl,
          paymentMethod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit payment')
      }

      toast({
        title: 'Bukti pembayaran terkirim',
        description: `${selectedOrders.size} pesanan berhasil disubmit. Admin akan segera mengkonfirmasi.`,
      })

      router.push('/orders')
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Gagal mengirim bukti',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container px-4 py-6 pb-32">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Bayar Pesanan Pending</h1>
        <p className="text-gray-500 mb-6">
          Pilih pesanan yang ingin dibayar dan upload bukti pembayaran
        </p>

        {/* Orders List */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-3">
            Pesanan Anda ({orders.length})
          </h2>
          <div className="space-y-3">
            {orders.map((order) => {
              const isSelected = selectedOrders.has(order.id)
              const isExpanded = expandedOrders.has(order.id)

              return (
                <div
                  key={order.id}
                  className={cn(
                    'border rounded-lg p-3 transition-colors',
                    isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOrder(order.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{order.order_number}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>
                        <p className="font-bold text-green-600 whitespace-nowrap">
                          {formatPrice(order.total)}
                        </p>
                      </div>

                      {/* Items Preview/Detail */}
                      <div className="mt-2">
                        {isExpanded ? (
                          <div className="space-y-1 text-xs text-gray-600">
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
                        ) : (
                          <p className="text-xs text-gray-500">
                            {order.items.length} item
                          </p>
                        )}

                        <button
                          onClick={() => toggleExpand(order.id)}
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mt-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              Sembunyikan
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              Lihat detail
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Separator className="my-3" />

          <div className="flex justify-between items-center">
            <span className="font-medium">Total Dibayar</span>
            <span className="text-xl font-bold text-green-600">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-3">Metode Pembayaran</h2>
          <div className="space-y-2">
            <button
              onClick={() => setPaymentMethod('qris')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                paymentMethod === 'qris'
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  paymentMethod === 'qris'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                <QrCode className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">QRIS</p>
                <p className="text-sm text-gray-500">Scan QR untuk bayar</p>
              </div>
              {paymentMethod === 'qris' && <Check className="h-5 w-5 text-green-600" />}
            </button>

            <button
              onClick={() => setPaymentMethod('transfer')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                paymentMethod === 'transfer'
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  paymentMethod === 'transfer'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Transfer Bank</p>
                <p className="text-sm text-gray-500">BCA / Mandiri</p>
              </div>
              {paymentMethod === 'transfer' && <Check className="h-5 w-5 text-green-600" />}
            </button>
          </div>
        </div>

        {/* QRIS Payment */}
        {paymentMethod === 'qris' && (
          <div className="bg-white rounded-lg p-4 mb-4">
            <h2 className="font-medium mb-3 text-center">Scan QR Code</h2>
            <div className="relative w-full max-w-[250px] aspect-square mx-auto rounded-lg overflow-hidden border mb-3">
              <Image
                src={QRIS_IMAGE_URL}
                alt="QRIS Sayurku"
                fill
                className="object-contain"
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const response = await fetch(QRIS_IMAGE_URL)
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = 'QRIS-Sayurku.jpg'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  window.URL.revokeObjectURL(url)
                  toast({ title: 'QRIS berhasil diunduh' })
                } catch (error) {
                  toast({ title: 'Gagal mengunduh', variant: 'destructive' })
                }
              }}
            >
              Download QRIS
            </Button>
            <p className="text-sm text-gray-500 text-center mt-3">
              Scan menggunakan aplikasi e-wallet atau mobile banking Anda
            </p>
          </div>
        )}

        {/* Transfer Bank Payment */}
        {paymentMethod === 'transfer' && (
          <div className="bg-white rounded-lg p-4 mb-4">
            <h2 className="font-medium mb-3">Transfer ke Rekening</h2>
            <div className="space-y-3">
              {BANK_ACCOUNTS.map((account) => (
                <div key={account.bank} className="border rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative w-16 h-8">
                      <Image
                        src={account.logo}
                        alt={account.bank}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="font-medium">{account.bank}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                    <div>
                      <p className="text-lg font-mono font-bold">{account.accountNumber}</p>
                      <p className="text-sm text-gray-500">a.n {account.accountName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyAccount(account.accountNumber)}
                    >
                      {copiedAccount === account.accountNumber ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
              <p className="text-sm text-amber-800">
                <strong>Penting:</strong> Transfer sesuai nominal {formatPrice(totalAmount)} agar
                pembayaran dapat diverifikasi.
              </p>
            </div>
          </div>
        )}

        {/* Payment Proof Upload */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h2 className="font-medium mb-3">Upload Bukti Pembayaran</h2>
          <PaymentProofUpload
            value={paymentProofUrl}
            onChange={setPaymentProofUrl}
            orderId="batch-payment"
          />
          <p className="text-xs text-gray-500 mt-2">
            Upload 1 bukti pembayaran untuk semua pesanan yang dipilih
          </p>
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 md:bottom-0">
          <Button
            className="w-full h-12 bg-green-600 hover:bg-green-700"
            onClick={handleSubmit}
            disabled={submitting || selectedOrders.size === 0 || !paymentProofUrl}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              `Kirim Bukti Pembayaran (${selectedOrders.size} Pesanan)`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
