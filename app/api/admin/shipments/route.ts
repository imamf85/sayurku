import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdmin } from '@/lib/admin-auth'
import { bookGrab, ShipmentError } from '@/lib/shipments/service'

// Panggil Grab untuk pesanan yang sudah dibayar.
const schema = z.object({ orderId: z.string().uuid(), acceptPriceIncrease: z.boolean().optional() })

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'orderId tidak valid' }, { status: 400 })

  try {
    const shipment = await bookGrab(parsed.data.orderId, admin.id, { acceptPriceIncrease: parsed.data.acceptPriceIncrease })
    return NextResponse.json({ success: true, shipment })
  } catch (error) {
    if (error instanceof ShipmentError) {
      return NextResponse.json({ error: error.message, code: error.code, ...error.extra }, { status: error.status })
    }
    console.error('book grab error:', error)
    return NextResponse.json({ error: 'Gagal memanggil kurir' }, { status: 500 })
  }
}
