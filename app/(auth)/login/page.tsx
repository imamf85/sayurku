'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MessageCircle, ArrowLeft } from 'lucide-react'

type LoginStep = 'phone' | 'otp'

function LoginContent() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<LoginStep>('phone')
  const [loading, setLoading] = useState(false)
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get('redirect') || '/'
  const { toast } = useToast()
  const supabase = createClient()

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      setNormalizedPhone(data.phone)
      setStep('otp')
      toast({
        title: 'OTP Terkirim',
        description: 'Cek WhatsApp Anda untuk kode OTP',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal mengirim OTP',
        variant: 'destructive',
      })
    }

    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, otp }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Verify the token with Supabase
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token,
        type: data.type,
      })

      if (verifyError) {
        toast({
          title: 'Error',
          description: 'Gagal memverifikasi sesi',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      toast({
        title: 'Login Berhasil',
        description: 'Selamat datang di Sayurku!',
      })

      router.push(redirect)
      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal memverifikasi OTP',
        variant: 'destructive',
      })
    }

    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    })

    if (error) {
      setLoading(false)
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleBackToPhone = () => {
    setStep('phone')
    setOtp('')
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <button
              onClick={handleBackToPhone}
              className="flex items-center text-gray-600 mb-4 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kembali
            </button>

            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-green-600" />
            </div>

            <h1 className="text-xl font-bold text-center mb-2">Masukkan Kode OTP</h1>
            <p className="text-gray-600 text-center mb-6 text-sm">
              Kode OTP telah dikirim ke WhatsApp<br />
              <strong>{normalizedPhone}</strong>
            </p>

            <form onSubmit={handleVerifyOtp}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="otp">Kode OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    className="mt-1 text-center text-2xl tracking-widest"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-green-600 hover:bg-green-700"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Verifikasi'
                  )}
                </Button>
              </div>
            </form>

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full mt-4 text-sm text-green-600 hover:text-green-700"
            >
              Kirim ulang OTP
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600 mb-2">Sayurku</h1>
          <p className="text-gray-600">Masuk untuk melanjutkan belanja</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <Button
            variant="outline"
            className="w-full mb-6 h-12"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Masuk dengan Google
              </>
            )}
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">atau</span>
            </div>
          </div>

          <form onSubmit={handleSendOtp}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Nomor WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contoh: 081234567890
                </p>
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-green-600 hover:bg-green-700"
                disabled={loading || phone.length < 10}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Kirim OTP via WhatsApp
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Dengan masuk, Anda menyetujui Syarat & Ketentuan kami
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>}>
      <LoginContent />
    </Suspense>
  )
}
