'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DeliverySlot, DeliverySlotType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export default function DeliverySlotsPage() {
  const { toast } = useToast()
  const supabase = createClient()

  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null)
  const [form, setForm] = useState({
    name: '',
    slot_type: 'scheduled' as DeliverySlotType,
    time_start: '',
    time_end: '',
    sort_order: 0,
    is_active: true,
  })

  useEffect(() => {
    loadSlots()
  }, [])

  const loadSlots = async () => {
    const { data } = await supabase
      .from('delivery_slots')
      .select('*')
      .order('sort_order')

    setSlots(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name,
      slot_type: form.slot_type,
      time_start: form.slot_type === 'scheduled' ? form.time_start : null,
      time_end: form.slot_type === 'scheduled' ? form.time_end : null,
      sort_order: form.sort_order,
      is_active: form.is_active,
    }

    if (editingSlot) {
      const { error } = await supabase
        .from('delivery_slots')
        .update(payload)
        .eq('id', editingSlot.id)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
        setSaving(false)
        return
      }

      toast({ title: 'Slot pengiriman berhasil diupdate' })
    } else {
      const { error } = await supabase.from('delivery_slots').insert(payload)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
        setSaving(false)
        return
      }

      toast({ title: 'Slot pengiriman berhasil ditambahkan' })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    loadSlots()
  }

  const handleEdit = (slot: DeliverySlot) => {
    setEditingSlot(slot)
    setForm({
      name: slot.name,
      slot_type: slot.slot_type,
      time_start: slot.time_start || '',
      time_end: slot.time_end || '',
      sort_order: slot.sort_order,
      is_active: slot.is_active,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus slot pengiriman ini?')) return

    const { error } = await supabase.from('delivery_slots').delete().eq('id', id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    toast({ title: 'Slot pengiriman berhasil dihapus' })
    loadSlots()
  }

  const resetForm = () => {
    setEditingSlot(null)
    setForm({
      name: '',
      slot_type: 'scheduled',
      time_start: '',
      time_end: '',
      sort_order: slots.length,
      is_active: true,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Slot Pengiriman</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Slot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSlot ? 'Edit Slot Pengiriman' : 'Tambah Slot Pengiriman'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Slot</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., 10:00 - 11:00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slot_type">Tipe</Label>
                <Select
                  value={form.slot_type}
                  onValueChange={(value) => setForm({ ...form, slot_type: value as DeliverySlotType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant (1 Jam Setelah Bayar)</SelectItem>
                    <SelectItem value="scheduled">Terjadwal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.slot_type === 'scheduled' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="time_start">Waktu Mulai</Label>
                    <Input
                      id="time_start"
                      type="time"
                      value={form.time_start}
                      onChange={(e) => setForm({ ...form, time_start: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="time_end">Waktu Selesai</Label>
                    <Input
                      id="time_end"
                      type="time"
                      value={form.time_end}
                      onChange={(e) => setForm({ ...form, time_end: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="sort_order">Urutan</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Aktif</Label>
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="p-4 font-medium">Urutan</th>
                  <th className="p-4 font-medium">Nama</th>
                  <th className="p-4 font-medium">Tipe</th>
                  <th className="p-4 font-medium">Waktu</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className="border-b">
                    <td className="p-4">{slot.sort_order}</td>
                    <td className="p-4 font-medium">{slot.name}</td>
                    <td className="p-4">
                      <Badge variant="outline">
                        {slot.slot_type === 'instant' ? 'Instant' : 'Terjadwal'}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm">
                      {slot.time_start && slot.time_end
                        ? `${slot.time_start} - ${slot.time_end}`
                        : '-'}
                    </td>
                    <td className="p-4">
                      {slot.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Nonaktif</Badge>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(slot)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleDelete(slot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
