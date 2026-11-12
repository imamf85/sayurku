// Perhitungan harga murni (tanpa I/O). Dipakai server (otoritatif) dan UI (preview).
// Invarian I4: semua uang integer rupiah; total tidak pernah negatif.

export interface VoucherLike {
  type: 'percentage' | 'fixed'
  value: number
  min_purchase: number
  max_discount: number | null
  usage_limit: number // 0 = tak terbatas
  used_count: number
  start_date: string
  end_date: string
  is_active: boolean
}

export type VoucherError = 'INACTIVE' | 'EXPIRED' | 'MIN_PURCHASE' | 'EXHAUSTED'

export function checkVoucher(
  voucher: VoucherLike,
  subtotal: number,
  now: Date = new Date()
): VoucherError | null {
  if (!voucher.is_active) return 'INACTIVE'
  if (now < new Date(voucher.start_date) || now > new Date(voucher.end_date)) return 'EXPIRED'
  if (Number(voucher.min_purchase) > subtotal) return 'MIN_PURCHASE'
  if (voucher.usage_limit > 0 && voucher.used_count >= voucher.usage_limit) return 'EXHAUSTED'
  return null
}

/** Diskon voucher: persen dibulatkan ke bawah, dibatasi max_discount, lalu di-clamp ke subtotal. */
export function calculateVoucherDiscount(
  subtotal: number,
  voucher: Pick<VoucherLike, 'type' | 'value' | 'max_discount'> | null
): number {
  if (!voucher || subtotal <= 0) return 0

  let discount =
    voucher.type === 'percentage'
      ? Math.floor((subtotal * Number(voucher.value)) / 100)
      : Math.floor(Number(voucher.value))

  const cap = Number(voucher.max_discount)
  if (voucher.type === 'percentage' && cap > 0) discount = Math.min(discount, Math.floor(cap))

  return Math.max(0, Math.min(discount, subtotal))
}

export function calculateTotal(subtotal: number, discount: number, shippingFee = 0): number {
  return Math.max(0, subtotal - discount) + shippingFee
}

export const VOUCHER_ERROR_MESSAGES: Record<VoucherError, string> = {
  INACTIVE: 'Voucher tidak aktif',
  EXPIRED: 'Kode voucher sudah kadaluarsa atau belum berlaku',
  MIN_PURCHASE: 'Minimum pembelian voucher belum terpenuhi',
  EXHAUSTED: 'Kuota voucher sudah habis',
}
