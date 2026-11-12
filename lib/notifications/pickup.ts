// Template WhatsApp untuk alur Ambil di Toko. Murni (tanpa I/O).
import { mapsUrl } from '@/lib/fulfillment/labels'

interface StoreInfo {
  store_name: string
  store_address: string
  store_phone: string
  store_latitude: number
  store_longitude: number
  store_open: string
  store_close: string
}

function storeBlock(store: StoreInfo): string {
  return [
    `*${store.store_name}*`,
    store.store_address,
    `Buka ${store.store_open} - ${store.store_close} WIB`,
    store.store_phone ? `Telp: ${store.store_phone}` : '',
    `Peta: ${mapsUrl(store.store_latitude, store.store_longitude)}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function pickupReadyMessage(p: {
  orderNumber: string
  pickupCode: string | null
  store: StoreInfo
  trackingUrl: string
  payAtStore: boolean
  total: number
}): string {
  return `*Pesanan Siap Diambil - Sayurku*

*No. Pesanan:* ${p.orderNumber}
${p.pickupCode ? `*Kode ambil:* ${p.pickupCode}\n` : ''}
Pesanan Anda sudah siap. Tunjukkan kode ambil kepada petugas toko.${
    p.payAtStore ? `\nPembayaran dilakukan di toko: Rp ${p.total.toLocaleString('id-ID')}.` : ''
  }

${storeBlock(p.store)}

Detail pesanan:
${p.trackingUrl}`
}

export function pickupReminderMessage(p: {
  orderNumber: string
  pickupCode: string | null
  store: StoreInfo
  trackingUrl: string
}): string {
  return `*Pengingat Ambil Pesanan - Sayurku*

Pesanan *${p.orderNumber}* masih menunggu Anda ambil di toko.
${p.pickupCode ? `*Kode ambil:* ${p.pickupCode}\n` : ''}
${storeBlock(p.store)}

Detail pesanan:
${p.trackingUrl}`
}

export function pickupDoneMessage(p: { orderNumber: string; trackingUrl: string }): string {
  return `*Pesanan Telah Diambil - Sayurku*

*No. Pesanan:* ${p.orderNumber}

Terima kasih telah berbelanja di Sayurku!

${p.trackingUrl}`
}
