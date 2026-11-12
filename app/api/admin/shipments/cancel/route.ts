import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdmin } from '@/lib/admin-auth'
import { cancelGrab, ShipmentError } from '@/lib/shipments/service'

const schema = z.object({ orderId: z.string().uuid(), reason: z.string().trim().min(3).max(200) })

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Alasan pembatalan wajib diisi (min. 3 huruf)' }, { status: 400 })

  try {
    await cancelGrab(parsed.data.orderId, parsed.data.reason)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ShipmentError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('cancel grab error:', error)
    return NextResponse.json({ error: 'Gagal membatalkan kurir' }, { status: 500 })
  }
}
