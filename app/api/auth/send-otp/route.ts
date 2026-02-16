import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
