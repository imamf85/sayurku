import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ChevronRight,
  MapPin,
  LogOut,
  User,
  Phone,
  Mail,
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
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email?.[0].toUpperCase()

  return (
    <div className="container px-4 py-4">
      <h1 className="text-xl font-bold mb-4">Profil</h1>

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
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
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
          <div className="flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Phone className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">WhatsApp</p>
              <p className="font-medium">
                {profile?.phone || '-'}
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
