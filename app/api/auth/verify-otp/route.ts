import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

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

    const email = `${normalizedPhone}@whatsapp.sayurku.local`
    // Use phone number as password base (hashed with a secret)
    const password = `wa_${normalizedPhone}_${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-10)}`

    // Check if user with this phone already exists in profiles
    // Use .maybeSingle() to avoid error when no match, and order by created_at to get the oldest one
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('phone', normalizedPhone)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    let userId: string
    let needsName = true

    if (existingProfile) {
      needsName = !existingProfile.full_name
      // User exists - update password
      userId = existingProfile.id

      // Check if auth user exists
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(userId)

      if (getUserError || !authUser?.user) {
        // Auth user doesn't exist, create it with the existing profile's id
        const { error: createError } = await supabase.auth.admin.createUser({
          id: userId,
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
        // Auth user exists, update password and email
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
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
    } else {
      // No existing profile - check if auth user exists by email
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existingAuthUser = users?.find(u => u.email === email)

      if (existingAuthUser) {
        // Auth user exists but no profile
        userId = existingAuthUser.id

        // Update password
        await supabase.auth.admin.updateUserById(userId, { password })

        // Create profile for this auth user
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          phone: normalizedPhone,
          full_name: null,
        })

        if (profileError) {
          console.error('Profile insert error:', profileError)
        }
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            phone: normalizedPhone,
            auth_provider: 'whatsapp',
          },
        })

        if (createError) {
          console.error('Create user error:', createError)
          return NextResponse.json(
            { error: 'Gagal membuat akun: ' + createError.message },
            { status: 500 }
          )
        }

        if (!newUser?.user) {
          return NextResponse.json(
            { error: 'Gagal membuat akun' },
            { status: 500 }
          )
        }

        userId = newUser.user.id

        // Create profile for new user
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          phone: normalizedPhone,
          full_name: null,
        })

        if (profileError) {
          console.error('Profile insert error:', profileError)
        }
      }
    }

    // Create a regular client for sign in (not admin client)
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Sign in with password to get session
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
      message: 'Verifikasi berhasil',
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
      needsName,
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
