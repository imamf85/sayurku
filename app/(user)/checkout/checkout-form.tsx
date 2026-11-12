'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
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
import { FulfillmentSection } from './fulfillment-section'
import { AddressPinPrompt } from './address-pin-prompt'
import type { StoreSettings } from '@/lib/settings-schema'
import { haversineKm } from '@/lib/fulfillment/distance'
import { cartWeightGrams } from '@/lib/fulfillment/weight'
import { allowedPaymentMethods, eligible, type EligibilityContext } from '@/lib/fulfillment/eligibility'
import { REASON_MESSAGES, type ReasonCode } from '@/lib/fulfillment/reasons'

interface CheckoutFormProps {
  cartItems: CartItem[]
  addresses: Address[]
  profile: Profile | null
  deliverySlots: DeliverySlot[]
  settings: StoreSettings
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
  settings,
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

  // ─── Cara terima pesanan ──────────────────────────────────────────────────
  const cartFlags = useMemo(
    () => Array.from(new Set(cartItems.flatMap((i) => i.product?.flags ?? []))),
    [cartItems]
  )
  const hasPickupOnlyItem = cartFlags.includes('pickup_only')
  const [method, setMethod] = useState<'internal' | 'grab' | 'pickup'>(hasPickupOnlyItem ? 'pickup' : 'internal')

  const weightGrams = useMemo(
    () => cartWeightGrams(cartItems.map((i) => ({ quantity: i.quantity, product: i.product! })), settings),
    [cartItems, settings]
  )

  const hasPin = selectedAddress?.latitude != null && selectedAddress?.longitude != null
  const distanceKm = useMemo(
    () =>
      method !== 'pickup' && selectedAddress && hasPin
        ? haversineKm(
            { latitude: settings.store_latitude, longitude: settings.store_longitude },
            { latitude: selectedAddress.latitude!, longitude: selectedAddress.longitude! }
          )
        : null,
    [method, selectedAddress, hasPin, settings.store_latitude, settings.store_longitude]
  )

  // Ongkir GrabExpress: hanya dihitung bila customer memilih Grab (hemat kuota Rates)
  const cartKey = cartItems.map((i) => `${i.product_id}:${i.quantity}`).join('|')
  const grabKey =
    method === 'grab' && selectedAddress?.id && hasPin ? (['grab-quote', selectedAddress.id, cartKey] as const) : null
  const {
    data: grabQuote,
    isLoading: grabLoading,
    mutate: refreshGrabQuote,
  } = useSWR<{ available: boolean; quoteId?: string; fee?: number; durationText?: string | null; reason?: ReasonCode; message?: string }>(
    grabKey,
    async ([, addressId]: readonly [string, string, string]) => {
      const res = await fetch('/api/checkout/grab-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId }),
      })
      const json = await res.json().catch(() => null)
      return json?.available !== undefined ? json : { available: false, reason: 'GRAB_UNAVAILABLE' as ReasonCode }
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )

  // Beban kurir internal per slot (hanya bila ada slot berkapasitas); hanya untuk tampilan
  const hasCapacitySlots = deliverySlots.some((sl) => sl.internal_capacity != null)
  const dateKey = deliveryDate ? localDateString(deliveryDate) : null
  const { data: loadData, mutate: refreshLoads } = useSWR<{ loads: Record<string, number> }>(
    method === 'internal' && hasCapacitySlots && dateKey ? `/api/checkout/slot-load?date=${dateKey}` : null,
    (url: string) => fetch(url).then((r) => (r.ok ? r.json() : { loads: {} })),
    { revalidateOnFocus: false }
  )

  const baseCtx = (slot: DeliverySlot, m: 'internal' | 'grab' | 'pickup'): { m: typeof m; ctx: EligibilityContext } => ({
    m,
    ctx: {
      distanceKm: m === 'pickup' ? null : distanceKm,
      cartFlags,
      cartWeightGrams: weightGrams,
      hasPreorder,
      slot,
      now: new Date(),
      settings,
      internalLoad: loadData?.loads?.[slot.id] ?? 0,
      grabQuoteAvailable: m === 'grab' && grabQuote ? grabQuote.available : undefined,
    },
  })

