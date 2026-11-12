import { NextResponse } from 'next/server'
import { getSettingsCached } from '@/lib/settings'

// Publik: hanya nama dan koordinat toko (titik tengah awal peta pin lokasi)
export async function GET() {
  const s = await getSettingsCached()
  return NextResponse.json(
    { name: s.store_name, latitude: s.store_latitude, longitude: s.store_longitude },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  )
}
