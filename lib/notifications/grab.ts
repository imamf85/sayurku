// Template WhatsApp untuk pengiriman GrabExpress. Murni (tanpa I/O).
export function grabSearchingMessage(p: { orderNumber: string; trackingUrl: string }): string {
  return `*Mencari Kurir - Sayurku*

*No. Pesanan:* ${p.orderNumber}

Kami sedang memanggil kurir GrabExpress untuk mengantar pesanan Anda. Anda akan dikabari saat driver ditemukan.

Detail pesanan:
${p.trackingUrl}`
}

export function grabDriverToStoreMessage(p: {
  orderNumber: string
  driverName?: string | null
  plate?: string | null
  trackingUrl: string
}): string {
  const driver = [p.driverName, p.plate ? `(${p.plate})` : ''].filter(Boolean).join(' ')
  return `*Kurir Menuju Toko - Sayurku*

*No. Pesanan:* ${p.orderNumber}
${driver ? `*Driver:* ${driver}\n` : ''}
Driver GrabExpress sedang menuju toko untuk mengambil pesanan Anda.

Lacak pesanan:
${p.trackingUrl}`
}

export function grabOnTheWayMessage(p: {
  orderNumber: string
  driverName?: string | null
  driverPhone?: string | null
  plate?: string | null
  courierLink?: string | null
  trackingUrl: string
}): string {
  const driver = [p.driverName, p.plate ? `(${p.plate})` : ''].filter(Boolean).join(' ')
  return `*Pesanan Dalam Perjalanan - Sayurku*

*No. Pesanan:* ${p.orderNumber}
${driver ? `*Driver:* ${driver}\n` : ''}${p.driverPhone ? `*Telp driver:* ${p.driverPhone}\n` : ''}
Pesanan Anda sedang diantar GrabExpress.

${p.courierLink ? `Lacak langsung posisi driver:\n${p.courierLink}\n\n` : ''}Detail pesanan:
${p.trackingUrl}`
}

export function grabDeliveredMessage(p: { orderNumber: string; trackingUrl: string }): string {
  return `*Pesanan Telah Tiba - Sayurku*

*No. Pesanan:* ${p.orderNumber}

Pesanan Anda telah sampai di tujuan. Terima kasih telah berbelanja di Sayurku!

${p.trackingUrl}`
}

export function grabAdminAlertMessage(p: {
  orderNumber: string
  orderId: string
  status: string
  appUrl: string
  hint: string
}): string {
  return `*Perhatian: Pengiriman Grab Bermasalah - Sayurku*

Pesanan *${p.orderNumber}*: status kurir *${p.status}*.
${p.hint}

Tindak lanjuti di:
${p.appUrl}/admin/orders/${p.orderId}`
}
