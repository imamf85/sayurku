'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MessageCircle, ArrowLeft, User, LogIn } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type LoginStep = 'phone' | 'otp'
type Role = 'customer' | 'admin'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
  )
}

function LoginContent() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<LoginStep>('phone')
  const [loading, setLoading] = useState(false)
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [role, setRole] = useState<Role>('customer')
  const [checkingAuth, setCheckingAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const hasCheckedAdmin = useRef(false)
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const expired = searchParams.get('expired')
  const error = searchParams.get('error')
  const roleParam = searchParams.get('role')
  const logoutParam = searchParams.get('logout')
  const { toast } = useToast()
  const supabase = createClient()

  // Set initial role from URL param
  useEffect(() => {
    if (roleParam === 'admin') {
      setRole('admin')
    }
  }, [roleParam])

  // Show messages based on URL params
  useEffect(() => {
    if (expired === '1') {
      toast({
        title: 'Sesi Berakhir',
        description: 'Silakan login kembali untuk melanjutkan',
        variant: 'destructive',
      })
    }
    if (error === 'use_whatsapp') {
      toast({
        title: 'Gunakan WhatsApp',
        description: 'Silakan login menggunakan nomor WhatsApp Anda',
        variant: 'destructive',
      })
      window.history.replaceState({}, '', '/login')
    }
    if (error === 'not_admin') {
      toast({
        title: 'Akses ditolak',
        description: 'Email Anda tidak terdaftar sebagai admin',
        variant: 'destructive',
      })
      window.history.replaceState({}, '', '/login?role=admin')
    }
  }, [expired, error, toast])

  // Check if admin is already logged in (only for admin role)
  useEffect(() => {
    if (role !== 'admin' || hasCheckedAdmin.current) return
    hasCheckedAdmin.current = true

    const checkAdminAuth = async () => {
      if (logoutParam === 'true') {
        await supabase.auth.signOut()
        window.history.replaceState({}, '', '/login?role=admin')
        return
      }

      if (expired === '1') {
        await supabase.auth.signOut()
        return
      }

      setCheckingAuth(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const res = await fetch('/api/admin/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        })
        const data = await res.json()

        if (data.isAdmin) {
          setIsAdmin(true)
        }
      }
      setCheckingAuth(false)
    }

    checkAdminAuth()
  }, [role, logoutParam, expired, supabase.auth])

  const sendOtpRequest = async () => {
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

      // User already registered - auto login without OTP
      if (data.registered && data.session) {
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

        toast({
          title: 'Login Berhasil',
          description: 'Selamat datang kembali!',
        })

        window.location.href = redirect
        return
      }

      // New user - proceed with OTP verification
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendOtpRequest()
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

  const handleGoogleLogin = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/admin`,
      },
    })

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  const handleBackToPhone = () => {
    setStep('phone')
    setOtp('')
  }

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole)
    // Reset admin check when switching to admin
    if (newRole === 'admin') {
      hasCheckedAdmin.current = false
    }
    // Update URL without full reload
    const url = new URL(window.location.href)
    if (newRole === 'admin') {
      url.searchParams.set('role', 'admin')
    } else {
      url.searchParams.delete('role')
    }
    window.history.replaceState({}, '', url.toString())
  }

  // Loading state for admin auth check
  if (role === 'admin' && checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  // Admin already logged in - show dashboard button
  if (role === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-600 mb-2">Sayurku</h1>
            <p className="text-gray-600">Anda sudah masuk sebagai admin</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
            <Link href="/admin">
              <Button className="w-full h-12 gap-3 text-base font-medium bg-green-600 hover:bg-green-700">
                <LogIn className="h-5 w-5" />
                Masuk ke Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // OTP verification step (customer only)
  if (step === 'otp' && role === 'customer') {
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
                onClick={sendOtpRequest}
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
          <p className="text-gray-600">Masuk untuk melanjutkan</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {/* Role Selector Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => handleRoleChange('customer')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                role === 'customer'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                role === 'admin'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Admin
            </button>
          </div>

          {/* Customer Login Form */}
          {role === 'customer' && (
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
                      Lanjutkan
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Admin Login Form */}
          {role === 'admin' && (
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-3 text-base font-medium"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    Masuk dengan Google
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Hanya email yang terdaftar sebagai admin yang dapat mengakses dashboard
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {role === 'customer'
            ? 'Dengan masuk, Anda menyetujui Syarat & Ketentuan kami'
            : 'Hubungi administrator jika Anda belum terdaftar'}
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
