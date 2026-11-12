import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { transitionOrder } from '@/lib/orders/transition'
import { getSettingsFresh } from '@/lib/settings'
import { pickupReadyMessage } from '@/lib/notifications/pickup'
import { statusLabelFor } from '@/lib/fulfillment/labels'

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
      .select('status, order_number, total, tracking_token, user_id, fulfillment_method, pickup_code, payment_method')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Kolom tambahan saat pesanan diterima
    const fields: Record<string, unknown> = {}
    if (status === 'delivered') {
      if (receivedBy) fields.received_by = receivedBy
      if (deliveryProofUrl) fields.delivery_proof_url = deliveryProofUrl
    }

    // Ubah status + catat riwayat lewat satu pintu (I9)
    try {
      const result = await transitionOrder(adminClient, orderId, {
        to: status,
        note: note || null,
        actorId: admin.id,
        fields,
      })

      if (result.blocked) {
        return NextResponse.json(
          {
            error:
              result.blocked === 'PICKUP_REQUIRES_CODE'
                ? 'Pesanan ambil di toko hanya bisa diselesaikan lewat "Serahkan Pesanan" dengan kode ambil'
                : 'Status ini tidak berlaku untuk metode pengiriman pesanan',
            code: result.blocked,
          },
          { status: 400 }
        )
      }
    } catch (updateError: any) {
      console.error('Update order error:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // Send WhatsApp notification to user if status changed
    if (order.status !== status) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('phone')
        .eq('id', order.user_id)
        .single()

      if (profile?.phone) {
        const trackingUrl = `${APP_URL}/track/${order.tracking_token}`

        let message: string

        if (status === 'ready_for_pickup') {
          message = pickupReadyMessage({
            orderNumber: order.order_number,
            pickupCode: order.pickup_code,
            store: await getSettingsFresh(),
            trackingUrl,
            payAtStore: order.payment_method === 'cod',
            total: order.total,
          })
        } else {
          message = `*Update Pesanan - Sayurku*\n\n`
          message += `No. Pesanan: ${order.order_number}\n`
          message += `Status: *${statusLabelFor(status, order.fulfillment_method)}*\n`

          if (note) {
            message += `\n${note}\n`
          }

          if (status === 'delivered' && receivedBy) {
            message += `\nDiterima oleh: ${receivedBy}\n`
          }

          message += `\nLacak pesanan:\n${trackingUrl}`
        }

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
