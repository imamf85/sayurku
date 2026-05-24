import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatPrice } from '@/lib/utils'

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '6281217571585'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

function formatBatchPaymentNotification(
  customerName: string,
  orderCount: number,
  totalAmount: number,
  orderNumbers: string[],
  paymentMethod: string
): string {
  const methodLabel = paymentMethod === 'qris' ? 'QRIS' : 'Transfer Bank'

  return `*Konfirmasi Pembayaran Batch - Sayurku*

*Pelanggan:* ${customerName}
*Jumlah Pesanan:* ${orderCount} pesanan
*Total:* ${formatPrice(totalAmount)}
*Metode:* ${methodLabel}

*No. Pesanan:*
${orderNumbers.map((num, i) => `${i + 1}. ${num}`).join('\n')}

Pelanggan telah upload bukti pembayaran untuk ${orderCount} pesanan sekaligus.

Konfirmasi pembayaran:
${APP_URL}/admin/orders`
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

    const { orderIds, paymentProofUrl, paymentMethod } = await request.json()

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Order IDs required' },
        { status: 400 }
      )
    }

    if (!paymentProofUrl) {
      return NextResponse.json(
        { error: 'Payment proof required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Fetch all orders to verify ownership and get details
    const { data: orders, error: ordersError } = await adminSupabase
      .from('orders')
      .select('id, order_number, total, status, user_id')
      .in('id', orderIds)
      .eq('user_id', user.id)

    if (ordersError || !orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'Orders not found' },
        { status: 404 }
      )
    }

    // Check if all orders belong to user and are pending
    const invalidOrders = orders.filter(
      (o) => o.user_id !== user.id || o.status !== 'pending_payment'
    )

    if (invalidOrders.length > 0) {
      return NextResponse.json(
        { error: 'Some orders are invalid or already processed' },
        { status: 400 }
      )
    }

    // Update all orders with payment proof
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        payment_proof_url: paymentProofUrl,
        payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      })
      .in('id', orderIds)

    if (updateError) {
      throw updateError
    }

    // Get user profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    const customerName = profile?.full_name || 'Pelanggan'
    const totalAmount = orders.reduce((sum, order) => sum + order.total, 0)
    const orderNumbers = orders.map((o) => o.order_number)

    // Send WhatsApp notification to admin
    const adminMessage = formatBatchPaymentNotification(
      customerName,
      orders.length,
      totalAmount,
      orderNumbers,
      paymentMethod
    )

    await sendWhatsAppMessage({
      to: ADMIN_WHATSAPP,
      message: adminMessage,
    })

    return NextResponse.json({
      success: true,
      orderCount: orders.length,
      totalAmount,
    })
  } catch (error) {
    console.error('Batch payment submit error:', error)
    return NextResponse.json(
      { error: 'Failed to submit payment' },
      { status: 500 }
    )
  }
}
