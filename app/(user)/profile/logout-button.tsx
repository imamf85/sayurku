'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4 mr-2" />
      Keluar
    </Button>
  )
}
