// Pengaturan toko & pengiriman (tabel store_settings, satu baris).
//  - getSettingsFresh(): langsung ke database. WAJIB untuk semua keputusan (order, booking, webhook).
//  - getSettingsCached(): hanya untuk tampilan. Di Firebase multi-instance, revalidateTag hanya
//    membersihkan instance yang menangani request, jadi data bisa basi hingga 60 detik.
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_SETTINGS, type StoreSettings } from '@/lib/settings-schema'

export { storeSettingsSchema, DEFAULT_SETTINGS } from '@/lib/settings-schema'
export type { StoreSettings, StoreSettingsInput } from '@/lib/settings-schema'

export const SETTINGS_TAG = 'store-settings'

// 'HH:MM:SS' dari Postgres → 'HH:MM'
const trimTime = (t: unknown) => (typeof t === 'string' ? t.slice(0, 5) : t)

function normalize(row: Record<string, unknown> | null): StoreSettings {
  if (!row) return DEFAULT_SETTINGS
  const merged = { ...DEFAULT_SETTINGS, ...row } as StoreSettings
  for (const k of ['store_open', 'store_close', 'internal_hours_start', 'internal_hours_end'] as const) {
    merged[k] = trimTime(merged[k]) as string
  }
  // NUMERIC dikembalikan PostgREST sebagai number, tetapi jaga-jaga bila string
  merged.internal_min_km = Number(merged.internal_min_km)
  merged.internal_max_km = Number(merged.internal_max_km)
  return merged
}

export async function getSettingsFresh(): Promise<StoreSettings> {
  const { data } = await createAdminClient().from('store_settings').select('*').maybeSingle()
  return normalize(data)
}

// Client tanpa override fetch `no-store` agar unstable_cache dapat bekerja (lihat V7 di dokumen desain).
const getSettingsCachedInner = unstable_cache(
  async () => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await client.from('store_settings').select('*').maybeSingle()
    return normalize(data)
  },
  ['store-settings'],
  { tags: [SETTINGS_TAG], revalidate: 60 }
)

export function getSettingsCached(): Promise<StoreSettings> {
  return getSettingsCachedInner()
}
