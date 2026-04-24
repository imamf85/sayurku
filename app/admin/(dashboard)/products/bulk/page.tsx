'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, Plus } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Category {
  id: string
  name: string
}

interface ParsedProduct {
  name: string
  category: string
  price: number
  hasPrice: boolean
  isNewCategory: boolean
}

const UNITS = [
  { value: 'pack', label: 'Pack' },
  { value: 'pcs', label: 'Pcs' },
  { value: 'kg', label: 'Kg' },
  { value: 'gram', label: 'Gram' },
  { value: 'ons', label: 'Ons' },
  { value: 'ikat', label: 'Ikat' },
]

export default function BulkUploadPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [rawData, setRawData] = useState('')
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([])
  const [unit, setUnit] = useState('pack')
  const [unitValue, setUnitValue] = useState(1)
  const [stock, setStock] = useState(100)
  const [isLoading, setIsLoading] = useState(false)
  const [parseError, setParseError] = useState('')

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch(console.error)
  }, [])

  const parseData = (data: string) => {
    setParseError('')

    if (!data.trim()) {
      setParsedProducts([])
      return
    }

    const lines = data.trim().split('\n')
    const products: ParsedProduct[] = []

    // Build set of existing category names (case-insensitive)
    const existingCategoryNames = new Set(
      categories.map((c) => c.name.toLowerCase())
    )

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Split by tab (from Excel) or multiple spaces
      const parts = line.split(/\t+|\s{2,}/)

      if (parts.length >= 1) {
        const name = parts[0].trim()

        // Skip header row if detected
        if (name.toLowerCase().includes('nama barang') ||
            name.toLowerCase().includes('nama produk') ||
            name.toLowerCase().includes('kategori')) {
          continue
        }

        // Parse category (column 2) - Format: Nama | Kategori | Harga
        let category = ''
        if (parts.length >= 2) {
          category = parts[1].trim()
        }

        // Parse price (column 3) - handle Indonesian number format (8.000 = 8000)
        let price = 0
        let hasPrice = false

        if (parts.length >= 3) {
          const priceStr = parts[2].trim()
          // Remove dots (thousand separator) and replace comma with dot for decimals
          const cleanPrice = priceStr.replace(/\./g, '').replace(',', '.')
          const parsedPrice = parseFloat(cleanPrice)

          if (!isNaN(parsedPrice) && parsedPrice >= 0) {
            price = parsedPrice
            hasPrice = true
          }
        }

        // Check if category is new
        const isNewCategory = category !== '' && !existingCategoryNames.has(category.toLowerCase())

        if (name && category) {
          products.push({ name, category, price, hasPrice, isNewCategory })
        }
      }
    }

    if (products.length === 0) {
      setParseError('Tidak dapat mem-parse data. Pastikan format: Nama [TAB] Kategori [TAB] Harga')
    }

    setParsedProducts(products)
  }

  const handleSubmit = async () => {
    if (parsedProducts.length === 0) {
      toast({
        title: 'Error',
        description: 'Tidak ada produk untuk diupload',
        variant: 'destructive',
      })
      return
    }

    // Check if all products have category
    const missingCategory = parsedProducts.filter((p) => !p.category)
    if (missingCategory.length > 0) {
      toast({
        title: 'Error',
        description: `${missingCategory.length} produk tidak memiliki kategori`,
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: parsedProducts.map((p) => ({
            name: p.name,
            category: p.category,
            price: p.price,
          })),
          unit,
          unit_value: unitValue,
          stock,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengupload produk')
      }

      const message = result.newCategories > 0
        ? `${result.inserted} produk & ${result.newCategories} kategori baru berhasil ditambahkan`
        : `${result.inserted} produk berhasil ditambahkan`

      toast({
        title: 'Berhasil',
        description: message,
      })

      router.push('/admin/products')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengupload produk',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const productsWithPrice = parsedProducts.filter((p) => p.hasPrice)
  const productsWithoutPrice = parsedProducts.filter((p) => !p.hasPrice)
  const newCategories = Array.from(new Set(parsedProducts.filter((p) => p.isNewCategory).map((p) => p.category)))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Bulk Upload Produk</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Paste Data dari Excel
              </CardTitle>
              <CardDescription>
                Copy data dari Excel (3 kolom) lalu paste di bawah ini.
                Format: Nama [TAB] Kategori [TAB] Harga
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={`Contoh:\nASAM JAWA\tBumbu Dapur\t8.000\nANTAKA BALADO\tBumbu Dapur\t6.000\nBAMBOE TOM YUM\tBumbu Instan\t8.000`}
                value={rawData}
                onChange={(e) => {
                  setRawData(e.target.value)
                  parseData(e.target.value)
                }}
                rows={12}
                className="font-mono text-sm"
              />
              {parseError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {parseError}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Default</CardTitle>
              <CardDescription>
                Pengaturan ini akan diterapkan ke semua produk yang diupload
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Satuan</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitValue">Nilai Satuan</Label>
                  <Input
                    id="unitValue"
                    type="number"
                    min="1"
                    value={unitValue}
                    onChange={(e) => setUnitValue(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stok Awal</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview ({parsedProducts.length} produk)</CardTitle>
              <CardDescription>
                {productsWithPrice.length} dengan harga, {productsWithoutPrice.length} tanpa harga (akan di-set Rp 0 & nonaktif)
                {newCategories.length > 0 && (
                  <span className="block mt-1 text-blue-600">
                    <Plus className="h-3 w-3 inline mr-1" />
                    {newCategories.length} kategori baru akan dibuat: {newCategories.join(', ')}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsedProducts.length > 0 ? (
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr>
                        <th className="text-left p-2 font-medium">#</th>
                        <th className="text-left p-2 font-medium">Nama Produk</th>
                        <th className="text-left p-2 font-medium">Kategori</th>
                        <th className="text-right p-2 font-medium">Harga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedProducts.map((product, index) => (
                        <tr
                          key={index}
                          className={`border-b ${!product.hasPrice ? 'bg-yellow-50' : ''}`}
                        >
                          <td className="p-2 text-gray-500">{index + 1}</td>
                          <td className="p-2">{product.name}</td>
                          <td className="p-2">
                            <span className="flex items-center gap-1">
                              {product.category}
                              {product.isNewCategory && (
                                <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                                  Baru
                                </Badge>
                              )}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            {product.hasPrice ? (
                              formatPrice(product.price)
                            ) : (
                              <span className="text-yellow-600">Rp 0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Paste data dari Excel untuk melihat preview</p>
                </div>
              )}
            </CardContent>
          </Card>

          {parsedProducts.length > 0 && (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isLoading ? (
                'Mengupload...'
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {parsedProducts.length} Produk
                  {newCategories.length > 0 && ` + ${newCategories.length} Kategori`}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
