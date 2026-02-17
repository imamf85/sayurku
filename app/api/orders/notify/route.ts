import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { formatPrice } from '@/lib/utils'

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '6281217571585'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku.vercel.app'

function formatOrderMessageForUser(
  orderNumber: string,
  total: number,
  itemCount: number,
  deliveryDate: string,
  deliverySlot: string
): string {
  return `*Pesanan Berhasil - Sayurku*

Terima kasih telah berbelanja di Sayurku!

*No. Pesanan:* ${orderNumber}
*Total:* ${formatPrice(total)}
*Jumlah Item:* ${itemCount} item
*Metode Pembayaran:* Bayar di Tempat (COD)

*Pengiriman:*
Tanggal: ${deliveryDate}
Waktu: ${deliverySlot}

Siapkan uang pas sebesar ${formatPrice(total)} saat pesanan tiba.

Terima kasih!`
}

function formatOrderMessageForAdmin(
  orderId: string,
  orderNumber: string,
  customerName: string,
  customerPhone: string,
  total: number,
  itemCount: number,
  deliveryDate: string,
  deliverySlot: string,
  address: string
): string {
  const orderUrl = `${APP_URL}/admin/orders/${orderId}`

  return `*Pesanan Baru Masuk - Sayurku*

*No. Pesanan:* ${orderNumber}
*Pelanggan:* ${customerName}
*No. HP:* ${customerPhone}
*Total:* ${formatPrice(total)}
*Jumlah Item:* ${itemCount} item
*Pembayaran:* COD

*Pengiriman:*
Tanggal: ${deliveryDate}
Waktu: ${deliverySlot}
Alamat: ${address}

Lihat & update pesanan:
${orderUrl}`
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

    if (customerPhone) {
      const userMessage = formatOrderMessageForUser(
        order.order_number,
        order.total,
        order.items?.length || 0,
        deliveryDate,
        order.delivery_slot.name
      )

      await sendWhatsAppMessage({
        to: customerPhone,
        message: userMessage,
      })
    }

    const adminMessage = formatOrderMessageForAdmin(
      order.id,
      order.order_number,
      customerName,
      customerPhone,
      order.total,
      order.items?.length || 0,
      deliveryDate,
      order.delivery_slot.name,
      fullAddress
    )

    await sendWhatsAppMessage({
      to: ADMIN_WHATSAPP,
      message: adminMessage,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order notify error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
