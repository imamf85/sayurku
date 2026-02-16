import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Pencil } from 'lucide-react'
import { formatPrice, formatUnit } from '@/lib/utils'

export default async function ProductsPage() {
  const supabase = createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produk</h1>
        <Link href="/admin/products/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Produk
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
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
                {products?.map((product) => (
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
                      {(product.category as any)?.name || '-'}
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
        </CardContent>
      </Card>
    </div>
  )
}
