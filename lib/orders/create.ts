// Pembuatan order di server (invarian I1, I2). Server otoritatif: harga, diskon, total,
// slot, dan voucher dihitung ulang dari database. Dari client hanya diterima PILIHAN.
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateCartItemTotal } from '@/lib/utils'
import { isValidDateString } from '@/lib/time'
import { getSettingsFresh } from '@/lib/settings'
import { haversineKm, roundKm } from '@/lib/fulfillment/distance'
import { cartWeightGrams } from '@/lib/fulfillment/weight'
import { allowedPaymentMethods, eligible, timingOf } from '@/lib/fulfillment/eligibility'
import { REASON_MESSAGES } from '@/lib/fulfillment/reasons'
import { getInternalLoads } from '@/lib/fulfillment/slot-load'
import { loadValidQuote } from '@/lib/fulfillment/quote'
import {
  calculateTotal,
  calculateVoucherDiscount,
  checkVoucher,
  VOUCHER_ERROR_MESSAGES,
} from '@/lib/orders/pricing'
import { validateSchedule, SCHEDULE_ERROR_MESSAGES } from '@/lib/orders/schedule'
import type { CartItem, DeliverySlot } from '@/types'

export const createOrderSchema = z.object({
  fulfillmentMethod: z.enum(['internal', 'grab', 'pickup']).default('internal'),
  // Wajib untuk grab: id quote dari POST /api/checkout/grab-quote
  quoteId: z.string().uuid().optional().nullable(),
  // Wajib bila diantar; diabaikan untuk ambil di toko
  addressId: z.string().uuid().optional().nullable(),
  deliveryDate: z.string().refine(isValidDateString, 'Tanggal tidak valid'),
  deliverySlot: z.string().uuid(),
  paymentMethod: z.enum(['qris', 'transfer', 'cod']),
  voucherCode: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  // Hanya dipakai bila profil belum punya nama/telepon
  fullName: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export class OrderError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 422
  ) {
    super(message)
  }
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  const admin = createAdminClient()

  const voucherCode = input.voucherCode?.trim().toUpperCase() || null

  const method = input.fulfillmentMethod
  const settings = await getSettingsFresh() // keputusan memakai data fresh, bukan cache (§11.3)

  const [cartRes, addressRes, profileRes, slotsRes, voucherRes] = await Promise.all([
    admin.from('cart_items').select('*, product:products(*)').eq('user_id', userId),
    method !== 'pickup' && input.addressId
      ? admin.from('addresses').select('*').eq('id', input.addressId).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin.from('profiles').select('id, full_name, phone').eq('id', userId).maybeSingle(),
    admin.from('delivery_slots').select('*').eq('is_active', true),
    voucherCode
      ? admin.from('vouchers').select('*').eq('code', voucherCode).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const cartItems = (cartRes.data || []) as CartItem[]
  if (cartItems.length === 0) throw new OrderError('CART_EMPTY', 'Keranjang kosong')

  const address = addressRes.data
  if (method !== 'pickup' && !address) {
    throw new OrderError('ADDRESS_NOT_FOUND', 'Alamat pengiriman tidak ditemukan')
  }

  for (const item of cartItems) {
    if (!item.product || !item.product.is_active) {
      throw new OrderError(
        'PRODUCT_UNAVAILABLE',
        `${item.product?.name ?? 'Produk'} sudah tidak tersedia, silakan perbarui keranjang`
      )
    }
  }

  // Profil: nama & telepon wajib ada sebelum order
  const profile = profileRes.data
  const needsProfile = !profile?.full_name || !profile?.phone
  if (needsProfile) {
    if (!input.fullName || !input.phone) {
      throw new OrderError('PROFILE_REQUIRED', 'Nama dan nomor WhatsApp wajib diisi')
    }
    await admin
      .from('profiles')
      .update({ full_name: input.fullName, phone: input.phone })
      .eq('id', userId)
  }

  // Jadwal pengiriman
  const hasPreorder = cartItems.some((i) => i.product?.is_preorder)
  const maxPreorderDays = cartItems.reduce((max, i) => Math.max(max, i.product?.preorder_days || 0), 0)
  const scheduleError = validateSchedule({
    deliveryDate: input.deliveryDate,
    slotId: input.deliverySlot,
    activeSlots: (slotsRes.data || []) as DeliverySlot[],
    isPreorder: hasPreorder,
    maxPreorderDays,
  })
  if (scheduleError) throw new OrderError(scheduleError, SCHEDULE_ERROR_MESSAGES[scheduleError], 409)

  // Metode pengiriman: aturan kelayakan dihitung ulang di server (invarian I1)
  const slot = (slotsRes.data || []).find((sl: DeliverySlot) => sl.id === input.deliverySlot) as DeliverySlot
  const timing = timingOf(slot)

  let distanceKm: number | null = null
  if (method !== 'pickup' && address) {
    if (address.latitude == null || address.longitude == null) {
      throw new OrderError('NO_LOCATION', REASON_MESSAGES.NO_LOCATION, 409)
    }
    distanceKm = roundKm(
      haversineKm(
        { latitude: settings.store_latitude, longitude: settings.store_longitude },
        { latitude: address.latitude, longitude: address.longitude }
      )
    )
  }

  const weightGrams = cartWeightGrams(
    cartItems.map((i) => ({ quantity: i.quantity, product: i.product! })),
    settings
  )

  // Beban kurir internal pada slot + tanggal ini (pemeriksaan final tetap di RPC, race-safe)
  const internalLoad =
    method === 'internal' && slot.internal_capacity != null
      ? (await getInternalLoads(admin, input.deliveryDate, settings.payment_hold_minutes))[slot.id] ?? 0
      : 0

  // Grab: quote harus valid (milik user, alamat & isi cart sama, belum kedaluwarsa)
  let grabQuote: { id: string; fee: number } | null = null
  if (method === 'grab') {
    if (!input.quoteId || !address) throw new OrderError('QUOTE_EXPIRED', 'Ongkir kedaluwarsa, hitung ulang', 409)
    grabQuote = await loadValidQuote(userId, input.quoteId, address.id, cartItems)
    if (!grabQuote) throw new OrderError('QUOTE_EXPIRED', 'Ongkir kedaluwarsa, hitung ulang', 409)
  }

  const fulfillment = eligible(method, {
    distanceKm,
    cartFlags: Array.from(new Set(cartItems.flatMap((i) => i.product?.flags ?? []))),
    cartWeightGrams: weightGrams,
    hasPreorder,
    slot,
    now: new Date(),
    settings,
    internalLoad,
    grabQuoteAvailable: method === 'grab' ? true : undefined,
  })
  if (!fulfillment.ok) {
    throw new OrderError(fulfillment.reason, REASON_MESSAGES[fulfillment.reason], 409)
  }

  if (!allowedPaymentMethods(method).includes(input.paymentMethod)) {
    throw new OrderError('PAYMENT_NOT_ALLOWED', 'Metode pembayaran tidak tersedia untuk pengiriman ini', 409)
  }

  const shippingFee = method === 'grab' ? grabQuote!.fee : method === 'internal' ? settings.internal_fee : 0

  // Harga (perilaku saat ini dipertahankan: harga produk normal, tanpa promo, lihat K17)
  const subtotal = cartItems.reduce((acc, item) => acc + calculateCartItemTotal(item), 0)

  let discount = 0
  let voucherId: string | null = null
  if (voucherCode) {
    const voucher = voucherRes.data
    if (!voucher) throw new OrderError('VOUCHER_INVALID', 'Kode voucher tidak ditemukan')
    const voucherError = checkVoucher(voucher, subtotal)
    if (voucherError) throw new OrderError(`VOUCHER_${voucherError}`, VOUCHER_ERROR_MESSAGES[voucherError], 409)
    discount = calculateVoucherDiscount(subtotal, voucher)
    voucherId = voucher.id
  }

  const total = calculateTotal(subtotal, discount, shippingFee)

  const items = cartItems.map((item) => ({
    product_id: item.product_id,
    product_snapshot: {
      id: item.product?.id,
      name: item.product?.name,
      image_url: item.product?.image_url,
      price: item.product?.price,
      unit: item.product?.unit,
      unit_value: item.product?.unit_value,
      is_bulk_pricing: item.product?.is_bulk_pricing,
    },
    quantity: item.quantity,
    price: item.product?.price || 0,
    discount: 0,
    subtotal: calculateCartItemTotal(item),
  }))

  const { data, error } = await admin.rpc('create_order', {
    p: {
      user_id: userId,
      payment_method: input.paymentMethod,
      subtotal,
      discount,
      voucher_id: voucherId,
      total,
      // Pickup memakai snapshot alamat TOKO agar halaman/notifikasi yang membaca alamat tidak crash
      address_snapshot: address
        ? {
            label: address.label,
            address: address.address,
            province: address.province || '',
            city: address.city,
            district: address.district,
            village: address.village || '',
            postal_code: address.postal_code,
            notes: address.notes,
            // Koordinat ikut disimpan: dipakai saat booking kurir online
            latitude: address.latitude ?? null,
            longitude: address.longitude ?? null,
          }
        : {
            label: 'Ambil di Toko',
            address: settings.store_address || settings.store_name,
            province: '',
            city: '',
            district: '',
            village: '',
            postal_code: '',
            notes: null,
            is_pickup: true,
          },
      fulfillment_method: method,
      fulfillment_timing: timing,
      shipping_fee: shippingFee,
      distance_km: distanceKm,
      total_weight_grams: weightGrams,
      delivery_slot_name: slot.name,
      delivery_date: input.deliveryDate,
      delivery_slot: input.deliverySlot,
      notes: input.notes || null,
      items,
    },
  })

  if (error) {
    if (error.message.includes('SLOT_FULL')) {
      throw new OrderError('SLOT_FULL', REASON_MESSAGES.SLOT_FULL, 409)
    }
    if (error.message.includes('VOUCHER_EXHAUSTED')) {
      throw new OrderError('VOUCHER_EXHAUSTED', VOUCHER_ERROR_MESSAGES.EXHAUSTED, 409)
    }
    console.error('create_order RPC error:', error)
    throw new OrderError('CREATE_FAILED', 'Gagal membuat pesanan', 500)
  }

  // Quote sekali pakai (best effort; kedaluwarsa sendiri dalam 15 menit)
  if (grabQuote) {
    await admin.from('shipping_quotes').delete().eq('id', grabQuote.id)
  }

  return data as { id: string; order_number: string; pickup_code: string | null }
}
