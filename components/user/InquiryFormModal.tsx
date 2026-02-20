'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Package, Calendar, Hash, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

interface InquiryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialItemName?: string
}

const QUANTITY_UNITS = [
  { value: 'pcs', label: 'Pcs' },
  { value: 'kg', label: 'Kg' },
  { value: 'gram', label: 'Gram' },
  { value: 'ons', label: 'Ons' },
  { value: 'pack', label: 'Pack' },
  { value: 'ikat', label: 'Ikat' },
  { value: 'liter', label: 'Liter' },
  { value: 'botol', label: 'Botol' },
]

export function InquiryFormModal({
  open,
  onOpenChange,
  initialItemName = '',
}: InquiryFormModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    item_name: initialItemName,
    quantity: '',
    quantity_unit: 'pcs',
    needed_by: '',
    brand_preference: '',
    notes: '',
  })

  // Set minimum date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: 'Login diperlukan',
          description: 'Silakan login terlebih dahulu untuk mengajukan permintaan',
          variant: 'destructive',
        })
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
        return
      }

      // Submit inquiry
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: form.item_name,
          quantity: parseInt(form.quantity),
          quantity_unit: form.quantity_unit,
          needed_by: form.needed_by,
          brand_preference: form.brand_preference || null,
          notes: form.notes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Gagal',
          description: data.error || 'Gagal mengajukan permintaan',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      toast({
        title: 'Permintaan terkirim!',
        description: 'Tim kami akan segera menghubungi Anda',
      })

      // Reset form and close modal
      setForm({
        item_name: '',
        quantity: '',
        quantity_unit: 'pcs',
        needed_by: '',
        brand_preference: '',
        notes: '',
      })
      onOpenChange(false)

      // Redirect to permintaan page
      router.push('/permintaan')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Ajukan Permintaan Item
          </DialogTitle>
          <DialogDescription>
            Tidak menemukan barang yang dicari? Isi form berikut dan tim kami akan mencarikannya untuk Anda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="item_name">Nama Item *</Label>
            <Input
              id="item_name"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              placeholder="Contoh: Daging Wagyu A5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantity">Jumlah *</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="pl-9"
                  placeholder="1"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="quantity_unit">Satuan *</Label>
              <Select
                value={form.quantity_unit}
                onValueChange={(value) => setForm({ ...form, quantity_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUANTITY_UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="needed_by">Dibutuhkan Tanggal *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="needed_by"
                type="date"
                min={minDate}
                value={form.needed_by}
                onChange={(e) => setForm({ ...form, needed_by: e.target.value })}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="brand_preference">Preferensi Merk (Opsional)</Label>
            <Input
              id="brand_preference"
              value={form.brand_preference}
              onChange={(e) => setForm({ ...form, brand_preference: e.target.value })}
              placeholder="Contoh: Merk A atau setara"
            />
          </div>

          <div>
            <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Detail tambahan untuk membantu kami menemukan item yang tepat"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Kirim Permintaan'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
