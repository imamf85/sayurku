import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/user/ProductCard'

interface CategoryPageProps {
  params: { slug: string }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const supabase = createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!category) {
    notFound()
  }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', category.id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="container px-4 py-4">
      <h1 className="text-xl font-bold mb-4">{category.name}</h1>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Belum ada produk di kategori ini</p>
        </div>
      )}
    </div>
  )
}
