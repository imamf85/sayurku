// Logika murni untuk Grab (via Biteship): pilihan layanan menurut berat, ongkir untuk customer,
// hash isi keranjang. Tanpa I/O.
import { createHash } from 'crypto'

export type GrabService = 'instant' | 'instant_car'

/** Motor sampai batas bike; mobil sampai batas car; lebih dari itu tidak ada opsi. */
export function selectGrabService(
  weightGrams: number,
  limits: { grab_bike_max_grams: number; grab_car_max_grams: number }
): GrabService | null {
  if (weightGrams <= limits.grab_bike_max_grams) return 'instant'
  if (weightGrams <= limits.grab_car_max_grams) return 'instant_car'
  return null
}

/** Ongkir customer = harga Biteship + markup, dibulatkan KE ATAS ke kelipatan `rounding` (I4). */
export function computeGrabFee(price: number, markup: number, rounding: number): number {
  const base = Math.max(0, Math.ceil(price)) + Math.max(0, Math.floor(markup))
  const step = Math.max(1, Math.floor(rounding))
  return Math.ceil(base / step) * step
}

/** Hash isi keranjang (urutan item tidak berpengaruh); quote tidak valid bila isi berubah. */
export function cartHash(items: { product_id: string; quantity: number }[]): string {
  const canonical = items
    .map((i) => `${i.product_id}:${i.quantity}`)
    .sort()
    .join('|')
  return createHash('sha256').update(canonical).digest('hex')
}

/** Biteship mengembalikan durasi berbahasa Inggris ("1 - 3 Hours"); tampilkan dalam bahasa Indonesia. */
export function formatDuration(text: string | null | undefined): string | null {
  if (!text) return null
  return text
    .replace(/\bhours?\b/gi, 'jam')
    .replace(/\bdays?\b/gi, 'hari')
    .replace(/\b(minutes?|mins?)\b/gi, 'menit')
    .replace(/\s*-\s*/g, ' - ')
    .trim()
}
