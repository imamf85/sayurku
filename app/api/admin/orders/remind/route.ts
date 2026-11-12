import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettingsFresh } from '@/lib/settings'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { pickupReminderMessage } from '@/lib/notifications/pickup'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

// Pengingat manual untuk pesanan siap diambil yang belum diambil (tanpa cron, dokumen §6.4).
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = z.object({ orderId: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'orderId tidak valid' }, { status: 400 })

  const db = createAdminClient()
  const { data: order } = await db
    .from('orders')
    .select('id, status, order_number, tracking_token, user_id, pickup_code, fulfillment_method')
    .eq('id', parsed.data.orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  if (order.fulfillment_method !== 'pickup' || order.status !== 'ready_for_pickup') {
    return NextResponse.json({ error: 'Hanya untuk pesanan siap diambil' }, { status: 400 })
  }

  const { data: profile } = await db.from('profiles').select('phone').eq('id', order.user_id).single()
  if (!profile?.phone) return NextResponse.json({ error: 'Pelanggan tidak punya nomor WhatsApp' }, { status: 400 })

  const sent = await sendWhatsAppMessage({
    to: profile.phone,
    message: pickupReminderMessage({
      orderNumber: order.order_number,
      pickupCode: order.pickup_code,
      store: await getSettingsFresh(),
      trackingUrl: `${APP_URL}/track/${order.tracking_token}`,
    }),
  })

  if (!sent) return NextResponse.json({ error: 'Gagal mengirim WhatsApp' }, { status: 502 })

  await db.from('orders').update({ pickup_reminded_at: new Date().toISOString() }).eq('id', order.id)
  return NextResponse.json({ success: true })
}
