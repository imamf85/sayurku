'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function EditProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [isWhatsAppLogin, setIsWhatsAppLogin] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/profile/edit')
        return
      }

      const isWaLogin = user.email?.endsWith('@whatsapp.sayurku.local') || false
      setIsWhatsAppLogin(isWaLogin)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        // For WhatsApp login, phone is extracted from email
        if (isWaLogin) {
          setPhone(user.email?.replace('@whatsapp.sayurku.local', '') || '')
        } else {
          setPhone(profile.phone || '')
        }
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: 'Error',
          description: 'Sesi tidak valid',
          variant: 'destructive',
        })
        router.push('/login')
        return
      }

      // For WhatsApp login, don't update phone (it's tied to their login)
      const updateData: { full_name: string; phone?: string | null } = {
        full_name: fullName.trim(),
      }

      if (!isWhatsAppLogin) {
        updateData.phone = phone.trim() || null
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
        setSaving(false)
        return
      }

      toast({
        title: 'Berhasil',
        description: 'Profil berhasil diperbarui',
      })

      router.push('/profile')
      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan profil',
        variant: 'destructive',
      })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="container px-4 py-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Edit Profil</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg p-4 space-y-4">
          <div>
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Masukkan nama lengkap"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Nomor WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="08xxxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="mt-1"
              disabled={isWhatsAppLogin}
            />
            {isWhatsAppLogin && (
              <p className="text-xs text-gray-500 mt-1">
                Nomor WhatsApp tidak dapat diubah karena digunakan untuk login
              </p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-green-600 hover:bg-green-700"
          disabled={saving || fullName.trim().length < 2}
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Simpan Perubahan'
          )}
        </Button>
      </form>
    </div>
  )
}
