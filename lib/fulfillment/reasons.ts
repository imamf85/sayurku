export type ReasonCode =
  | 'INTERNAL_OFF'
  | 'OUT_OF_RANGE'
  | 'NO_LOCATION'
  | 'PICKUP_ONLY_ITEM'
  | 'SLOT_FULL'
  | 'OUTSIDE_HOURS'
  | 'SLOT_NOT_FOR_METHOD'
  | 'PREORDER'
  | 'GRAB_OFF'
  | 'GRAB_ASAP_ONLY'
  | 'ITEM_NOT_ALLOWED'
  | 'TOO_HEAVY'
  | 'NO_COURIER'
  | 'GRAB_UNAVAILABLE'
  | 'PICKUP_OFF'
  | 'STORE_CLOSED'

export const REASON_MESSAGES: Record<ReasonCode, string> = {
  INTERNAL_OFF: 'Kurir Sayurku sedang tidak tersedia',
  OUT_OF_RANGE: 'Kurir Sayurku hanya melayani alamat dalam jangkauan toko',
  NO_LOCATION: 'Pasang titik lokasi pada alamat terlebih dahulu',
  PICKUP_ONLY_ITEM: 'Keranjang berisi produk yang hanya bisa diambil di toko',
  SLOT_FULL: 'Slot ini sudah penuh',
  OUTSIDE_HOURS: 'Di luar jam kerja kurir, pilih jadwal lain',
  SLOT_NOT_FOR_METHOD: 'Waktu ini tidak tersedia untuk metode yang dipilih',
  PREORDER: 'Pre-order hanya bisa dijadwalkan, tidak bisa secepatnya',
  GRAB_OFF: 'Kurir online belum tersedia',
  GRAB_ASAP_ONLY: 'Kurir online hanya untuk pengiriman secepatnya',
  ITEM_NOT_ALLOWED: 'Ada produk yang tidak bisa dikirim lewat kurir online',
  TOO_HEAVY: 'Pesanan terlalu berat untuk kurir online',
  NO_COURIER: 'Belum ada kurir yang melayani alamat ini',
  GRAB_UNAVAILABLE: 'Kurir online sedang bermasalah, coba lagi sebentar',
  PICKUP_OFF: 'Ambil di toko sedang tidak tersedia',
  STORE_CLOSED: 'Toko sedang tutup, pilih jadwal lain',
}
