'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Address } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface AddressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addresses: Address[]
  selectedAddress: Address | null
  onSelectAddress: (address: Address) => void
}

export function AddressDialog({
  open,
  onOpenChange,
  addresses,
  selectedAddress,
  onSelectAddress,
}: AddressDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [showForm, setShowForm] = useState(addresses.length === 0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    label: '',
    address: '',
    district: '',
    city: '',
    postal_code: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
        ...form,
        is_default: addresses.length === 0,
      })
      .select()
      .single()

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan alamat',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    toast({
      title: 'Alamat berhasil disimpan',
    })

    onSelectAddress(data)
    router.refresh()
    setLoading(false)
    setShowForm(false)
    setForm({
      label: '',
      address: '',
      district: '',
      city: '',
      postal_code: '',
      notes: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showForm ? 'Tambah Alamat Baru' : 'Pilih Alamat'}
          </DialogTitle>
        </DialogHeader>

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="label">Label Alamat</Label>
              <Input
                id="label"
                placeholder="Rumah, Kantor, dll"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Alamat Lengkap</Label>
              <Textarea
                id="address"
                placeholder="Nama jalan, nomor rumah, RT/RW"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="district">Kecamatan</Label>
                <Input
                  id="district"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">Kota</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="postal_code">Kode Pos</Label>
              <Input
                id="postal_code"
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="notes">Patokan (Opsional)</Label>
              <Input
                id="notes"
                placeholder="Dekat masjid, seberang minimarket"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              {addresses.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Batal
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <button
                key={address.id}
                onClick={() => onSelectAddress(address)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  selectedAddress?.id === address.id
                    ? 'border-green-600 bg-green-50'
                    : 'hover:border-gray-300'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{address.label}</p>
                    <p className="text-sm text-gray-600 mt-1">{address.address}</p>
                    <p className="text-sm text-gray-600">
                      {address.district}, {address.city} {address.postal_code}
                    </p>
                  </div>
                  {selectedAddress?.id === address.id && (
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Alamat Baru
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
