import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { verifyAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { transitionOrder } from '@/lib/orders/transition'
import { pickupDoneMessage } from '@/lib/notifications/pickup'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sayurku-psi.vercel.app'

// Serah-terima pesanan Ambil di Toko: verifikasi kode ambil, lalu delivered.
// Dua cara autentikasi: sesi admin (orderId) atau management token (link kelola tanpa login).
const schema = z.object({
  orderId: z.string().uuid().optional(),
  token: z.string().min(1).max(200).optional(),
  code: z.string().trim().regex(/^\d{6}$/, 'Kode ambil terdiri dari 6 angka'),
  receivedBy: z.string().trim().max(100).optional(),
})

function sameCode(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Data tidak valid' }, { status: 400 })
  }
  const { orderId, token, code, receivedBy } = parsed.data
  if (!orderId && !token) {
    return NextResponse.json({ error: 'orderId atau token wajib diisi' }, { status: 400 })
  }

  const admin = createAdminClient()
  let actorId: string | null = null

  let query = admin
    .from('orders')
    .select('id, status, order_number, total, tracking_token, user_id, payment_method, fulfillment_method, pickup_code')

  if (token) {
    query = query.eq('management_token', token)
  } else {
    const session = await verifyAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    actorId = session.id
    query = query.eq('id', orderId!)
  }

  const { data: order } = await query.single()
  if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })

  if (order.fulfillment_method !== 'pickup' || !order.pickup_code) {
    return NextResponse.json({ error: 'Pesanan ini bukan pesanan ambil di toko' }, { status: 400 })
  }
  if (!['processing', 'ready_for_pickup'].includes(order.status)) {
    return NextResponse.json({ error: 'Pesanan belum bisa diserahkan pada status ini' }, { status: 400 })
  }
  if (!sameCode(code, order.pickup_code)) {
    return NextResponse.json({ error: 'Kode ambil salah' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const fields: Record<string, unknown> = { received_by: receivedBy || 'Diambil di toko' }
  // Bayar di Toko: uang diterima saat serah-terima
  if (order.payment_method === 'cod') fields.paid_at = now

  const result = await transitionOrder(admin, order.id, {
    to: 'delivered',
    expectFrom: ['processing', 'ready_for_pickup'],
    viaHandover: true,
    actorId,
    note: 'Diambil di toko (kode ambil terverifikasi)',
    fields,
  })

  if (!result.applied) {
    return NextResponse.json({ error: 'Status pesanan sudah berubah, muat ulang halaman' }, { status: 409 })
  }

  const { data: profile } = await admin.from('profiles').select('phone').eq('id', order.user_id).single()
  if (profile?.phone) {
    await sendWhatsAppMessage({
      to: profile.phone,
      message: pickupDoneMessage({
        orderNumber: order.order_number,
        trackingUrl: `${APP_URL}/track/${order.tracking_token}`,
      }),
    }).catch(console.error)
  }

  return NextResponse.json({ success: true })
}
