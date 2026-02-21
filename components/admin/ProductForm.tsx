'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiImageUpload } from '@/components/admin/MultiImageUpload'
import { Product, Category, Unit } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { slugify } from '@/lib/utils'

interface ProductFormProps {
  product?: Product
  categories: Category[]
}

const units: { value: Unit; label: string }[] = [
  { value: 'gram', label: 'Gram' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'ons', label: 'Ons' },
  { value: 'pcs', label: 'Pcs' },
  { value: 'ikat', label: 'Ikat' },
  { value: 'pack', label: 'Pack' },
]

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = !!product

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    category_id: product?.category_id || '',
    description: product?.description || '',
    images: product?.images?.length > 0
      ? product.images
      : product?.image_url
        ? [product.image_url]
        : [],
    price: product?.price?.toString() || '',
    unit: product?.unit || 'gram',
    unit_value: product?.unit_value?.toString() || '',
    stock: product?.stock?.toString() || '0',
    is_active: product?.is_active ?? true,
    is_preorder: product?.is_preorder ?? false,
    preorder_days: product?.preorder_days?.toString() || '',
    is_bulk_pricing: product?.is_bulk_pricing ?? false,
    bulk_min_price: product?.bulk_min_price?.toString() || '1000',
  })

  const handleNameChange = (name: string) => {
    setForm({
      ...form,
      name,
      slug: isEdit ? form.slug : slugify(name),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      name: form.name,
      slug: form.slug,
      category_id: form.category_id,
      description: form.description || null,
      image_url: form.images[0] || null,
      images: form.images,
      price: parseFloat(form.price),
      unit: form.unit as Unit,
      unit_value: parseFloat(form.unit_value),
      stock: parseInt(form.stock),
      is_active: form.is_active,
      is_preorder: form.is_preorder,
      preorder_days: form.is_preorder ? parseInt(form.preorder_days) : null,
      is_bulk_pricing: form.is_bulk_pricing,
      bulk_min_price: form.is_bulk_pricing ? parseInt(form.bulk_min_price) : null,
    }

    try {
      const res = await fetch('/api/admin/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: product.id, ...payload } : payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      toast({ title: isEdit ? 'Produk berhasil diupdate' : 'Produk berhasil ditambahkan' })
      router.push('/admin/products')
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Nama Produk</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="category">Kategori</Label>
          <Select
            value={form.category_id}
            onValueChange={(value) => setForm({ ...form, category_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Deskripsi</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="col-span-2">
          <Label>Gambar Produk</Label>
          <p className="text-sm text-gray-500 mb-2">
            Gambar pertama akan menjadi gambar utama
          </p>
          <MultiImageUpload
            value={form.images}
            onChange={(urls) => setForm({ ...form, images: urls })}
            maxImages={5}
          />
        </div>

        <div>
          <Label htmlFor="price">Harga (Rp)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="stock">Stok</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="unit">Satuan</Label>
          <Select
            value={form.unit}
            onValueChange={(value) => setForm({ ...form, unit: value as Unit })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="unit_value">Nilai Satuan</Label>
          <Input
            id="unit_value"
            type="number"
            min="0"
            step="0.01"
            value={form.unit_value}
            onChange={(e) => setForm({ ...form, unit_value: e.target.value })}
            placeholder="e.g., 250 untuk 250 gram"
            required
          />
        </div>

        <div className="col-span-2 flex items-center justify-between py-2">
          <div>
            <Label htmlFor="is_active">Aktif</Label>
            <p className="text-sm text-gray-500">
              Produk ditampilkan di website
            </p>
          </div>
          <Switch
            id="is_active"
            checked={form.is_active}
            onCheckedChange={(checked) =>
              setForm({ ...form, is_active: checked })
            }
          />
        </div>

        <div className="col-span-2 flex items-center justify-between py-2">
          <div>
            <Label htmlFor="is_preorder">Preorder</Label>
            <p className="text-sm text-gray-500">
              Produk memerlukan waktu pengiriman lebih lama
            </p>
          </div>
          <Switch
            id="is_preorder"
            checked={form.is_preorder}
            onCheckedChange={(checked) =>
              setForm({ ...form, is_preorder: checked })
            }
          />
        </div>

        {form.is_preorder && (
          <div className="col-span-2">
            <Label htmlFor="preorder_days">Hari Preorder (H+)</Label>
            <Input
              id="preorder_days"
              type="number"
              min="1"
              value={form.preorder_days}
              onChange={(e) =>
                setForm({ ...form, preorder_days: e.target.value })
              }
              placeholder="e.g., 2 untuk H+2"
              required={form.is_preorder}
            />
          </div>
        )}

        <div className="col-span-2 flex items-center justify-between py-2">
          <div>
            <Label htmlFor="is_bulk_pricing">Harga Curah</Label>
            <p className="text-sm text-gray-500">
              Pembeli membeli berdasarkan nominal Rupiah, bukan kuantitas
            </p>
          </div>
          <Switch
            id="is_bulk_pricing"
            checked={form.is_bulk_pricing}
            onCheckedChange={(checked) =>
              setForm({ ...form, is_bulk_pricing: checked })
            }
          />
        </div>

        {form.is_bulk_pricing && (
          <div className="col-span-2">
            <Label htmlFor="bulk_min_price">Minimal Pembelian (Rp)</Label>
            <Input
              id="bulk_min_price"
              type="number"
              min="100"
              step="100"
              value={form.bulk_min_price}
              onChange={(e) =>
                setForm({ ...form, bulk_min_price: e.target.value })
              }
              placeholder="e.g., 1000 untuk minimal Rp 1.000"
              required={form.is_bulk_pricing}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimal nominal yang bisa dibeli pembeli
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Batal
        </Button>
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEdit ? (
            'Update Produk'
          ) : (
            'Tambah Produk'
          )}
        </Button>
      </div>
    </form>
  )
}
