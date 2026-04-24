export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductForm } from '@/components/admin/ProductForm'

interface EditProductPageProps {
  params: { id: string }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const supabase = createAdminClient()

  const [productRes, categoriesRes] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).single(),
    supabase
      .from('categories')
      .select('*')
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
