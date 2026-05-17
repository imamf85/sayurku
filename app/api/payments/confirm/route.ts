import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatPrice } from '@/lib/utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

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

    // Find order by payment token
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select('*')
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
      .select('phone')
      .eq('id', order.user_id)
      .single()

    if (profile?.phone) {
      const trackingUrl = order.tracking_token
        ? `${APP_URL}/track/${order.tracking_token}`
        : `${APP_URL}/orders`

      const userMessage = formatPaymentConfirmedForUser(
        order.order_number,
        order.total,
        trackingUrl
      )

      await sendWhatsAppMessage({
        to: profile.phone,
        message: userMessage,
      })
    }

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
