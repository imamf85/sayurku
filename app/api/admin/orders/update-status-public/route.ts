import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { transitionOrder } from '@/lib/orders/transition'
import { getSettingsFresh } from '@/lib/settings'
import { pickupReadyMessage } from '@/lib/notifications/pickup'
import { formatPrice } from '@/lib/utils'
import { OrderStatus } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

function formatStatusUpdateMessage(
  orderNumber: string,
  status: OrderStatus,
  trackingUrl: string
): string {
  const statusMessages = {
    processing: {
      title: 'Pesanan Sedang Diproses',
      message: 'Pesanan Anda sedang kami proses dan siapkan.',
    },
    shipping: {
      title: 'Pesanan Dalam Pengiriman',
      message: 'Pesanan Anda sedang dalam perjalanan menuju alamat tujuan.',
    },
    delivered: {
      title: 'Pesanan Telah Tiba',
      message: 'Pesanan Anda telah sampai di tujuan. Terima kasih telah berbelanja di Sayurku!',
    },
  }

  const statusInfo = statusMessages[status as keyof typeof statusMessages]

  if (!statusInfo) {
    return `*Update Pesanan - Sayurku*

*No. Pesanan:* ${orderNumber}
Status pesanan Anda telah diupdate.

Lacak pesanan Anda:
${trackingUrl}`
  }

  return `*${statusInfo.title} - Sayurku*

*No. Pesanan:* ${orderNumber}

${statusInfo.message}

Lacak pesanan Anda:
${trackingUrl}

Terima kasih!`
}

export async function POST(request: NextRequest) {
  try {
    const { token, status } = await request.json()

    if (!token || !status) {
      return NextResponse.json(
        { error: 'Token and status required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses: OrderStatus[] = ['processing', 'ready_for_pickup', 'shipping', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Find order by management token
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select('*')
      .eq('management_token', token)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Ubah status + catat riwayat lewat satu pintu (I9)
    const result = await transitionOrder(adminSupabase, order.id, {
      to: status,
      note: 'Status diupdate via management link',
    })

    if (result.blocked) {
      return NextResponse.json(
        {
          error:
            result.blocked === 'PICKUP_REQUIRES_CODE'
              ? 'Pesanan ambil di toko harus diselesaikan dengan kode ambil'
              : 'Status ini tidak berlaku untuk metode pengiriman pesanan',
          code: result.blocked,
        },
        { status: 400 }
      )
    }

    // Get customer info to send notification
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('phone')
      .eq('id', order.user_id)
      .single()

    // Send WhatsApp notification to customer
    if (profile?.phone) {
      const trackingUrl = order.tracking_token
        ? `${APP_URL}/track/${order.tracking_token}`
        : `${APP_URL}/orders`

      const message =
        status === 'ready_for_pickup'
          ? pickupReadyMessage({
              orderNumber: order.order_number,
              pickupCode: order.pickup_code,
              store: await getSettingsFresh(),
              trackingUrl,
              payAtStore: order.payment_method === 'cod',
              total: order.total,
            })
          : formatStatusUpdateMessage(order.order_number, status, trackingUrl)

      await sendWhatsAppMessage({
        to: profile.phone,
        message,
      })
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status,
      },
    })
  } catch (error) {
    console.error('Update status error:', error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
