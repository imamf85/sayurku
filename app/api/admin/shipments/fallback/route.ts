import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdmin } from '@/lib/admin-auth'
import { switchToInternal, ShipmentError } from '@/lib/shipments/service'

const schema = z.object({ orderId: z.string().uuid(), refundNote: z.string().trim().max(300).optional() })

// Alihkan pesanan Grab yang gagal ke Kurir Sayurku.
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

  try {
    await switchToInternal(parsed.data.orderId, parsed.data.refundNote ?? null)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ShipmentError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('switch internal error:', error)
    return NextResponse.json({ error: 'Gagal mengalihkan pesanan' }, { status: 500 })
  }
}
