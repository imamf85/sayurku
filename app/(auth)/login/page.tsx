'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MessageCircle, ArrowLeft, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

type LoginStep = 'phone' | 'otp'

function LoginContent() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<LoginStep>('phone')
  const [loading, setLoading] = useState(false)
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const expired = searchParams.get('expired')
  const { toast } = useToast()
  const supabase = createClient()

  // Show expired session message
  useEffect(() => {
    if (expired === '1') {
      toast({
        title: 'Sesi Berakhir',
        description: 'Silakan login kembali untuk melanjutkan',
        variant: 'destructive',
      })
    }
  }, [expired, toast])

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

      // Set session from server response
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) {
        console.error('Session error:', sessionError)
        toast({
          title: 'Error',
          description: 'Gagal menyimpan sesi',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Check if user needs to set their name
      if (data.needsName) {
        setShowNameModal(true)
        setLoading(false)
        return
      }

      toast({
        title: 'Login Berhasil',
        description: 'Selamat datang di Sayurku!',
      })

      // Use window.location for reliable redirect on mobile
      window.location.href = redirect
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal memverifikasi OTP',
        variant: 'destructive',
      })
    }

    setLoading(false)
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()

    if (fullName.trim().length < 2) {
      toast({
        title: 'Error',
        description: 'Nama harus minimal 2 karakter',
        variant: 'destructive',
      })
      return
    }

    setSavingName(true)

    try {
      const response = await fetch('/api/auth/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        })
        setSavingName(false)
        return
      }

      toast({
        title: 'Login Berhasil',
        description: 'Selamat datang di Sayurku!',
      })

      setShowNameModal(false)
      // Use window.location for reliable redirect on mobile
      window.location.href = redirect
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan nama',
        variant: 'destructive',
      })
    }

    setSavingName(false)
  }

  const handleBackToPhone = () => {
    setStep('phone')
    setOtp('')
  }

  if (step === 'otp') {
    return (
      <>
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

        {/* Name Input Modal */}
        <Dialog open={showNameModal} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-8 h-8 text-green-600" />
              </div>
              <DialogTitle className="text-center">Lengkapi Profil Anda</DialogTitle>
              <DialogDescription className="text-center">
                Masukkan nama lengkap Anda untuk melanjutkan
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-green-600 hover:bg-green-700"
                disabled={savingName || fullName.trim().length < 2}
              >
                {savingName ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Simpan & Lanjutkan'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </>
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
