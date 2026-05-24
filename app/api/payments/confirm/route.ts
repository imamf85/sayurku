import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatPrice } from '@/lib/utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '6281217571585'

function formatPaymentConfirmedForUser(
  orderNumber: string,
  total: number,
  trackingUrl: string
): string {
  return `*Pembayaran Dikonfirmasi - Sayurku*

Terima kasih! Pembayaran Anda telah dikonfirmasi.

*No. Pesanan:* ${orderNumber}
*Total:* ${formatPrice(total)}

Pesanan Anda sedang diproses dan akan segera dikirim.

Lacak pesanan Anda:
${trackingUrl}

Terima kasih telah berbelanja di Sayurku!`
}

function formatOrderMessageForAdmin(
  orderId: string,
  orderNumber: string,
  customerName: string,
  customerPhone: string,
  total: number,
  itemCount: number,
  paymentMethod: string,
  deliveryDate: string,
  deliverySlot: string,
  address: string,
  managementToken: string | null
): string {
  const manageUrl = managementToken
    ? `${APP_URL}/manage-order/${managementToken}`
    : `${APP_URL}/admin/orders/${orderId}`

  const paymentMethodLabels: Record<string, string> = {
    qris: 'QRIS',
    transfer: 'Transfer Bank',
    cod: 'COD',
  }

  const paymentLabel = paymentMethodLabels[paymentMethod] || paymentMethod

  return `*Pesanan Baru Masuk - Sayurku*

*No. Pesanan:* ${orderNumber}
*Pelanggan:* ${customerName}
*No. HP:* ${customerPhone}
*Total:* ${formatPrice(total)}
*Jumlah Item:* ${itemCount} item
*Pembayaran:* ${paymentLabel} ✅ Sudah Dibayar

*Pengiriman:*
Tanggal: ${deliveryDate}
Waktu: ${deliverySlot}
Alamat: ${address}

Kelola pesanan (tanpa login):
${manageUrl}`
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Find order by payment token with related data
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        delivery_slot:delivery_slots(id, name)
      `)
      .eq('payment_token', token)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Order already confirmed', status: order.status },
        { status: 400 }
      )
    }

    // Update order status to paid then processing
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        status: 'processing',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      throw updateError
    }

    // Add status history
    await adminSupabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        status: 'paid',
        note: 'Pembayaran dikonfirmasi via link',
      })

    await adminSupabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        status: 'processing',
        note: 'Pesanan sedang diproses',
      })

    // Get user profile to send notification
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.user_id)
      .single()

    const customerName = profile?.full_name || 'Pelanggan'
    const customerPhone = profile?.phone || ''

    // Send notification to user
    if (customerPhone) {
      const trackingUrl = order.tracking_token
        ? `${APP_URL}/track/${order.tracking_token}`
        : `${APP_URL}/orders`

      const userMessage = formatPaymentConfirmedForUser(
        order.order_number,
        order.total,
        trackingUrl
      )

      await sendWhatsAppMessage({
        to: customerPhone,
        message: userMessage,
      })
    }

    // Send notification to admin
    const deliveryDate = new Date(order.delivery_date).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const addr = order.address_snapshot
    const fullAddress = `${addr.address}, ${addr.village ? addr.village + ', ' : ''}${addr.district}, ${addr.city}${addr.province ? ', ' + addr.province : ''} ${addr.postal_code}`

    const adminMessage = formatOrderMessageForAdmin(
      order.id,
      order.order_number,
      customerName,
      customerPhone,
      order.total,
      order.items?.length || 0,
      order.payment_method,
      deliveryDate,
      order.delivery_slot.name,
      fullAddress,
      order.management_token
    )

    await sendWhatsAppMessage({
      to: ADMIN_WHATSAPP,
      message: adminMessage,
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
      },
    })
  } catch (error) {
    console.error('Payment confirm error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
