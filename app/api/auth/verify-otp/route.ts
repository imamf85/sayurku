import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_ATTEMPTS = 5

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '')
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1)
  }
  if (!normalized.startsWith('62')) {
    normalized = '62' + normalized
  }
  return normalized
}

export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json()

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp dan OTP wajib diisi' },
        { status: 400 }
      )
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Format OTP tidak valid' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhone(phone)
    const supabase = createAdminClient()

    // Get the latest unverified OTP for this phone
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !otpRecord) {
      return NextResponse.json(
        { error: 'OTP tidak ditemukan. Silakan minta OTP baru.' },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'OTP sudah kadaluarsa. Silakan minta OTP baru.' },
        { status: 400 }
      )
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Silakan minta OTP baru.' },
        { status: 400 }
      )
    }

    // Increment attempts
    await supabase
      .from('otp_verifications')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id)

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      const remainingAttempts = MAX_ATTEMPTS - (otpRecord.attempts + 1)
      return NextResponse.json(
        { error: `OTP salah. Sisa percobaan: ${remainingAttempts}` },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpRecord.id)

    // Check if user exists with this phone
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', normalizedPhone)
      .single()

    let userId: string

    if (existingProfile) {
      // User exists
      userId = existingProfile.id
    } else {
      // Create new user via Admin API
      const email = `${normalizedPhone}@whatsapp.sayurku.local`

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          phone: normalizedPhone,
          auth_provider: 'whatsapp',
        },
      })

      if (createError || !newUser.user) {
        console.error('Create user error:', createError)
        return NextResponse.json(
          { error: 'Gagal membuat akun' },
          { status: 500 }
        )
      }

      userId = newUser.user.id

      // Create profile
      await supabase.from('profiles').insert({
        id: userId,
        phone: normalizedPhone,
        full_name: null,
      })
    }

    // Generate a magic link for passwordless login
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `${normalizedPhone}@whatsapp.sayurku.local`,
    })

    if (linkError || !linkData) {
      console.error('Generate link error:', linkError)
      return NextResponse.json(
        { error: 'Gagal membuat sesi login' },
        { status: 500 }
      )
    }

    // Extract the token from the link
    const url = new URL(linkData.properties.action_link)
    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type')

    return NextResponse.json({
      success: true,
      message: 'Verifikasi berhasil',
      token,
      type,
      userId,
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
