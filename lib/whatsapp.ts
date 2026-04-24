// WAHA API Configuration
const WAHA_API_URL = process.env.WAHA_API_URL || 'https://waha-eqxohkwqvpug.bakpau.sumopod.my.id'
const WAHA_API_KEY = process.env.WAHA_API_KEY!
const WAHA_SESSION = process.env.WAHA_SESSION || 'sayurku'

interface SendMessageParams {
  to: string
  message: string
}

/**
 * Format phone number to WAHA chatId format
 * Input: 081234567890 or 6281234567890 or +6281234567890
 * Output: 6281234567890@c.us
 */
function formatChatId(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Add country code 62 if starts with 0
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1)
  }

  // Add @c.us suffix for individual chat
  return `${cleaned}@c.us`
}

export async function sendWhatsAppMessage(params: SendMessageParams): Promise<boolean> {
  try {
    const chatId = formatChatId(params.to)

    const response = await fetch(`${WAHA_API_URL}/api/sendText`, {
      method: 'POST',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        text: params.message,
        session: WAHA_SESSION,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('WAHA API error:', response.status, errorData)
      return false
    }

    const data = await response.json()
    // WAHA returns the message object if successful
    return !!data.id
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return false
  }
}

/**
 * Check WAHA session status
 */
export async function checkSessionStatus(): Promise<{ success: boolean; status?: string }> {
  try {
    const response = await fetch(`${WAHA_API_URL}/api/sessions/${WAHA_SESSION}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
      },
    })

    if (!response.ok) {
      return { success: false }
    }

    const data = await response.json()
    return { success: true, status: data.status }
  } catch (error) {
    console.error('Check session error:', error)
    return { success: false }
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
