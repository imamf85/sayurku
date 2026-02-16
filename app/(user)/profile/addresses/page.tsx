import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddressForm } from './address-form'

export default async function AddressesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/profile/addresses')
  }

  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="container px-4 py-4">
      <h1 className="text-xl font-bold mb-4">Alamat Pengiriman</h1>

      {addresses && addresses.length > 0 ? (
        <div className="space-y-3 mb-4">
          {addresses.map((address) => (
            <div key={address.id} className="bg-white rounded-lg p-4 border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{address.label}</span>
                  {address.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Utama
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">{address.address}</p>
              <p className="text-sm text-gray-600">
                {address.village && `${address.village}, `}
                {address.district}, {address.city}
                {address.province && `, ${address.province}`} {address.postal_code}
              </p>
              {address.notes && (
                <p className="text-sm text-gray-500 mt-1">
                  Patokan: {address.notes}
                </p>
              )}
              <AddressForm address={address} mode="edit" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 mb-4">
          <MapPin className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Belum ada alamat tersimpan</p>
        </div>
      )}

      <AddressForm mode="create" />
    </div>
  )
}
