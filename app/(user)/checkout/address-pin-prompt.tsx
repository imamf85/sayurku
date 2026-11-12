'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LocationPickerField } from '@/components/map/LocationPickerField'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Address } from '@/types'

interface AddressPinPromptProps {
  address: Address
  onSaved: (address: Address) => void
}

// Alamat lama belum punya titik lokasi: minta customer memasangnya sebelum checkout (jarak & kurir).
export function AddressPinPrompt({ address, onSaved }: AddressPinPromptProps) {
  const { toast } = useToast()
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!pin) return
    setSaving(true)
    const { error } = await createClient()
      .from('addresses')
      .update({ latitude: pin.latitude, longitude: pin.longitude })
      .eq('id', address.id)
    setSaving(false)

    if (error) {
      toast({ title: 'Gagal menyimpan titik lokasi', variant: 'destructive' })
      return
    }
    toast({ title: 'Titik lokasi disimpan' })
    onSaved({ ...address, latitude: pin.latitude, longitude: pin.longitude })
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
      <p className="text-sm text-amber-800">
        Alamat ini belum punya titik lokasi. Pasang titik agar kami bisa menghitung jarak dan kurir yang tersedia.
      </p>
      <LocationPickerField value={pin} onChange={setPin} label="Titik lokasi alamat" required />
      {pin && (
        <Button type="button" size="sm" onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Titik Lokasi'}
        </Button>
      )}
    </div>
  )
}
