import { describe, it, expect } from 'vitest'
import { haversineKm } from './distance'
import { cartWeightGrams } from './weight'
import { eligible, allowedPaymentMethods, type EligibilityContext } from './eligibility'

const settings = {
  internal_enabled: true,
  internal_min_km: 0,
  internal_max_km: 3,
  internal_hours_start: '07:00',
  internal_hours_end: '17:00',
  grab_enabled: true,
  grab_car_max_grams: 150000,
  pickup_enabled: true,
  pickup_asap_cutoff_minutes: 60,
  store_open: '07:00',
  store_close: '20:00',
}
// 10:00 WIB
const now = new Date('2026-11-12T03:00:00Z')
const base: EligibilityContext = {
  distanceKm: 2,
  cartFlags: [],
  cartWeightGrams: 3000,
  hasPreorder: false,
  slot: { slot_type: 'instant', applies_to: 'both', internal_capacity: null },
  now,
  settings,
  internalLoad: 0,
}
const with_ = (o: Partial<EligibilityContext>): EligibilityContext => ({ ...base, ...o })
const reason = (m: 'internal' | 'grab' | 'pickup', o: Partial<EligibilityContext>) => {
  const r = eligible(m, with_(o))
  return r.ok ? 'OK' : r.reason
}

describe('haversine', () => {
  it('±1 km untuk ~0.009° lintang', () => {
    const d = haversineKm({ latitude: -6.2, longitude: 106.8 }, { latitude: -6.209, longitude: 106.8 })
    expect(d).toBeGreaterThan(0.95)
    expect(d).toBeLessThan(1.05)
  })
  it('titik sama = 0', () => {
    expect(haversineKm({ latitude: 1, longitude: 1 }, { latitude: 1, longitude: 1 })).toBe(0)
  })
})

describe('cartWeightGrams', () => {
  const s = { packaging_grams: 200, default_item_grams: 500 }
  it('menjumlah per jenis satuan + kemasan', () => {
    const w = cartWeightGrams(
      [
        { quantity: 2, product: { unit: 'kg', unit_value: 1, price: 20000 } }, // 2000
        { quantity: 3, product: { unit: 'gram', unit_value: 250, price: 5000 } }, // 750
        { quantity: 4, product: { unit: 'ons', unit_value: 1, price: 3000 } }, // 400
        { quantity: 2, product: { unit: 'ikat', unit_value: 1, price: 3000, weight_grams: 300 } }, // 600
        { quantity: 2, product: { unit: 'pcs', unit_value: 1, price: 3000 } }, // 1000 (default)
        { quantity: 10000, product: { unit: 'kg', unit_value: 1, price: 20000, is_bulk_pricing: true } }, // 500
      ],
      s
    )
    expect(w).toBe(2000 + 750 + 400 + 600 + 1000 + 500 + 200)
  })
})

