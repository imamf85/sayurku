import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateGrabQuote, QuoteInputError } from '@/lib/fulfillment/quote'
import { REASON_MESSAGES } from '@/lib/fulfillment/reasons'

// Ongkir GrabExpress untuk keranjang + alamat saat ini. Hanya dipanggil bila customer memilih Grab.
export async function POST(request: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Silakan login' } }, { status: 401 })

  const parsed = z.object({ addressId: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Data tidak valid' } }, { status: 400 })
  }

  try {
    const result = await getOrCreateGrabQuote(user.id, parsed.data.addressId)
    if (!result.ok) {
      return NextResponse.json({ available: false, reason: result.reason, message: REASON_MESSAGES[result.reason] })
    }
    // Harga mentah Biteship tidak dikirim ke client; hanya yang dibayar customer
    const { id, fee, courier_service, duration_text, distance_km, expires_at } = result.quote
    return NextResponse.json({
      available: true,
      quoteId: id,
      fee,
      service: courier_service,
      durationText: duration_text,
      distanceKm: distance_km,
      expiresAt: expires_at,
    })
  } catch (error) {
    if (error instanceof QuoteInputError) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: error.message } }, { status: 400 })
    }
    console.error('grab-quote error:', error)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Gagal menghitung ongkir' } }, { status: 500 })
  }
}
