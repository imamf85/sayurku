import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettingsFresh } from '@/lib/settings'
import { getInternalLoads } from '@/lib/fulfillment/slot-load'
import { isValidDateString } from '@/lib/time'

// Beban kurir internal per slot pada satu tanggal, untuk menandai slot penuh di checkout.
// Hanya informasi tampilan; keputusan final tetap di POST /api/orders (RPC, race-safe).
export async function GET(request: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = new URL(request.url).searchParams.get('date') || ''
  if (!isValidDateString(date)) return NextResponse.json({ error: 'date tidak valid' }, { status: 400 })

  const settings = await getSettingsFresh()
  const loads = await getInternalLoads(createAdminClient(), date, settings.payment_hold_minutes)
  return NextResponse.json({ loads })
}