describe('eligible: internal', () => {
  it('dalam radius, asap, jam kerja → ok', () => expect(reason('internal', {})).toBe('OK'))
  it('toggle mati', () => expect(reason('internal', { settings: { ...settings, internal_enabled: false } })).toBe('INTERNAL_OFF'))
  it('di luar radius', () => expect(reason('internal', { distanceKm: 3.01 })).toBe('OUT_OF_RANGE'))
  it('batas 3.00 km masih ok', () => expect(reason('internal', { distanceKm: 3 })).toBe('OK'))
  it('belum ada pin', () => expect(reason('internal', { distanceKm: null })).toBe('NO_LOCATION'))
  it('produk pickup_only', () => expect(reason('internal', { cartFlags: ['pickup_only'] })).toBe('PICKUP_ONLY_ITEM'))
  it('asap di luar jam kerja (18:00 WIB)', () =>
    expect(reason('internal', { now: new Date('2026-11-12T11:00:00Z') })).toBe('OUTSIDE_HOURS'))
  it('scheduled tidak dibatasi jam kerja asap', () =>
    expect(
      reason('internal', { slot: { slot_type: 'scheduled', internal_capacity: null }, now: new Date('2026-11-12T11:00:00Z') })
    ).toBe('OK'))
  it('kapasitas penuh', () =>
    expect(reason('internal', { slot: { slot_type: 'scheduled', internal_capacity: 5 }, internalLoad: 5 })).toBe('SLOT_FULL'))
  it('kapasitas belum penuh', () =>
    expect(reason('internal', { slot: { slot_type: 'scheduled', internal_capacity: 5 }, internalLoad: 4 })).toBe('OK'))
  it('preorder tidak boleh asap', () => expect(reason('internal', { hasPreorder: true })).toBe('PREORDER'))
  it('slot khusus pickup', () =>
    expect(reason('internal', { slot: { slot_type: 'scheduled', applies_to: 'pickup' } })).toBe('SLOT_NOT_FOR_METHOD'))
  it('radius minimum 1 km menolak alamat < 1 km', () =>
    expect(reason('internal', { distanceKm: 0.5, settings: { ...settings, internal_min_km: 1 } })).toBe('OUT_OF_RANGE'))
})

describe('eligible: pickup', () => {
  it('asap saat toko buka → ok, jarak tidak relevan', () => expect(reason('pickup', { distanceKm: null })).toBe('OK'))
  it('asap setelah cutoff (19:30 WIB, cutoff 60 menit)', () =>
    expect(reason('pickup', { now: new Date('2026-11-12T12:30:00Z') })).toBe('STORE_CLOSED'))
  it('asap sebelum buka (06:00 WIB)', () =>
    expect(reason('pickup', { now: new Date('2026-11-11T23:00:00Z') })).toBe('STORE_CLOSED'))
  it('scheduled tidak kena cutoff', () =>
    expect(reason('pickup', { slot: { slot_type: 'scheduled' }, now: new Date('2026-11-12T12:30:00Z') })).toBe('OK'))
  it('pickup nonaktif', () => expect(reason('pickup', { settings: { ...settings, pickup_enabled: false } })).toBe('PICKUP_OFF'))
  it('slot khusus delivery', () =>
    expect(reason('pickup', { slot: { slot_type: 'scheduled', applies_to: 'delivery' } })).toBe('SLOT_NOT_FOR_METHOD'))
  it('pickup_only item tetap boleh diambil', () => expect(reason('pickup', { cartFlags: ['pickup_only'] })).toBe('OK'))
})

describe('eligible: grab', () => {
  it('asap, ringan → ok', () => expect(reason('grab', {})).toBe('OK'))
  it('hanya asap', () => expect(reason('grab', { slot: { slot_type: 'scheduled' } })).toBe('GRAB_ASAP_ONLY'))
  it('flag no_grab / pickup_only', () => {
    expect(reason('grab', { cartFlags: ['no_grab'] })).toBe('ITEM_NOT_ALLOWED')
    expect(reason('grab', { cartFlags: ['pickup_only'] })).toBe('ITEM_NOT_ALLOWED')
  })
  it('terlalu berat', () => expect(reason('grab', { cartWeightGrams: 150001 })).toBe('TOO_HEAVY'))
  it('tidak ada kurir dari Rates', () => expect(reason('grab', { grabQuoteAvailable: false })).toBe('NO_COURIER'))
  it('nonaktif', () => expect(reason('grab', { settings: { ...settings, grab_enabled: false } })).toBe('GRAB_OFF'))
  it('berlaku untuk semua jarak', () => expect(reason('grab', { distanceKm: 35 })).toBe('OK'))
})

describe('allowedPaymentMethods', () => {
  it('grab tanpa COD', () => expect(allowedPaymentMethods('grab')).toEqual(['qris', 'transfer']))
  it('internal & pickup boleh COD', () => {
    expect(allowedPaymentMethods('internal')).toContain('cod')
    expect(allowedPaymentMethods('pickup')).toContain('cod')
  })
})
