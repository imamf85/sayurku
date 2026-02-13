import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookToken } from '@/lib/xendit'
import {
  sendWhatsAppMessage,
  formatPaymentSuccessMessage,
  formatAdminNewOrderMessage,
} from '@/lib/whatsapp'
import { formatDate } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const webhookToken = request.headers.get('x-callback-token')

    if (!webhookToken || !verifyWebhookToken(webhookToken)) {
      return NextResponse.json(
        { error: 'Invalid webhook token' },
        { status: 401 }
      )
    }

    const payload = await request.json()

    if (payload.status !== 'PAID') {
      return NextResponse.json({ received: true })
    }

    const supabase = createAdminClient()

    const { data: order } = await supabase
      .from('orders')
      .select('*, profile:profiles(full_name, phone), items:order_items(count)')
      .eq('order_number', payload.external_id)
      .single()

    if (!order) {
      console.error('Order not found:', payload.external_id)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: payload.payment_method,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    const { data: slot } = await supabase
      .from('delivery_slots')
      .select('name')
      .eq('id', order.delivery_slot)
      .single()

    const profile = order.profile as any
    if (profile?.phone) {
      await sendWhatsAppMessage({
        to: profile.phone,
        message: formatPaymentSuccessMessage(
          order.order_number,
          order.total,
          formatDate(order.delivery_date),
          slot?.name || order.delivery_slot
        ),
      })
    }

    const adminWhatsApp = process.env.ADMIN_WHATSAPP
    if (adminWhatsApp) {
      await sendWhatsAppMessage({
        to: adminWhatsApp,
        message: formatAdminNewOrderMessage(
          order.order_number,
          profile?.full_name || 'Customer',
          order.total,
          (order.items as any)?.[0]?.count || 0
        ),
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
