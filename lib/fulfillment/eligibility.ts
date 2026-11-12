// Aturan kelayakan metode pengiriman. MURNI (tanpa I/O): dipakai server (otoritatif)
// dan client (umpan balik instan). Lihat dokumen desain §5.2.
import { isWithinTime, jakartaMinutesOfDay, timeToMinutes } from '@/lib/time'
import type { ReasonCode } from './reasons'

export type FulfillmentMethod = 'internal' | 'grab' | 'pickup'
export type Timing = 'asap' | 'scheduled'

export interface EligibilitySettings {
  internal_enabled: boolean
  internal_min_km: number
  internal_max_km: number
  internal_hours_start: string
  internal_hours_end: string
  grab_enabled: boolean
  grab_car_max_grams: number
  pickup_enabled: boolean
  pickup_asap_cutoff_minutes: number
  store_open: string
  store_close: string
}

export interface EligibilitySlot {
  slot_type: 'instant' | 'scheduled'
  applies_to?: 'delivery' | 'pickup' | 'both'
  internal_capacity?: number | null
}

export interface EligibilityContext {
  distanceKm: number | null // null = alamat belum punya pin / tidak relevan
  cartFlags: readonly string[]
  cartWeightGrams: number
  hasPreorder: boolean
  slot: EligibilitySlot
  now: Date
  settings: EligibilitySettings
  /** Jumlah order internal pada slot + tanggal yang sama (hanya order yang dihitung kapasitas) */
  internalLoad: number
  /** Hasil Rates Grab (Fase 3). undefined = belum diketahui, tidak memblokir. */
  grabQuoteAvailable?: boolean
}

export type Eligibility = { ok: true } | { ok: false; reason: ReasonCode }

const ok: Eligibility = { ok: true }
const no = (reason: ReasonCode): Eligibility => ({ ok: false, reason })

export const timingOf = (slot: EligibilitySlot): Timing => (slot.slot_type === 'instant' ? 'asap' : 'scheduled')

export function eligible(method: FulfillmentMethod, ctx: EligibilityContext): Eligibility {
  const { settings: s, slot } = ctx
  const timing = timingOf(slot)
  const applies = slot.applies_to ?? 'both'

  if (method === 'internal') {
    if (!s.internal_enabled) return no('INTERNAL_OFF')
    if (ctx.cartFlags.includes('pickup_only')) return no('PICKUP_ONLY_ITEM')
    if (ctx.distanceKm == null) return no('NO_LOCATION')
    if (ctx.distanceKm < s.internal_min_km || ctx.distanceKm > s.internal_max_km) return no('OUT_OF_RANGE')
    if (applies === 'pickup') return no('SLOT_NOT_FOR_METHOD')
    if (timing === 'asap') {
      if (ctx.hasPreorder) return no('PREORDER')
      if (!isWithinTime(s.internal_hours_start, s.internal_hours_end, ctx.now)) return no('OUTSIDE_HOURS')
    }
    if (slot.internal_capacity != null && ctx.internalLoad >= slot.internal_capacity) return no('SLOT_FULL')
    return ok
  }

  if (method === 'pickup') {
    if (!s.pickup_enabled) return no('PICKUP_OFF')
    if (applies === 'delivery') return no('SLOT_NOT_FOR_METHOD')
    if (timing === 'asap') {
      if (ctx.hasPreorder) return no('PREORDER')
      const nowMin = jakartaMinutesOfDay(ctx.now)
      const open = timeToMinutes(s.store_open)
      const lastAsap = timeToMinutes(s.store_close) - s.pickup_asap_cutoff_minutes
      if (nowMin < open || nowMin >= lastAsap) return no('STORE_CLOSED')
    }
    return ok
  }

  // grab
  if (!s.grab_enabled) return no('GRAB_OFF')
  if (timing !== 'asap') return no('GRAB_ASAP_ONLY')
  if (ctx.hasPreorder) return no('PREORDER')
  if (ctx.cartFlags.includes('no_grab') || ctx.cartFlags.includes('pickup_only')) return no('ITEM_NOT_ALLOWED')
  if (ctx.cartWeightGrams > s.grab_car_max_grams) return no('TOO_HEAVY')
  if (ctx.distanceKm == null) return no('NO_LOCATION')
  if (ctx.grabQuoteAvailable === false) return no('NO_COURIER')
  return ok
}

/**
 * Aturan pembayaran per metode (dokumen §5.3, §14 poin 4). Grab: hanya QRIS, karena konfirmasi
 * otomatis lewat Xendit; transfer manual bisa tertunda berjam-jam sehingga "instan" tidak lagi instan
 * dan harga quote kedaluwarsa. COD tidak pernah untuk Grab.
 */
export function allowedPaymentMethods(method: FulfillmentMethod): Array<'qris' | 'transfer' | 'cod'> {
  return method === 'grab' ? ['qris'] : ['qris', 'transfer', 'cod']
}
