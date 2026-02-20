export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/admin/ProductForm'

interface EditProductPageProps {
  params: { id: string }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const supabase = createClient()

  const [productRes, categoriesRes] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).single(),
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (!productRes.data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Produk</h1>
      <ProductForm
        product={productRes.data}
        categories={categoriesRes.data || []}
      />
    </div>
  )
}
