import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/admin/ProductForm'

export default async function NewProductPage() {
  const supabase = createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tambah Produk</h1>
      <ProductForm categories={categories || []} />
    </div>
  )
}
