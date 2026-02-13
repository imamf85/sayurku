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
import { Voucher, PromoType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatPrice, formatDate } from '@/lib/utils'

export default function VouchersPage() {
  const { toast } = useToast()
  const supabase = createClient()

  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [form, setForm] = useState({
    code: '',
    type: 'percentage' as PromoType,
    value: '',
    min_purchase: '',
    max_discount: '',
    usage_limit: '',
    start_date: '',
    end_date: '',
    is_active: true,
  })

  useEffect(() => {
    loadVouchers()
  }, [])

  const loadVouchers = async () => {
    const { data } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false })

    setVouchers(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: parseFloat(form.value),
      min_purchase: parseFloat(form.min_purchase) || 0,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      usage_limit: parseInt(form.usage_limit) || 0,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      is_active: form.is_active,
    }

    if (editingVoucher) {
      const { error } = await supabase
        .from('vouchers')
        .update(payload)
        .eq('id', editingVoucher.id)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
        setSaving(false)
        return
      }

      toast({ title: 'Voucher berhasil diupdate' })
    } else {
      const { error } = await supabase.from('vouchers').insert(payload)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
        setSaving(false)
        return
      }

      toast({ title: 'Voucher berhasil ditambahkan' })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    loadVouchers()
  }

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    setForm({
      code: voucher.code,
      type: voucher.type,
      value: voucher.value.toString(),
      min_purchase: voucher.min_purchase.toString(),
      max_discount: voucher.max_discount?.toString() || '',
      usage_limit: voucher.usage_limit.toString(),
      start_date: new Date(voucher.start_date).toISOString().slice(0, 16),
      end_date: new Date(voucher.end_date).toISOString().slice(0, 16),
      is_active: voucher.is_active,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus voucher ini?')) return

    const { error } = await supabase.from('vouchers').delete().eq('id', id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    toast({ title: 'Voucher berhasil dihapus' })
    loadVouchers()
  }

  const resetForm = () => {
    setEditingVoucher(null)
    setForm({
      code: '',
      type: 'percentage',
      value: '',
      min_purchase: '',
      max_discount: '',
      usage_limit: '',
      start_date: '',
      end_date: '',
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
        <h1 className="text-2xl font-bold">Voucher</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVoucher ? 'Edit Voucher' : 'Tambah Voucher'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Kode Voucher</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="DISKON10"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="type">Tipe</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) => setForm({ ...form, type: value as PromoType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Persentase (%)</SelectItem>
                      <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="value">Nilai</Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="min_purchase">Min. Pembelian</Label>
                  <Input
                    id="min_purchase"
                    type="number"
                    min="0"
                    value={form.min_purchase}
                    onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_discount">Maks. Diskon</Label>
                  <Input
                    id="max_discount"
                    type="number"
                    min="0"
                    value={form.max_discount}
                    onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                    placeholder="Kosongkan jika tidak ada"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="usage_limit">Batas Penggunaan</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="0"
                  value={form.usage_limit}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                  placeholder="0 = tidak terbatas"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start_date">Mulai</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Berakhir</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    required
                  />
                </div>
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
                  <th className="p-4 font-medium">Kode</th>
                  <th className="p-4 font-medium">Diskon</th>
                  <th className="p-4 font-medium">Min. Beli</th>
                  <th className="p-4 font-medium">Penggunaan</th>
                  <th className="p-4 font-medium">Periode</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => (
                  <tr key={voucher.id} className="border-b">
                    <td className="p-4 font-mono font-medium">{voucher.code}</td>
                    <td className="p-4">
                      {voucher.type === 'percentage'
                        ? `${voucher.value}%`
                        : formatPrice(voucher.value)}
                    </td>
                    <td className="p-4">{formatPrice(voucher.min_purchase)}</td>
                    <td className="p-4">
                      {voucher.used_count} / {voucher.usage_limit || '∞'}
                    </td>
                    <td className="p-4 text-sm">
                      {formatDate(voucher.start_date)} - {formatDate(voucher.end_date)}
                    </td>
                    <td className="p-4">
                      {voucher.is_active ? (
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
                          onClick={() => handleEdit(voucher)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleDelete(voucher.id)}
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
