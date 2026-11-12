// Efek samping tunggal setelah pembayaran terkonfirmasi, dari jalur mana pun
// (payments/confirm, batch-confirm, webhook Xendit). Dipanggil SETELAH transitionOrder berhasil.
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatPrice } from '@/lib/utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

export async function onOrderPaid(admin: SupabaseClient, orderId: string): Promise<void> {
  try {
    const { data: order } = await admin
      .from('orders')
      .select('id, order_number, total, fulfillment_method, shipping_fee')
      .eq('id', orderId)
      .single()

    if (!order) return

    // Grab: driver datang ±1 jam setelah dipesan, jadi admin harus memanggil kurir SEGERA
    if (order.fulfillment_method === 'grab') {
      const adminPhone = process.env.ADMIN_WHATSAPP
      if (!adminPhone) return
      await sendWhatsAppMessage({
        to: adminPhone,
        message: `*Panggil GrabExpress Sekarang - Sayurku*

Pesanan *${order.order_number}* (Grab) sudah dibayar: ${formatPrice(order.total)}.

Driver datang ±1 jam setelah dipesan. Panggil kurir sekarang, lalu packing sambil menunggu.

Buka pesanan:
${APP_URL}/admin/orders/${order.id}`,
      })
    }
  } catch (error) {
    // Notifikasi tidak boleh menggagalkan konfirmasi pembayaran
    console.error('onOrderPaid error:', error)
  }
}
