const FONNTE_API_KEY = process.env.FONNTE_API_KEY!

interface SendMessageParams {
  to: string
  message: string
}

export async function sendWhatsAppMessage(params: SendMessageParams): Promise<boolean> {
  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: params.to,
        message: params.message,
        countryCode: '62',
      }),
    })

    const data = await response.json()
    return data.status === true
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return false
  }
}

export function formatOrderCreatedMessage(
  orderNumber: string,
  total: number,
  paymentUrl: string
): string {
  return `*Pesanan Baru - Sayurku*

No. Pesanan: ${orderNumber}
Total: Rp ${total.toLocaleString('id-ID')}

Silakan selesaikan pembayaran Anda melalui link berikut:
${paymentUrl}

Terima kasih telah berbelanja di Sayurku!`
}

export function formatPaymentSuccessMessage(
  orderNumber: string,
  total: number,
  deliveryDate: string,
  deliverySlot: string
): string {
  return `*Pembayaran Berhasil - Sayurku*

No. Pesanan: ${orderNumber}
Total: Rp ${total.toLocaleString('id-ID')}

Pesanan Anda akan dikirim pada:
Tanggal: ${deliveryDate}
Waktu: ${deliverySlot}

Terima kasih!`
}

export function formatOrderShippingMessage(
  orderNumber: string,
  address: string
): string {
  return `*Pesanan Dikirim - Sayurku*

No. Pesanan: ${orderNumber}

Pesanan Anda sedang dalam perjalanan ke:
${address}

Harap bersiap untuk menerima pesanan Anda.`
}

export function formatOrderDeliveredMessage(orderNumber: string): string {
  return `*Pesanan Diterima - Sayurku*

No. Pesanan: ${orderNumber}

Pesanan Anda telah sampai. Terima kasih telah berbelanja di Sayurku!

Jangan lupa berikan ulasan untuk produk yang Anda beli.`
}

export function formatAdminNewOrderMessage(
  orderNumber: string,
  customerName: string,
  total: number,
  itemCount: number
): string {
  return `*Pesanan Baru Masuk*

No. Pesanan: ${orderNumber}
Pelanggan: ${customerName}
Total: Rp ${total.toLocaleString('id-ID')}
Jumlah Item: ${itemCount}

Silakan cek admin panel untuk detail.`
}

export function formatOtpMessage(otp: string): string {
  return `*Kode OTP Sayurku*

Kode verifikasi Anda: *${otp}*

Kode ini berlaku selama 10 menit.
Jangan bagikan kode ini kepada siapapun.`
}
