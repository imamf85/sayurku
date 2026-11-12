import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatPrice } from '@/lib/utils'
import { FULFILLMENT_LABELS } from '@/lib/fulfillment/labels'

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '6281217571585'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

interface FulfillmentOpts {
  pickup: boolean
  pickupCode: string | null
  methodLabel: string
}

function formatOrderMessageForUser(
  orderNumber: string,
  total: number,
  itemCount: number,
  paymentMethod: string,
  deliveryDate: string,
  deliverySlot: string,
  trackingUrl: string,
  paymentUrl?: string,
  opts?: FulfillmentOpts
): string {
  const pickup = !!opts?.pickup
  const section = pickup ? 'Ambil di Toko' : 'Pengiriman'
  const codeLine = pickup && opts?.pickupCode ? `\nKode ambil: *${opts.pickupCode}*` : ''

  const paymentMethodLabels: Record<string, string> = {
    cod: 'Bayar di Tempat (COD)',
    qris: 'QRIS',
    transfer: 'Transfer Bank',
  }

  const paymentLabel = paymentMethodLabels[paymentMethod] || paymentMethod

  // For COD - order is confirmed
  if (paymentMethod === 'cod') {
    return `*Pesanan Berhasil - Sayurku*

Terima kasih telah berbelanja di Sayurku!

*No. Pesanan:* ${orderNumber}
*Total:* ${formatPrice(total)}
*Jumlah Item:* ${itemCount} item
*Metode Pembayaran:* ${paymentLabel}

*${section}:*
Tanggal: ${deliveryDate}
Waktu: ${deliverySlot}${codeLine}

${pickup ? `Bayar di toko sebesar ${formatPrice(total)} saat mengambil pesanan.` : `Siapkan uang pas sebesar ${formatPrice(total)} saat pesanan tiba.`}

Lacak pesanan Anda:
${trackingUrl}

Terima kasih!`
  }

  // For QRIS/Transfer - waiting for payment
  return `*Menunggu Pembayaran - Sayurku*

Pesanan Anda telah dibuat, silakan selesaikan pembayaran.

*No. Pesanan:* ${orderNumber}
*Total:* ${formatPrice(total)}
*Jumlah Item:* ${itemCount} item
*Metode Pembayaran:* ${paymentLabel}

*${section}:*
Tanggal: ${deliveryDate}
Waktu: ${deliverySlot}${codeLine}

Selesaikan pembayaran di:
${paymentUrl}

Terima kasih!`
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
  managementToken: string | null,
  opts?: FulfillmentOpts
): string {
  const manageUrl = managementToken
    ? `${APP_URL}/manage-order/${managementToken}`
    : `${APP_URL}/admin/orders/${orderId}`

  const paymentMethodLabels: Record<string, string> = {
    cod: 'COD',
    qris: 'QRIS (Menunggu Pembayaran)',
    transfer: 'Transfer Bank (Menunggu Pembayaran)',
  }

  const paymentLabel = paymentMethodLabels[paymentMethod] || paymentMethod

  return `*Pesanan Baru Masuk - Sayurku*

*No. Pesanan:* ${orderNumber}
*Pelanggan:* ${customerName}
*No. HP:* ${customerPhone}
*Total:* ${formatPrice(total)}
*Jumlah Item:* ${itemCount} item
*Pembayaran:* ${paymentLabel}

*${opts?.pickup ? 'Ambil di Toko' : 'Pengiriman'}:*
Metode: ${opts?.methodLabel ?? 'Kurir Sayurku'}
Tanggal: ${deliveryDate}
Waktu: ${deliverySlot}
${opts?.pickup ? 'Pelanggan datang sendiri ke toko' : `Alamat: ${address}`}

Kelola pesanan (tanpa login):
${manageUrl}`
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

    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        delivery_slot:delivery_slots(id, name)
      `)
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    const customerName = profile?.full_name || 'Pelanggan'
    const customerPhone = profile?.phone || ''

    const deliveryDate = new Date(order.delivery_date).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Format address
    const addr = order.address_snapshot
    const fullAddress = `${addr.address}, ${addr.village ? addr.village + ', ' : ''}${addr.district}, ${addr.city}${addr.province ? ', ' + addr.province : ''} ${addr.postal_code}`

    const slotName = order.delivery_slot_name || order.delivery_slot?.name || ''
    const fulfillmentOpts: FulfillmentOpts = {
      pickup: order.fulfillment_method === 'pickup',
      pickupCode: order.pickup_code ?? null,
      methodLabel:
        FULFILLMENT_LABELS[order.fulfillment_method as keyof typeof FULFILLMENT_LABELS] ?? 'Kurir Sayurku',
    }

    // Send notification to user
    if (customerPhone) {
      const trackingUrl = order.tracking_token
        ? `${APP_URL}/track/${order.tracking_token}`
        : `${APP_URL}/orders`

      const paymentUrl = `${APP_URL}/payment/${order.id}`

      const userMessage = formatOrderMessageForUser(
        order.order_number,
        order.total,
        order.items?.length || 0,
        order.payment_method,
        deliveryDate,
        slotName,
        trackingUrl,
        paymentUrl,
        fulfillmentOpts
      )

      await sendWhatsAppMessage({
        to: customerPhone,
        message: userMessage,
      })
    }

    // Only send notification to admin for COD orders
    // For QRIS/Transfer, admin will be notified after payment confirmation
    if (order.payment_method === 'cod') {
      const adminMessage = formatOrderMessageForAdmin(
        order.id,
        order.order_number,
        customerName,
        customerPhone,
        order.total,
        order.items?.length || 0,
        order.payment_method,
        deliveryDate,
        slotName,
        fullAddress,
        order.management_token,
        fulfillmentOpts
      )

      await sendWhatsAppMessage({
        to: ADMIN_WHATSAPP,
        message: adminMessage,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order notify error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
