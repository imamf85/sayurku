'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { addDays } from 'date-fns'
import { MapPin, Plus, Loader2, QrCode, Building2, Wallet, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { DeliverySlotPicker } from '@/components/user/DeliverySlotPicker'
import { CartItem, Address, Profile, DeliverySlot, PaymentMethod } from '@/types'
import {
  formatPrice,
  calculateCartItemTotal,
  calculateBulkWeight,
  formatBulkWeight,
  isTodayDeliveryAvailable,
  cn,
} from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { localDateString } from '@/lib/time'
import { calculateTotal, calculateVoucherDiscount, checkVoucher, VOUCHER_ERROR_MESSAGES } from '@/lib/orders/pricing'
import { useToast } from '@/hooks/use-toast'
import { AddressDialog } from './address-dialog'

interface CheckoutFormProps {
  cartItems: CartItem[]
  addresses: Address[]
  profile: Profile | null
  deliverySlots: DeliverySlot[]
  hasPreorder: boolean
  maxPreorderDays: number
}

const PAYMENT_METHODS = [
  {
    id: 'qris' as PaymentMethod,
    name: 'QRIS',
    description: 'Scan QR untuk bayar',
    icon: QrCode,
  },
  {
    id: 'transfer' as PaymentMethod,
    name: 'Transfer Bank',
    description: 'BCA / Mandiri',
    icon: Building2,
  },
  {
    id: 'cod' as PaymentMethod,
    name: 'Bayar di Tempat',
    description: 'Cash on Delivery',
    icon: Wallet,
  },
]

export function CheckoutForm({
  cartItems,
  addresses,
  profile,
  deliverySlots,
  hasPreorder,
  maxPreorderDays,
}: CheckoutFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [showAddressDialog, setShowAddressDialog] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(
    addresses.find((a) => a.is_default) || addresses[0] || null
  )

  // Determine initial delivery date
  const getInitialDeliveryDate = () => {
    if (hasPreorder) {
      return addDays(new Date(), maxPreorderDays)
    }
    const todayHasSlots = isTodayDeliveryAvailable(deliverySlots)
    return todayHasSlots ? new Date() : addDays(new Date(), 1)
  }

  const [deliveryDate, setDeliveryDate] = useState<Date | null>(getInitialDeliveryDate)
  const [deliverySlot, setDeliverySlot] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris')

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  const needsProfile = !profile?.full_name || !profile?.phone

  const subtotal = cartItems.reduce(
    (acc, item) => acc + calculateCartItemTotal(item),
    0
  )

  // Preview saja; server menghitung ulang diskon dan total saat order dibuat
  const discount = calculateVoucherDiscount(subtotal, appliedVoucher)

  const total = calculateTotal(subtotal, discount)

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return

    const { data: voucher } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', voucherCode.toUpperCase())
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .lte('start_date', new Date().toISOString())
      .single()

    if (!voucher) {
      toast({
        title: 'Voucher tidak valid',
        description: 'Kode voucher tidak ditemukan atau sudah kadaluarsa',
        variant: 'destructive',
      })
      return
    }

    const voucherError = checkVoucher(voucher, subtotal)
    if (voucherError) {
      toast({
        title: 'Voucher tidak dapat dipakai',
        description: VOUCHER_ERROR_MESSAGES[voucherError],
        variant: 'destructive',
      })
      return
    }

    setAppliedVoucher(voucher)
    toast({
      title: 'Voucher berhasil diterapkan',
      description: `Hemat ${formatPrice(calculateVoucherDiscount(subtotal, voucher))}`,
    })
  }

  const handleSubmit = async () => {
    if (!selectedAddress) {
      toast({
        title: 'Pilih alamat pengiriman',
        variant: 'destructive',
      })
      return
    }

    if (!deliveryDate) {
      toast({
        title: 'Pilih tanggal pengiriman',
        variant: 'destructive',
      })
      return
    }

    if (!deliverySlot) {
      toast({
        title: 'Pilih waktu pengiriman',
        variant: 'destructive',
      })
      return
    }

    if (needsProfile && (!fullName.trim() || !phone.trim())) {
      toast({
        title: 'Lengkapi data diri',
        description: 'Nama dan nomor WhatsApp wajib diisi',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      // Order dibuat di server (harga, diskon, voucher, slot divalidasi ulang di sana)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: selectedAddress.id,
          deliveryDate: localDateString(deliveryDate),
          deliverySlot,
          paymentMethod,
          voucherCode: appliedVoucher?.code || null,
          notes: notes || null,
          ...(needsProfile ? { fullName, phone } : {}),
        }),
      })

      if (res.status === 401) {
        router.push('/login?redirect=/checkout')
        return
      }

      const result = await res.json().catch(() => null)

      if (!res.ok || !result?.orderId) {
        toast({
          title: 'Gagal membuat pesanan',
          description: result?.error?.message || 'Terjadi kesalahan, silakan coba lagi',
          variant: 'destructive',
        })
        return
      }

      // Kirim notifikasi WhatsApp ke user dan admin
      fetch('/api/orders/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: result.orderId }),
      }).catch(console.error)

      router.refresh()
      router.push(`/payment/${result.orderId}`)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Gagal membuat pesanan',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container px-4 py-4 pb-32">
      <h1 className="text-xl font-bold mb-4">Checkout</h1>

      {needsProfile && (
        <section className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-3">Data Penerima</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap"
              />
            </div>
            <div>
              <Label htmlFor="phone">Nomor WhatsApp</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="628xxxxxxxxxx"
              />
            </div>
          </div>
        </section>
      )}

      <section className="bg-white rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Alamat Pengiriman</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddressDialog(true)}
          >
            {addresses.length > 0 ? 'Ubah' : <><Plus className="h-4 w-4 mr-1" /> Tambah</>}
          </Button>
        </div>

        {selectedAddress ? (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{selectedAddress.label}</p>
              <p className="text-sm text-gray-600">{selectedAddress.address}</p>
              <p className="text-sm text-gray-600">
                {selectedAddress.village && `${selectedAddress.village}, `}
                {selectedAddress.district}, {selectedAddress.city}
                {selectedAddress.province && `, ${selectedAddress.province}`} {selectedAddress.postal_code}
              </p>
              {selectedAddress.notes && (
                <p className="text-sm text-gray-500 mt-1">
                  Patokan: {selectedAddress.notes}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Belum ada alamat tersimpan</p>
        )}
      </section>

      <section className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Waktu Pengiriman</h2>
        <DeliverySlotPicker
          slots={deliverySlots}
          selectedDate={deliveryDate}
          selectedSlot={deliverySlot}
          onDateChange={setDeliveryDate}
          onSlotChange={setDeliverySlot}
          isPreorder={hasPreorder}
          minDate={hasPreorder ? addDays(new Date(), maxPreorderDays) : undefined}
        />
      </section>

      <section className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Metode Pembayaran</h2>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon
            const isSelected = paymentMethod === method.id
            return (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                  isSelected
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{method.name}</p>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-green-600" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Catatan</h2>
        <Textarea
          placeholder="Catatan untuk penjual (opsional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <section className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Voucher</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Masukkan kode voucher"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
            disabled={!!appliedVoucher}
          />
          {appliedVoucher ? (
            <Button
              variant="outline"
              onClick={() => {
                setAppliedVoucher(null)
                setVoucherCode('')
              }}
            >
              Hapus
            </Button>
          ) : (
            <Button onClick={handleApplyVoucher}>Terapkan</Button>
          )}
        </div>
        {appliedVoucher && (
          <p className="text-sm text-green-600 mt-2">
            Voucher {appliedVoucher.code} berhasil diterapkan
          </p>
        )}
      </section>

      <section className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Ringkasan Pesanan</h2>
        <div className="space-y-2">
          {cartItems.map((item) => {
            const isBulk = item.product?.is_bulk_pricing
            const itemTotal = calculateCartItemTotal(item)
            const displayQty = isBulk
              ? `${formatBulkWeight(calculateBulkWeight(item.quantity, item.product?.price || 0))}`
              : `x${item.quantity}`

            return (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.product?.name} {displayQty}
                </span>
                <span>{formatPrice(itemTotal)}</span>
              </div>
            )
          })}
          <Separator className="my-2" />
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Diskon</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-green-600">{formatPrice(total)}</span>
          </div>
        </div>
      </section>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 md:bottom-0">
        <Button
          className="w-full h-12 bg-green-600 hover:bg-green-700"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            `Bayar ${formatPrice(total)}`
          )}
        </Button>
      </div>

      <AddressDialog
        open={showAddressDialog}
        onOpenChange={setShowAddressDialog}
        addresses={addresses}
        selectedAddress={selectedAddress}
        onSelectAddress={(address) => {
          setSelectedAddress(address)
          setShowAddressDialog(false)
        }}
      />
    </div>
  )
}
