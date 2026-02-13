'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Address } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface AddressFormProps {
  address?: Address
  mode: 'create' | 'edit'
}

export function AddressForm({ address, mode }: AddressFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    label: address?.label || '',
    address: address?.address || '',
    district: address?.district || '',
    city: address?.city || '',
    postal_code: address?.postal_code || '',
    notes: address?.notes || '',
    is_default: address?.is_default || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    if (mode === 'create') {
      const { error } = await supabase.from('addresses').insert({
        user_id: user.id,
        ...form,
      })

      if (error) {
        toast({
          title: 'Error',
          description: 'Gagal menyimpan alamat',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      toast({ title: 'Alamat berhasil ditambahkan' })
    } else {
      const { error } = await supabase
        .from('addresses')
        .update(form)
        .eq('id', address!.id)

      if (error) {
        toast({
          title: 'Error',
          description: 'Gagal mengupdate alamat',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      toast({ title: 'Alamat berhasil diupdate' })
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('Hapus alamat ini?')) return

    setDeleting(true)

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', address!.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus alamat',
        variant: 'destructive',
      })
      setDeleting(false)
      return
    }

    toast({ title: 'Alamat berhasil dihapus' })
    setDeleting(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button className="w-full bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Alamat Baru
          </Button>
        ) : (
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500"
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Hapus
                </>
              )}
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah Alamat' : 'Edit Alamat'}
          </DialogTitle>
        </DialogHeader>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="is_default">Jadikan alamat utama</Label>
            <Switch
              id="is_default"
              checked={form.is_default}
              onCheckedChange={(checked) =>
                setForm({ ...form, is_default: checked })
              }
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
