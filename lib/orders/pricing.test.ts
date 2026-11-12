import { describe, it, expect } from 'vitest'
import { calculateVoucherDiscount, calculateTotal, checkVoucher, type VoucherLike } from './pricing'

const base: VoucherLike = {
  type: 'percentage',
  value: 10,
  min_purchase: 0,
  max_discount: null,
  usage_limit: 0,
  used_count: 0,
  start_date: '2026-01-01T00:00:00Z',
  end_date: '2027-01-01T00:00:00Z',
  is_active: true,
}

describe('calculateVoucherDiscount', () => {
  it('persen dibulatkan ke bawah (integer)', () => {
    expect(calculateVoucherDiscount(10_333, base)).toBe(1033)
  })
  it('dibatasi max_discount', () => {
    expect(calculateVoucherDiscount(100_000, { ...base, value: 50, max_discount: 20_000 })).toBe(20_000)
  })
  it('max_discount 0/null = tanpa batas', () => {
    expect(calculateVoucherDiscount(100_000, { ...base, value: 50, max_discount: 0 })).toBe(50_000)
  })
  it('fixed tidak boleh melebihi subtotal (total tidak negatif)', () => {
    expect(calculateVoucherDiscount(15_000, { ...base, type: 'fixed', value: 50_000 })).toBe(15_000)
    expect(calculateTotal(15_000, 15_000)).toBe(0)
  })
  it('tanpa voucher = 0', () => {
    expect(calculateVoucherDiscount(50_000, null)).toBe(0)
  })
})

describe('checkVoucher', () => {
  const now = new Date('2026-06-01T00:00:00Z')
  it('valid', () => expect(checkVoucher(base, 10_000, now)).toBeNull())
  it('kedaluwarsa', () =>
    expect(checkVoucher({ ...base, end_date: '2026-05-01T00:00:00Z' }, 10_000, now)).toBe('EXPIRED'))
  it('minimum belanja', () =>
    expect(checkVoucher({ ...base, min_purchase: 50_000 }, 10_000, now)).toBe('MIN_PURCHASE'))
  it('kuota habis; usage_limit 0 = tak terbatas', () => {
    expect(checkVoucher({ ...base, usage_limit: 5, used_count: 5 }, 10_000, now)).toBe('EXHAUSTED')
    expect(checkVoucher({ ...base, usage_limit: 0, used_count: 999 }, 10_000, now)).toBeNull()
  })
  it('nonaktif', () => expect(checkVoucher({ ...base, is_active: false }, 10_000, now)).toBe('INACTIVE'))
})

describe('calculateTotal', () => {
  it('menambah ongkir setelah diskon', () => expect(calculateTotal(100_000, 10_000, 18_000)).toBe(108_000))
})
