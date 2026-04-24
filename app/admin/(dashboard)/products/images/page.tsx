'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Search,
  Upload,
  X,
  Check,
  Filter,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  image_url: string | null
  images: string[] | null
  category: { id: string; name: string } | null
  is_active: boolean
}

interface Category {
  id: string
  name: string
}

export default function BulkImageUpdatePage() {
  const { toast } = useToast()
  const supabase = createClient()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [imageFilter, setImageFilter] = useState<'all' | 'no-image' | 'has-image'>('all')

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/admin/products'),
          fetch('/api/admin/categories'),
        ])

        const productsData = await productsRes.json()
        const categoriesData = await categoriesRes.json()

        setProducts(productsData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Error',
          description: 'Gagal memuat data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter products
  const filteredProducts = products.filter((product) => {
    // Search filter
    if (search && !product.name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }

    // Category filter
    if (categoryFilter !== 'all' && product.category?.id !== categoryFilter) {
      return false
    }

    // Image filter
    if (imageFilter === 'no-image' && product.image_url) {
      return false
    }
    if (imageFilter === 'has-image' && !product.image_url) {
      return false
    }

    return true
  })

  // Stats
  const totalProducts = products.length
  const productsWithImage = products.filter((p) => p.image_url).length
  const productsWithoutImage = totalProducts - productsWithImage

  // Handle image upload
  const handleImageUpload = async (productId: string, file: File) => {
    // Validate
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'File tidak valid',
        description: 'Hanya file gambar yang diizinkan',
        variant: 'destructive',
      })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File terlalu besar',
        description: 'Maksimal 2MB',
        variant: 'destructive',
      })
      return
    }

    setUploadingId(productId)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `images/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName)

      // Update product in database
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          image_url: publicUrl,
          images: [publicUrl],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal update produk')
      }

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, image_url: publicUrl, images: [publicUrl] }
            : p
        )
      )

      toast({
        title: 'Berhasil',
        description: 'Gambar berhasil diupload',
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload gagal',
        description: error.message || 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setUploadingId(null)
    }
  }

  // Handle remove image
  const handleRemoveImage = async (productId: string, imageUrl: string) => {
    setUploadingId(productId)

    try {
      // Delete from storage
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/storage/v1/object/public/products/')
      if (pathParts.length > 1) {
        await supabase.storage.from('products').remove([pathParts[1]])
      }

      // Update product in database
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          image_url: null,
          images: [],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal update produk')
      }

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, image_url: null, images: [] } : p
        )
      )

      toast({
        title: 'Berhasil',
        description: 'Gambar berhasil dihapus',
      })
    } catch (error: any) {
      console.error('Remove error:', error)
      toast({
        title: 'Gagal menghapus',
        description: error.message || 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Bulk Update Gambar</h1>
          <p className="text-sm text-gray-500">
            Upload gambar untuk banyak produk sekaligus
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-sm text-gray-500">Total Produk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{productsWithImage}</div>
            <p className="text-sm text-gray-500">Sudah Ada Gambar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{productsWithoutImage}</div>
            <p className="text-sm text-gray-500">Belum Ada Gambar</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={imageFilter} onValueChange={(v) => setImageFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Gambar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="no-image">Belum Ada Gambar</SelectItem>
                <SelectItem value="has-image">Sudah Ada Gambar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tidak ada produk yang ditemukan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredProducts.map((product) => (
            <ProductImageCard
              key={product.id}
              product={product}
              uploading={uploadingId === product.id}
              onUpload={(file) => handleImageUpload(product.id, file)}
              onRemove={() => handleRemoveImage(product.id, product.image_url!)}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <p className="text-sm text-gray-500 text-center">
        Menampilkan {filteredProducts.length} dari {totalProducts} produk
      </p>
    </div>
  )
}

// Product Image Card Component
function ProductImageCard({
  product,
  uploading,
  onUpload,
  onRemove,
}: {
  product: Product
  uploading: boolean
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <Card className="overflow-hidden">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Image Area */}
      <div className="relative aspect-square bg-gray-100">
        {product.image_url ? (
          <>
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {uploading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onRemove}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {/* Check badge */}
            <div className="absolute top-2 right-2">
              <div className="bg-green-500 text-white rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
            </div>
          </>
        ) : (
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500">Klik untuk upload</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Product Info */}
      <CardContent className="p-3">
        <p className="font-medium text-sm truncate" title={product.name}>
          {product.name}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {product.category?.name || 'Tanpa Kategori'}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-medium">{formatPrice(product.price)}</span>
          {!product.is_active && (
            <Badge variant="secondary" className="text-xs">
              Nonaktif
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