  // Ingat Grab yang tidak tersedia untuk kombinasi alamat+keranjang ini, agar kartunya tetap
  // nonaktif (dengan alasan) setelah customer otomatis dipindah ke metode lain
  const currentGrabKey = `${selectedAddress?.id ?? ''}|${cartKey}`
  const [grabBlocked, setGrabBlocked] = useState<{ key: string; reason: ReasonCode } | null>(null)
  useEffect(() => {
    if (grabQuote && !grabQuote.available) {
      setGrabBlocked({ key: currentGrabKey, reason: grabQuote.reason ?? 'GRAB_UNAVAILABLE' })
    }
  }, [grabQuote, currentGrabKey])

  // Alasan per slot untuk metode terpilih → slot nonaktif + keterangan
  const slotReasons = useMemo(() => {
    const out: Record<string, string | null> = {}
    for (const sl of deliverySlots) {
      const { m, ctx } = baseCtx(sl, method)
      const r = eligible(m, ctx)
      out[sl.id] = r.ok ? null : REASON_MESSAGES[r.reason]
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverySlots, method, distanceKm, cartFlags, weightGrams, hasPreorder, settings, loadData, deliveryDate, grabQuote])

  // Alasan level-metode (bukan per slot) untuk kartu pilihan
  const methodReasons = useMemo(() => {
    const probe: DeliverySlot = {
      id: 'probe', name: '', slot_type: 'scheduled', time_start: null, time_end: null,
      is_active: true, sort_order: 0, applies_to: 'both', internal_capacity: null,
    }
    const reasonFor = (m: 'internal' | 'grab' | 'pickup'): ReasonCode | null => {
      // Grab selalu 'asap' (slot instan); internal/pickup diuji dengan slot terjadwal generik
      const { ctx } = baseCtx(m === 'grab' ? { ...probe, slot_type: 'instant' } : probe, m)
      // Belum ada pin: jarak belum diketahui → tidak diblokir di level kartu (ada prompt pin)
      const withDistance = m !== 'pickup' && !hasPin ? { ...ctx, distanceKm: settings.internal_min_km } : ctx
      const r = eligible(m, withDistance)
      return r.ok ? null : r.reason
    }
    const grabReason =
      reasonFor('grab') ?? (grabBlocked && grabBlocked.key === currentGrabKey ? grabBlocked.reason : null)
    return { internal: reasonFor('internal'), grab: grabReason, pickup: reasonFor('pickup') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceKm, hasPin, cartFlags, settings, grabBlocked, currentGrabKey])

  // Bila pilihan saat ini jadi tidak valid, pindah ke metode lain yang tersedia
  useEffect(() => {
    if (methodReasons[method]) {
      const alt = (['internal', 'grab', 'pickup'] as const).find((m) => m !== method && !methodReasons[m])
      if (alt) setMethod(alt)
    }
  }, [methodReasons, method])

  // Pilih metode: Grab hanya "secepatnya", jadi arahkan ke hari ini + slot instan
  const instantSlot = deliverySlots.find((sl) => sl.slot_type === 'instant')
  const handleMethodChange = (m: 'internal' | 'grab' | 'pickup') => {
    setMethod(m)
    if (m === 'grab' && instantSlot && !hasPreorder) {
      setDeliveryDate(new Date())
      setDeliverySlot(instantSlot.id)
    }
  }

  const allowedPayments = allowedPaymentMethods(method)
  useEffect(() => {
    if (!allowedPayments.includes(paymentMethod)) setPaymentMethod(allowedPayments[0])
  }, [allowedPayments, paymentMethod])

  const grabFee = method === 'grab' && grabQuote?.available ? grabQuote.fee ?? 0 : 0
  const shippingFee = method === 'grab' ? grabFee : method === 'internal' ? settings.internal_fee : 0

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  const needsProfile = !profile?.full_name || !profile?.phone

  const subtotal = cartItems.reduce(
    (acc, item) => acc + calculateCartItemTotal(item),
    0
  )

  // Preview saja; server menghitung ulang diskon dan total saat order dibuat
  const discount = calculateVoucherDiscount(subtotal, appliedVoucher)

  const total = calculateTotal(subtotal, discount, shippingFee)

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
    if (method !== 'pickup') {
      if (!selectedAddress) {
        toast({
          title: 'Pilih alamat pengiriman',
          variant: 'destructive',
        })
        return
      }
      if (!hasPin) {
        toast({
          title: 'Pasang titik lokasi alamat',
          description: 'Titik lokasi dibutuhkan untuk menghitung jarak pengiriman',
          variant: 'destructive',
        })
        return
      }
    }

    if (method === 'grab' && (!grabQuote?.available || !grabQuote.quoteId)) {
      toast({
        title: 'Ongkir GrabExpress belum tersedia',
        description: grabLoading ? 'Tunggu perhitungan ongkir selesai' : 'Pilih cara terima pesanan lain',
        variant: 'destructive',
      })
      return
    }

    if (methodReasons[method]) {
      toast({
        title: 'Cara terima pesanan tidak tersedia',
        description: REASON_MESSAGES[methodReasons[method]!],
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
        title: method === 'pickup' ? 'Pilih waktu pengambilan' : 'Pilih waktu pengiriman',
        variant: 'destructive',
      })
      return
    }

    if (slotReasons[deliverySlot]) {
      toast({
        title: 'Waktu tidak tersedia',
        description: slotReasons[deliverySlot]!,
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
          fulfillmentMethod: method,
          addressId: method !== 'pickup' ? selectedAddress?.id : null,
          quoteId: method === 'grab' ? grabQuote?.quoteId : null,
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
        // Slot bisa penuh karena checkout lain: segarkan beban slot
        if (result?.error?.code === 'SLOT_FULL') refreshLoads()
        if (result?.error?.code === 'QUOTE_EXPIRED') refreshGrabQuote()
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

      <FulfillmentSection
        method={method}
        onChange={handleMethodChange}
        reasons={methodReasons}
        internalFee={settings.internal_fee}
        grab={{ loading: grabLoading, fee: grabQuote?.available ? grabQuote.fee : undefined, durationText: grabQuote?.durationText }}
      />

      {method === 'pickup' && (
        <section className="bg-white rounded-lg p-4 mb-4 text-sm">
          <h2 className="font-medium mb-2">Lokasi Toko</h2>
          <p className="font-medium">{settings.store_name}</p>
          {settings.store_address && <p className="text-gray-600">{settings.store_address}</p>}
          <p className="text-gray-500 mt-1">
            Buka {settings.store_open} - {settings.store_close} WIB. Kode ambil dikirim setelah pesanan dibuat.
          </p>
        </section>
      )}

      {method !== 'pickup' && (
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

        {selectedAddress && !hasPin && (
          <AddressPinPrompt
            address={selectedAddress}
            onSaved={(updated) => setSelectedAddress(updated)}
          />
        )}

        {distanceKm != null && (
          <p className="text-xs text-gray-500 mt-3">Jarak dari toko ± {distanceKm.toFixed(1)} km</p>
        )}
      </section>
      )}

      <section className="bg-white rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">{method === 'pickup' ? 'Waktu Pengambilan' : 'Waktu Pengiriman'}</h2>
        <DeliverySlotPicker
          unavailableReasons={slotReasons}
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
          {PAYMENT_METHODS.filter((pm) => allowedPayments.includes(pm.id)).map((pm) => {
            const Icon = pm.icon
            const isSelected = paymentMethod === pm.id
            return (
              <button
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
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
                  <p className="font-medium">
                    {pm.id === 'cod' && method === 'pickup' ? 'Bayar di Toko' : pm.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {pm.id === 'cod' && method === 'pickup' ? 'Bayar saat mengambil pesanan' : pm.description}
                  </p>
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
          {method !== 'pickup' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ongkos kirim</span>
              <span>
                {method === 'grab' && grabLoading ? 'Menghitung...' : shippingFee > 0 ? formatPrice(shippingFee) : 'Gratis'}
              </span>
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
