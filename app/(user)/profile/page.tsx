import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight,
  MapPin,
  User,
  Phone,
  Pencil,
  CheckCircle2,
} from 'lucide-react'
import { LogoutButton } from './logout-button'

export default async function ProfilePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/profile')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email?.[0].toUpperCase()

  // All users login via WhatsApp, so phone is always verified
  const displayPhone = profile?.phone || user.email?.replace('@whatsapp.sayurku.local', '')

  return (
    <div className="container px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Profil</h1>
        <Link href="/profile/edit">
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-green-100 text-green-600 text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg truncate">
              {profile?.full_name || 'Nama belum diisi'}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {displayPhone}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden mb-4">
        <div className="p-4 border-b">
          <h2 className="font-medium">Informasi Akun</h2>
        </div>
        <div className="divide-y">
          <div className="flex items-center gap-3 p-4">
            <User className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Nama Lengkap</p>
              <p className="font-medium">
                {profile?.full_name || '-'}
              </p>
            </div>
          </div>

          {/* WhatsApp - always verified since user logged in via OTP */}
          <div className="flex items-center gap-3 p-4">
            <Phone className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">WhatsApp</p>
                <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Terverifikasi
                </Badge>
              </div>
              <p className="font-medium">
                {displayPhone || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden mb-4">
        <Link href="/profile/addresses">
          <div className="flex items-center gap-3 p-4">
            <MapPin className="h-5 w-5 text-gray-400" />
            <span className="flex-1">Alamat Pengiriman</span>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </Link>
      </div>

      <LogoutButton />
    </div>
  )
}
