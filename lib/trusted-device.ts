import { randomBytes, createHash } from 'crypto'
import { SupabaseClient } from '@supabase/supabase-js'

export const TRUSTED_DEVICE_COOKIE = 'sayurku_device_token'
export const TRUSTED_DEVICE_TTL_DAYS = 30

function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Checks whether `token` (from the device's cookie) was issued to `profileId`
 * via a completed OTP verification and hasn't expired.
 */
export async function isDeviceTrusted(
  supabase: SupabaseClient,
  profileId: string,
  token: string
): Promise<boolean> {
  const { data } = await supabase
    .from('trusted_devices')
    .select('id, expires_at')
    .eq('profile_id', profileId)
    .eq('token_hash', hashDeviceToken(token))
    .maybeSingle()

  if (!data || new Date(data.expires_at) < new Date()) {
    return false
  }

  await supabase
    .from('trusted_devices')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return true
}

/**
 * Issues a new trusted-device token for `profileId`, to be stored in a
 * cookie via TRUSTED_DEVICE_COOKIE. Only call this right after a successful
 * OTP verification.
 */
export async function trustDevice(
  supabase: SupabaseClient,
  profileId: string,
  userAgent: string | null
): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + TRUSTED_DEVICE_TTL_DAYS)

  await supabase.from('trusted_devices').insert({
    profile_id: profileId,
    token_hash: hashDeviceToken(token),
    user_agent: userAgent,
    expires_at: expiresAt.toISOString(),
  })

  return token
}
