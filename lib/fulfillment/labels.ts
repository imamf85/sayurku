// Label & urutan langkah per metode pengiriman. Satu sumber untuk semua halaman.
import type { FulfillmentMethod, OrderStatus } from '@/types'
import { getStatusLabel } from '@/lib/utils'

export const FULFILLMENT_LABELS: Record<FulfillmentMethod, string> = {
  internal: 'Kurir Sayurku',
  grab: 'GrabExpress',
  pickup: 'Ambil di Toko',
}

/** Langkah progres yang ditampilkan ke customer */
export function progressSteps(method: FulfillmentMethod | null | undefined): OrderStatus[] {
  return method === 'pickup'
    ? ['processing', 'ready_for_pickup', 'delivered']
    : ['processing', 'shipping', 'delivered']
}

/** Label status yang menyesuaikan metode (pickup: "Diambil", bukan "Diterima") */
export function statusLabelFor(status: string, method: FulfillmentMethod | null | undefined): string {
  if (method === 'pickup') {
    if (status === 'delivered') return 'Sudah Diambil'
    if (status === 'shipping') return 'Siap Diambil'
  }
  return getStatusLabel(status)
}

export const isPickup = (o: { fulfillment_method?: string | null }) => o.fulfillment_method === 'pickup'

/** Link Google Maps ke koordinat */
export const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`
