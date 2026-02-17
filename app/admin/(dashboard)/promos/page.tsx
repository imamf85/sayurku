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
import { Promo, PromoType } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { formatPrice, formatDate } from '@/lib/utils'

export default function PromosPage() {
  const { toast } = useToast()

  const [promos, setPromos] = useState<(Promo & { product?: { name: string } })[]>([])
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null)
  const [form, setForm] = useState({
    product_id: '',
    name: '',
    type: 'percentage' as PromoType,
    value: '',
    start_date: '',
    end_date: '',
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [promosRes, productsRes] = await Promise.all([
        fetch('/api/admin/promos'),
        fetch('/api/admin/products'),
      ])

      if (promosRes.ok) {
        const promosData = await promosRes.json()
        setPromos(promosData)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.map((p: any) => ({ id: p.id, name: p.name })))
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      product_id: form.product_id || null,
      name: form.name,
      type: form.type,
      value: parseFloat(form.value),
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      is_active: form.is_active,
    }

    try {
      const url = '/api/admin/promos'
      const method = editingPromo ? 'PUT' : 'POST'
      const body = editingPromo ? { id: editingPromo.id, ...payload } : payload

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        setSaving(false)
        return
      }

      toast({ title: editingPromo ? 'Promo berhasil diupdate' : 'Promo berhasil ditambahkan' })
      setSaving(false)
      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
      setSaving(false)
    }
  }

  const handleEdit = (promo: Promo) => {
    setEditingPromo(promo)
    setForm({
      product_id: promo.product_id || '',
      name: promo.name,
      type: promo.type,
      value: promo.value.toString(),
      start_date: new Date(promo.start_date).toISOString().slice(0, 16),
      end_date: new Date(promo.end_date).toISOString().slice(0, 16),
      is_active: promo.is_active,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus promo ini?')) return

    try {
      const res = await fetch(`/api/admin/promos?id=${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Promo berhasil dihapus' })
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  const resetForm = () => {
    setEditingPromo(null)
    setForm({
      product_id: '',
      name: '',
      type: 'percentage',
      value: '',
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
        <h1 className="text-2xl font-bold">Promo</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Promo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPromo ? 'Edit Promo' : 'Tambah Promo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="product">Produk</Label>
                <Select
                  value={form.product_id}
                  onValueChange={(value) => setForm({ ...form, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Nama Promo</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  <th className="p-4 font-medium">Nama</th>
                  <th className="p-4 font-medium">Produk</th>
                  <th className="p-4 font-medium">Diskon</th>
                  <th className="p-4 font-medium">Periode</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => (
                  <tr key={promo.id} className="border-b">
                    <td className="p-4 font-medium">{promo.name}</td>
                    <td className="p-4 text-sm">
                      {(promo.product as any)?.name || '-'}
                    </td>
                    <td className="p-4">
                      {promo.type === 'percentage'
                        ? `${promo.value}%`
                        : formatPrice(promo.value)}
                    </td>
                    <td className="p-4 text-sm">
                      {formatDate(promo.start_date)} - {formatDate(promo.end_date)}
                    </td>
                    <td className="p-4">
                      {promo.is_active ? (
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
                          onClick={() => handleEdit(promo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleDelete(promo.id)}
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
