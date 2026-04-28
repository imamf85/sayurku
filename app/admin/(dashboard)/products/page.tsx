'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Upload, ImageIcon, Search, Loader2 } from 'lucide-react'
import { formatPrice, formatUnit } from '@/lib/utils'
import { Unit } from '@/types'

interface Product {
  id: string
  name: string
  image_url: string | null
  unit: Unit
  unit_value: number
  price: number
  stock: number
  is_active: boolean
  is_preorder: boolean
  category: { name: string } | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/admin/products')
        const data = await res.json()
        setProducts(data)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Filter products based on search
  const filteredProducts = products.filter((product) => {
    if (search && !product.name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Produk</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Link href="/admin/products/images">
              <Button variant="outline">
                <ImageIcon className="h-4 w-4 mr-2" />
                Bulk Gambar
              </Button>
            </Link>
            <Link href="/admin/products/bulk">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </Link>
            <Link href="/admin/products/new">
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Produk
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {search ? (
                <p>Tidak ada produk yang cocok dengan &quot;{search}&quot;</p>
              ) : (
                <p>Belum ada produk</p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="p-4 font-medium">Produk</th>
                      <th className="p-4 font-medium">Kategori</th>
                      <th className="p-4 font-medium">Harga</th>
                      <th className="p-4 font-medium">Stok</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500">
                                {formatUnit(product.unit, product.unit_value)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {product.category?.name || '-'}
                        </td>
                        <td className="p-4 font-medium">
                          {formatPrice(product.price)}
                        </td>
                        <td className="p-4">
                          <span
                            className={
                              product.stock === 0
                                ? 'text-red-500'
                                : product.stock < 10
                                  ? 'text-orange-500'
                                  : ''
                            }
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            {product.is_active ? (
                              <Badge className="bg-green-100 text-green-800">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Nonaktif</Badge>
                            )}
                            {product.is_preorder && (
                              <Badge className="bg-orange-100 text-orange-800">
                                PO
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Link href={`/admin/products/${product.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 text-sm text-gray-500 border-t">
                Menampilkan {filteredProducts.length} dari {products.length} produk
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
