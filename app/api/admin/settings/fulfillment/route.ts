import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { verifyAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettingsFresh, SETTINGS_TAG, storeSettingsSchema } from '@/lib/settings'

export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ settings: await getSettingsFresh(), canEdit: admin.role === 'super_admin' })
}

// Ubah seluruh pengaturan: hanya super admin
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Hanya super admin yang dapat mengubah pengaturan' }, { status: 403 })
  }

  const parsed = storeSettingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Data tidak valid', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { error } = await createAdminClient()
    .from('store_settings')
    .upsert({ id: true, ...parsed.data, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  revalidateTag(SETTINGS_TAG)
  return NextResponse.json({ settings: await getSettingsFresh() })
}

// Toggle cepat harian (semua admin): hanya status kurir internal
const quickSchema = z.object({ internal_enabled: z.boolean() })

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = quickSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

  const { error } = await createAdminClient()
    .from('store_settings')
    .update({ internal_enabled: parsed.data.internal_enabled, updated_at: new Date().toISOString() })
    .eq('id', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  revalidateTag(SETTINGS_TAG)
  return NextResponse.json({ internal_enabled: parsed.data.internal_enabled })
}
