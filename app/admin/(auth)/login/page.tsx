'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

function AdminLoginContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const logout = searchParams.get('logout')
    if (logout === 'true') {
      supabase.auth.signOut().then(() => {
        router.replace('/admin/login')
      })
    }
  }, [searchParams, supabase.auth, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Check admin via API to bypass RLS
    const checkRes = await fetch('/api/admin/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const { isAdmin } = await checkRes.json()

    if (!isAdmin) {
      toast({
        title: 'Akses ditolak',
        description: 'Email tidak terdaftar sebagai admin',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/admin`,
        shouldCreateUser: true,
      },
    })

    setLoading(false)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    setEmailSent(true)
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h1 className="text-xl font-bold mb-2">Cek Email Anda</h1>
            <p className="text-gray-600 mb-6">
              Link login telah dikirim ke <strong>{email}</strong>
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setEmailSent(false)}
            >
              Gunakan email lain
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600 mb-2">
            Sayurku Admin
          </h1>
          <p className="text-gray-600">Masuk untuk mengelola toko</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Admin</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Kirim Link Login'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>}>
      <AdminLoginContent />
    </Suspense>
  )
}
