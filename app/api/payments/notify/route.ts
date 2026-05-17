import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatPrice } from '@/lib/utils'

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '6281217571585'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

function formatPaymentNotificationForAdmin(
  orderNumber: string,
  customerName: string,
  customerPhone: string,
  total: number,
  paymentMethod: string,
  confirmUrl: string
): string {
  const methodLabel = paymentMethod === 'qris' ? 'QRIS' : 'Transfer Bank'

  return `*Konfirmasi Pembayaran - Sayurku*

*No. Pesanan:* ${orderNumber}
*Pelanggan:* ${customerName}
*No. HP:* ${customerPhone}
*Total:* ${formatPrice(total)}
*Metode:* ${methodLabel}

Pelanggan telah upload bukti pembayaran.

Klik link berikut untuk konfirmasi:
${confirmUrl}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Get order with payment token
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (!order.payment_token) {
      return NextResponse.json(
        { error: 'Payment token not found' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    const customerName = profile?.full_name || 'Pelanggan'
    const customerPhone = profile?.phone || ''

    // Create confirmation URL
    const confirmUrl = `${APP_URL}/confirm-payment/${order.payment_token}`

    // Send WhatsApp to admin
    const adminMessage = formatPaymentNotificationForAdmin(
      order.order_number,
      customerName,
      customerPhone,
      order.total,
      order.payment_method,
      confirmUrl
    )

    await sendWhatsAppMessage({
      to: ADMIN_WHATSAPP,
      message: adminMessage,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment notify error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
