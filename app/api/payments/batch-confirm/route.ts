import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { transitionOrder } from '@/lib/orders/transition'
import { onOrderPaid } from '@/lib/orders/on-paid'
import { formatPrice } from '@/lib/utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

function formatBatchPaymentConfirmedForUser(
  orderCount: number,
  totalAmount: number,
  orderNumbers: string[]
): string {
  return `*Pembayaran Dikonfirmasi - Sayurku*

Terima kasih! Pembayaran Anda telah dikonfirmasi.

*Jumlah Pesanan:* ${orderCount} pesanan
*Total:* ${formatPrice(totalAmount)}

*No. Pesanan:*
${orderNumbers.map((num, i) => `${i + 1}. ${num}`).join('\n')}

Semua pesanan Anda sedang diproses dan akan segera dikirim.

Lacak pesanan Anda:
${APP_URL}/orders

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

    // Find batch payment by token
    const { data: batchPayment, error: batchError } = await adminSupabase
      .from('batch_payments')
      .select('*')
      .eq('confirmation_token', token)
      .single()

    if (batchError || !batchPayment) {
      return NextResponse.json(
        { error: 'Batch payment not found' },
        { status: 404 }
      )
    }

    if (batchPayment.status !== 'pending') {
      return NextResponse.json(
        { error: 'Batch payment already processed', status: batchPayment.status },
        { status: 400 }
      )
    }

    // Update batch payment status
    const { error: updateBatchError } = await adminSupabase
      .from('batch_payments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchPayment.id)

    if (updateBatchError) {
      throw updateBatchError
    }

    // Semua order dalam batch → processing lewat satu pintu (I9).
    // Guard pending_payment: order yang sudah dibayar/dibatalkan tidak ditimpa.
    const paidAt = new Date().toISOString()
    for (const orderId of batchPayment.order_ids as string[]) {
      const result = await transitionOrder(adminSupabase, orderId, {
        to: 'processing',
        expectFrom: 'pending_payment',
        fields: { paid_at: paidAt },
        history: [
          { status: 'paid', note: 'Pembayaran batch dikonfirmasi via link' },
          { status: 'processing', note: 'Pesanan sedang diproses' },
        ],
      })
      if (result.applied) await onOrderPaid(adminSupabase, orderId)
    }

    // Get order numbers for notification
    const { data: orders } = await adminSupabase
      .from('orders')
      .select('order_number')
      .in('id', batchPayment.order_ids)

    const orderNumbers = orders?.map((o) => o.order_number) || []

    // Get user profile to send notification
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('phone')
      .eq('id', batchPayment.user_id)
      .single()

    // Send WhatsApp notification to customer
    if (profile?.phone) {
      const userMessage = formatBatchPaymentConfirmedForUser(
        batchPayment.order_count,
        batchPayment.total_amount,
        orderNumbers
      )

      await sendWhatsAppMessage({
        to: profile.phone,
        message: userMessage,
      })
    }

    return NextResponse.json({
      success: true,
      batchPayment: {
        id: batchPayment.id,
        order_count: batchPayment.order_count,
        total_amount: batchPayment.total_amount,
      },
    })
  } catch (error) {
    console.error('Batch payment confirm error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm batch payment' },
      { status: 500 }
    )
  }
}
