// Quote ongkir GrabExpress (server-only). Disimpan di shipping_quotes (TTL 15 menit, sekali pakai)
// agar harga yang dibayar customer tidak bisa dimanipulasi dari client (I1) dan kuota Rates hemat.
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettingsFresh } from '@/lib/settings'
import { calculateCartItemTotal } from '@/lib/utils'
import { haversineKm, roundKm } from '@/lib/fulfillment/distance'
import { cartWeightGrams } from '@/lib/fulfillment/weight'
import { eligible } from '@/lib/fulfillment/eligibility'
import { cartHash, computeGrabFee, selectGrabService } from '@/lib/fulfillment/grab'
import type { ReasonCode } from '@/lib/fulfillment/reasons'
import { BiteshipError, isBiteshipConfigured } from '@/lib/biteship/client'
import { durationText, getGrabPricing, pickGrabService } from '@/lib/biteship/rates'
import type { CartItem } from '@/types'

export const QUOTE_TTL_MS = 15 * 60_000

export interface GrabQuote {
  id: string
  fee: number
  courier_service: 'instant' | 'instant_car'
  duration_text: string | null
  distance_km: number | null
  expires_at: string
}

export type QuoteResult = { ok: true; quote: GrabQuote } | { ok: false; reason: ReasonCode }

export class QuoteInputError extends Error {}

export async function getOrCreateGrabQuote(userId: string, addressId: string): Promise<QuoteResult> {
  const admin = createAdminClient()
  const settings = await getSettingsFresh()

  const [cartRes, addressRes] = await Promise.all([
    admin.from('cart_items').select('*, product:products(*)').eq('user_id', userId),
    admin.from('addresses').select('*').eq('id', addressId).eq('user_id', userId).maybeSingle(),
  ])

  const items = (cartRes.data || []) as CartItem[]
  if (items.length === 0) throw new QuoteInputError('Keranjang kosong')
  const address = addressRes.data
  if (!address) throw new QuoteInputError('Alamat tidak ditemukan')

  const hasPin = address.latitude != null && address.longitude != null
  const distanceKm = hasPin
    ? roundKm(
        haversineKm(
          { latitude: settings.store_latitude, longitude: settings.store_longitude },
          { latitude: address.latitude, longitude: address.longitude }
        )
      )
    : null

  const weightGrams = cartWeightGrams(
    items.map((i) => ({ quantity: i.quantity, product: i.product! })),
    settings
  )

  // Kelayakan (kecuali hasil Rates): setting, flag produk, berat, pin
  const check = eligible('grab', {
    distanceKm,
    cartFlags: Array.from(new Set(items.flatMap((i) => i.product?.flags ?? []))),
    cartWeightGrams: weightGrams,
    hasPreorder: items.some((i) => i.product?.is_preorder),
    slot: { slot_type: 'instant', applies_to: 'both' },
    now: new Date(),
    settings,
    internalLoad: 0,
  })
  if (!check.ok) return { ok: false, reason: check.reason }

  if (!isBiteshipConfigured()) {
    console.error('Grab quote: BITESHIP_API_KEY belum diisi')
    return { ok: false, reason: 'GRAB_UNAVAILABLE' }
  }

  const hash = cartHash(items)
  const select = 'id, fee, courier_service, duration_text, distance_km, expires_at'

  // Pakai ulang quote yang masih valid (hemat kuota Rates)
  const { data: existing } = await admin
    .from('shipping_quotes')
    .select(select)
    .eq('user_id', userId)
    .eq('address_id', addressId)
    .eq('cart_hash', hash)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing) return { ok: true, quote: existing as GrabQuote }

  const service = selectGrabService(weightGrams, settings)
  if (!service) return { ok: false, reason: 'TOO_HEAVY' }

  let pricing
  try {
    pricing = await getGrabPricing({
      origin: { latitude: settings.store_latitude, longitude: settings.store_longitude },
      destination: { latitude: address.latitude, longitude: address.longitude },
      weightGrams,
      valueRp: items.reduce((acc, i) => acc + calculateCartItemTotal(i), 0),
    })
  } catch (error) {
    console.error('Grab rates error:', error instanceof BiteshipError ? `${error.code} ${error.message}` : error)
    return { ok: false, reason: 'GRAB_UNAVAILABLE' }
  }

  const chosen = pickGrabService(pricing, service)
  if (!chosen) return { ok: false, reason: 'NO_COURIER' }

  const fee = computeGrabFee(chosen.price, settings.grab_fee_markup, settings.grab_fee_rounding)

  const { data: inserted, error } = await admin
    .from('shipping_quotes')
    .insert({
      user_id: userId,
      address_id: addressId,
      cart_hash: hash,
      courier_service: service,
      price: Math.ceil(chosen.price),
      fee,
      duration_text: durationText(chosen),
      distance_km: distanceKm,
      weight_grams: weightGrams,
      expires_at: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    })
    .select(select)
    .single()

  if (error || !inserted) {
    console.error('Gagal menyimpan shipping_quotes:', error)
    return { ok: false, reason: 'GRAB_UNAVAILABLE' }
  }
  return { ok: true, quote: inserted as GrabQuote }
}

/** Validasi quote saat order dibuat: milik user, alamat sama, isi cart sama, belum kedaluwarsa. */
export async function loadValidQuote(
  userId: string,
  quoteId: string,
  addressId: string,
  items: { product_id: string; quantity: number }[]
): Promise<{ id: string; fee: number; courier_service: string } | null> {
  const { data } = await createAdminClient()
    .from('shipping_quotes')
    .select('id, fee, courier_service, cart_hash, address_id, user_id, expires_at')
    .eq('id', quoteId)
    .maybeSingle()

  if (!data) return null
  if (data.user_id !== userId || data.address_id !== addressId) return null
  if (new Date(data.expires_at).getTime() <= Date.now()) return null
  if (data.cart_hash !== cartHash(items)) return null
  return { id: data.id, fee: data.fee, courier_service: data.courier_service }
}
