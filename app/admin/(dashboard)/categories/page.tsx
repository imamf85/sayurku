'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Category } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { slugify } from '@/lib/utils'

export default function CategoriesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    image_url: '',
    sort_order: 0,
    is_active: true,
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')

    setCategories(data || [])
    setLoading(false)
  }

  const handleNameChange = (name: string) => {
    setForm({
      ...form,
      name,
      slug: editingCategory ? form.slug : slugify(name),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update(form)
        .eq('id', editingCategory.id)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
        setSaving(false)
        return
      }

      toast({ title: 'Kategori berhasil diupdate' })
    } else {
      const { error } = await supabase.from('categories').insert(form)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
        setSaving(false)
        return
      }

      toast({ title: 'Kategori berhasil ditambahkan' })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    loadCategories()
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setForm({
      name: category.name,
      slug: category.slug,
      image_url: category.image_url || '',
      sort_order: category.sort_order,
      is_active: category.is_active,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return

    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    toast({ title: 'Kategori berhasil dihapus' })
    loadCategories()
  }

  const resetForm = () => {
    setEditingCategory(null)
    setForm({
      name: '',
      slug: '',
      image_url: '',
      sort_order: categories.length,
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
        <h1 className="text-2xl font-bold">Kategori</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Kategori
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Kategori</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="image_url">URL Gambar</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
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
                  <th className="p-4 font-medium">Slug</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b">
                    <td className="p-4">{category.sort_order}</td>
                    <td className="p-4 font-medium">{category.name}</td>
                    <td className="p-4 text-sm text-gray-500">{category.slug}</td>
                    <td className="p-4">
                      {category.is_active ? (
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
                          onClick={() => handleEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleDelete(category.id)}
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
