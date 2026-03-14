import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage, formatOtpMessage } from '@/lib/whatsapp'

const OTP_EXPIRY_MINUTES = 10
const MAX_OTP_REQUESTS = 3
const RATE_LIMIT_MINUTES = 10

function normalizePhone(phone: string): string {
  // Remove all non-digits
  let normalized = phone.replace(/\D/g, '')

  // Convert 08xxx to 628xxx
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1)
  }

  // Ensure starts with 62
  if (!normalized.startsWith('62')) {
    normalized = '62' + normalized
  }

  return normalized
}

function isValidIndonesianPhone(phone: string): boolean {
  // Indonesian phone: 62 + 8-13 digits (total 10-15 digits)
  const normalized = normalizePhone(phone)
  return /^62\d{9,13}$/.test(normalized)
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp wajib diisi' },
        { status: 400 }
      )
    }

    if (!isValidIndonesianPhone(phone)) {
      return NextResponse.json(
        { error: 'Format nomor WhatsApp tidak valid' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhone(phone)
    const supabase = createAdminClient()

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('phone', normalizedPhone)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    // If user already registered, auto-login without OTP
    if (existingProfile) {
      const email = `${normalizedPhone}@whatsapp.sayurku.local`
      const password = `wa_${normalizedPhone}_${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-10)}`

      // Check if auth user exists
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(existingProfile.id)

      if (getUserError || !authUser?.user) {
        // Auth user doesn't exist, create it with the existing profile's id
        const { error: createError } = await supabase.auth.admin.createUser({
          id: existingProfile.id,
          email,
          password,
          email_confirm: true,
          user_metadata: {
            phone: normalizedPhone,
            auth_provider: 'whatsapp',
          },
        })

        if (createError) {
          console.error('Create auth user for existing profile error:', createError)
          return NextResponse.json(
            { error: 'Gagal membuat akun: ' + createError.message },
            { status: 500 }
          )
        }
      } else {
        // Auth user exists, update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingProfile.id, {
          password,
          email,
        })

        if (updateError) {
          console.error('Update user error:', updateError)
          return NextResponse.json(
            { error: 'Gagal update akun: ' + updateError.message },
            { status: 500 }
          )
        }
      }

      // Create session for existing user
      const authClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !signInData.session) {
        console.error('Sign in error:', signInError)
        return NextResponse.json(
          { error: 'Gagal membuat sesi: ' + signInError?.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        registered: true,
        message: 'Login berhasil',
        phone: normalizedPhone,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        },
      })
    }

    // User not registered - proceed with OTP flow
    // Check rate limit
    const rateLimitTime = new Date()
    rateLimitTime.setMinutes(rateLimitTime.getMinutes() - RATE_LIMIT_MINUTES)

    const { count: recentRequests } = await supabase
      .from('otp_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('phone', normalizedPhone)
      .gte('created_at', rateLimitTime.toISOString())

    if (recentRequests && recentRequests >= MAX_OTP_REQUESTS) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan OTP. Coba lagi dalam 10 menit.' },
        { status: 429 }
      )
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES)

    // Save OTP to database
    const { error: insertError } = await supabase
      .from('otp_verifications')
      .insert({
        phone: normalizedPhone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('OTP insert error:', insertError)
      return NextResponse.json(
        { error: 'Gagal menyimpan OTP' },
        { status: 500 }
      )
    }

    // Send OTP via WhatsApp
    const message = formatOtpMessage(otp)
    const sent = await sendWhatsAppMessage({
      to: normalizedPhone,
      message,
    })

    if (!sent) {
      return NextResponse.json(
        { error: 'Gagal mengirim OTP. Pastikan nomor WhatsApp aktif.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      registered: false,
      message: 'OTP berhasil dikirim',
      phone: normalizedPhone,
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
