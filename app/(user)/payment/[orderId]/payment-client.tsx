'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, Wallet, Copy, Check, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PaymentProofUpload } from '@/components/user/PaymentProofUpload'
import { PaymentStatus } from '@/components/user/PaymentStatus'
import { Order } from '@/types'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface PaymentClientProps {
  order: Order
}

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

export function PaymentClient({ order }: PaymentClientProps) {
  const [paymentProofUrl, setPaymentProofUrl] = useState(order.payment_proof_url || '')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(order.status !== 'pending_payment' || !!order.payment_proof_url)
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const handleCopyAccount = async (accountNumber: string) => {
    await navigator.clipboard.writeText(accountNumber)
    setCopiedAccount(accountNumber)
    toast({
      title: 'Berhasil disalin',
      description: `Nomor rekening ${accountNumber} disalin ke clipboard`,
    })
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  const handleSubmitPayment = async () => {
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
      // Update order with payment proof
      const { error } = await supabase
        .from('orders')
        .update({ payment_proof_url: paymentProofUrl })
        .eq('id', order.id)

      if (error) throw error

      // Notify admin via API
      await fetch('/api/payments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })

      setSubmitted(true)
      toast({
        title: 'Bukti pembayaran terkirim',
        description: 'Admin akan segera mengkonfirmasi pembayaran Anda',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal mengirim bukti',
        description: 'Terjadi kesalahan, silakan coba lagi',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // COD Payment
  if (order.payment_method === 'cod') {
    return (
      <div className="container px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-green-600">Pesanan Berhasil!</h1>
            <p className="text-sm text-gray-500 mt-1">
              Terima kasih telah berbelanja di Sayurku
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500">Total Pembayaran (COD)</p>
            <p className="text-3xl font-bold text-green-600">
              {formatPrice(order.total)}
            </p>
          </div>

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

          <OrderDetails order={order} />

          <div className="space-y-3">
            <Link href={`/orders/${order.id}`}>
              <Button className="w-full h-12 bg-green-600 hover:bg-green-700">
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
              <Button variant="ghost" className="w-full">
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // QRIS/Transfer - Already submitted proof, waiting for confirmation
  if (submitted && order.status === 'pending_payment') {
    return (
      <div className="container px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500">Total Pembayaran</p>
            <p className="text-3xl font-bold text-green-600">
              {formatPrice(order.total)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4">
            <PaymentStatus orderId={order.id} initialStatus={order.status} />
          </div>
        </div>
      </div>
    )
  }

  // QRIS Payment
  if (order.payment_method === 'qris') {
    return (
      <div className="container px-4 py-6 pb-32">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold mb-4">Pembayaran QRIS</h1>

          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500">Total Pembayaran</p>
            <p className="text-3xl font-bold text-green-600">
              {formatPrice(order.total)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <h2 className="font-medium mb-3 text-center">Scan QR Code</h2>
            <div className="relative w-full max-w-[250px] aspect-square mx-auto rounded-lg overflow-hidden border">
              <Image
                src={QRIS_IMAGE_URL}
                alt="QRIS Sayurku"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-sm text-gray-500 text-center mt-3">
              Scan menggunakan aplikasi e-wallet atau mobile banking Anda
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <h2 className="font-medium mb-3">Upload Bukti Pembayaran</h2>
            <PaymentProofUpload
              value={paymentProofUrl}
              onChange={setPaymentProofUrl}
              orderId={order.id}
            />
          </div>

          <OrderDetails order={order} />

          <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 md:bottom-0">
            <Button
              className="w-full h-12 bg-green-600 hover:bg-green-700"
              onClick={handleSubmitPayment}
              disabled={submitting || !paymentProofUrl}
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Saya Sudah Transfer'
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Transfer Bank Payment
  return (
    <div className="container px-4 py-6 pb-32">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Transfer Bank</h1>

        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-500">Total Pembayaran</p>
          <p className="text-3xl font-bold text-green-600">
            {formatPrice(order.total)}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-3">Transfer ke Rekening</h2>
          <div className="space-y-4">
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
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            <strong>Penting:</strong> Transfer sesuai nominal {formatPrice(order.total)} agar pembayaran dapat diverifikasi otomatis.
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-3">Upload Bukti Pembayaran</h2>
          <PaymentProofUpload
            value={paymentProofUrl}
            onChange={setPaymentProofUrl}
            orderId={order.id}
          />
        </div>

        <OrderDetails order={order} />

        <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 md:bottom-0">
          <Button
            className="w-full h-12 bg-green-600 hover:bg-green-700"
            onClick={handleSubmitPayment}
            disabled={submitting || !paymentProofUrl}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Saya Sudah Transfer'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function OrderDetails({ order }: { order: Order }) {
  const paymentMethodLabel = {
    qris: 'QRIS',
    transfer: 'Transfer Bank',
    cod: 'Bayar di Tempat (COD)',
  }

  return (
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
          <span>{paymentMethodLabel[order.payment_method as keyof typeof paymentMethodLabel] || order.payment_method}</span>
        </div>
      </div>
    </div>
  )
}
