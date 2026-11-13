import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBiteshipOrder } from '@/lib/biteship/orders'
import { syncShipment } from '@/lib/shipments/sync'

// Webhook Biteship (order.status, order.price, order.waybill_id).
//  - Autentikasi: secret di URL (?secret=) atau header x-biteship-secret, dibandingkan constant-time.
//    ⚠️ V2: dokumentasi tidak menjelaskan signature; pastikan mekanisme yang tersedia di dashboard Biteship.
//  - Payload TIDAK dipercaya (I5): status asli diambil lewat GET /v1/orders/:id.
//  - Semua selesai sebelum return (I7). Gagal memproses → 500 agar Biteship mengirim ulang.
function secretOk(request: NextRequest): boolean {
  const expected = process.env.BITESHIP_WEBHOOK_SECRET
  if (!expected) return false
  const given = request.nextUrl.searchParams.get('secret') || request.headers.get('x-biteship-secret') || ''
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  // Biteship memeriksa URL saat pendaftaran dengan request body kosong dan mengharapkan 200.
  // Request tanpa isi tidak mengubah apa pun, jadi dijawab 200 tanpa autentikasi.
  // Event nyata (ada isi) tetap wajib melewati pemeriksaan secret di bawah.
  const text = await request.text()
  let payload: any = null
  try {
    payload = text.trim() ? JSON.parse(text) : null
  } catch {
    payload = null
  }
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return NextResponse.json({ received: true })
  }

  if (!secretOk(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const biteshipOrderId: string | null = payload.order_id ?? payload.id ?? null
  const db = createAdminClient()

  const { data: event } = await db
    .from('biteship_events')
    .insert({
      event: String(payload.event ?? 'unknown'),
      biteship_order_id: biteshipOrderId,
      status: payload.status ? String(payload.status) : null,
      payload,
    })
    .select('id')
    .single()

  const finish = async (result: string) => {
    if (event) await db.from('biteship_events').update({ result }).eq('id', event.id)
  }

  // Ping/uji dari dashboard Biteship, atau event tanpa order
  if (!biteshipOrderId) {
    await finish('ignored_no_order')
    return NextResponse.json({ received: true })
  }

  const { data: shipment } = await db.from('shipments').select('*').eq('biteship_order_id', biteshipOrderId).maybeSingle()
  if (!shipment) {
    await finish('ignored_unknown')
    return NextResponse.json({ received: true })
  }

  try {
    const remote = await getBiteshipOrder(biteshipOrderId) // sumber kebenaran
    const result = await syncShipment(db, shipment, remote)
    await finish(result === 'applied' ? 'applied' : 'ignored_duplicate')
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Biteship webhook error:', error)
    await finish(`error: ${(error as Error)?.message ?? 'unknown'}`.slice(0, 300))
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

// Beberapa validator memakai GET/HEAD untuk memeriksa URL; jawab 200 tanpa data apa pun.
export async function GET() {
  return NextResponse.json({ ok: true })
}
