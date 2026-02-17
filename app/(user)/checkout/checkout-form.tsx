'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays } from 'date-fns'
import { ChevronRight, MapPin, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { DeliverySlotPicker } from '@/components/user/DeliverySlotPicker'
import { CartItem, Address, Profile, DeliverySlot } from '@/types'
import { formatPrice, generateOrderNumber } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
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
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(
    hasPreorder ? addDays(new Date(), maxPreorderDays) : new Date()
  )
  const [deliverySlot, setDeliverySlot] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null)

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  const needsProfile = !profile?.full_name || !profile?.phone

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.product?.price || 0) * item.quantity,
    0
  )

  const discount = appliedVoucher
    ? appliedVoucher.type === 'percentage'
      ? Math.min(
          (subtotal * appliedVoucher.value) / 100,
          appliedVoucher.max_discount || Infinity
        )
      : appliedVoucher.value
    : 0

  const total = subtotal - discount

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

    if (voucher.min_purchase > subtotal) {
      toast({
        title: 'Minimum pembelian tidak terpenuhi',
        description: `Minimum pembelian ${formatPrice(voucher.min_purchase)}`,
        variant: 'destructive',
      })
      return
    }

    if (voucher.usage_limit > 0 && voucher.used_count >= voucher.usage_limit) {
      toast({
        title: 'Voucher habis',
        description: 'Kuota voucher sudah habis',
        variant: 'destructive',
      })
      return
    }

    setAppliedVoucher(voucher)
    toast({
      title: 'Voucher berhasil diterapkan',
      description: `Hemat ${formatPrice(discount)}`,
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
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/checkout')
        return
      }

      if (needsProfile) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName, phone })
          .eq('id', user.id)
      }

      const orderNumber = generateOrderNumber()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: 'processing',
          payment_method: 'cod',
          subtotal,
          discount,
          voucher_id: appliedVoucher?.id,
          total,
          address_snapshot: {
            label: selectedAddress.label,
            address: selectedAddress.address,
            province: selectedAddress.province || '',
            city: selectedAddress.city,
            district: selectedAddress.district,
            village: selectedAddress.village || '',
            postal_code: selectedAddress.postal_code,
            notes: selectedAddress.notes,
          },
          delivery_date: deliveryDate.toISOString().split('T')[0],
          delivery_slot: deliverySlot,
          notes,
        })
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_snapshot: {
          id: item.product?.id,
          name: item.product?.name,
          image_url: item.product?.image_url,
          price: item.product?.price,
          unit: item.product?.unit,
          unit_value: item.product?.unit_value,
        },
        quantity: item.quantity,
        price: item.product?.price || 0,
        discount: 0,
        subtotal: (item.product?.price || 0) * item.quantity,
      }))

      await supabase.from('order_items').insert(orderItems)

      if (appliedVoucher) {
        await supabase
          .from('vouchers')
          .update({ used_count: appliedVoucher.used_count + 1 })
          .eq('id', appliedVoucher.id)
      }

      await supabase.from('cart_items').delete().eq('user_id', user.id)

      // Send WhatsApp notifications to user and admin
      fetch('/api/orders/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      }).catch(console.error) // Don't block redirect if notification fails

      router.push(`/payment/${order.id}`)
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

  const minDate = hasPreorder ? addDays(new Date(), maxPreorderDays) : new Date()

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
          minDate={minDate}
        />
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
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.product?.name} x{item.quantity}
              </span>
              <span>{formatPrice((item.product?.price || 0) * item.quantity)}</span>
            </div>
          ))}
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
