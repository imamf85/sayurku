import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatPrice, getStatusLabel } from '@/lib/utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verify admin user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()

    // Check if user is admin
    const { data: admin } = await adminClient
      .from('admins')
      .select('id, is_active')
      .ilike('email', user.email)
      .single()

    if (!admin || !admin.is_active) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { orderId, status, note, receivedBy, deliveryProofUrl } = await request.json()

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing orderId or status' },
        { status: 400 }
      )
    }

    // Get current order info
    const { data: order } = await adminClient
      .from('orders')
      .select('status, order_number, total, tracking_token, user_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Build update object for orders table
    const orderUpdate: Record<string, any> = { status }

    if (status === 'delivered') {
      if (receivedBy) orderUpdate.received_by = receivedBy
      if (deliveryProofUrl) orderUpdate.delivery_proof_url = deliveryProofUrl
    }

    // Update order status
    const { error: updateError } = await adminClient
      .from('orders')
      .update(orderUpdate)
      .eq('id', orderId)

    if (updateError) {
      console.error('Update order error:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // Insert status history
    await adminClient
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status,
        note: note || null,
        created_by: admin.id,
      })

    // Send WhatsApp notification to user if status changed
    if (order.status !== status) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('phone')
        .eq('id', order.user_id)
        .single()

      if (profile?.phone) {
        const trackingUrl = `${APP_URL}/track/${order.tracking_token}`

        let message = `*Update Pesanan - Sayurku*\n\n`
        message += `No. Pesanan: ${order.order_number}\n`
        message += `Status: *${getStatusLabel(status)}*\n`

        if (note) {
          message += `\n${note}\n`
        }

        if (status === 'delivered' && receivedBy) {
          message += `\nDiterima oleh: ${receivedBy}\n`
        }

        message += `\nLacak pesanan:\n${trackingUrl}`

        await sendWhatsAppMessage({
          to: profile.phone,
          message,
        }).catch(console.error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update order status error:', error)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}
