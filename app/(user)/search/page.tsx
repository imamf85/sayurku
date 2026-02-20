import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/user/SearchBar'
import { ProductCard } from '@/components/user/ProductCard'
import { NoResultsInquiry } from '@/components/user/NoResultsInquiry'

interface SearchPageProps {
  searchParams: { q?: string }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || ''
  const supabase = createClient()

  let products: any[] = []

  if (query) {
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(50)

    products = data || []
  }

  return (
    <div className="container px-4 py-4">
      <div className="mb-6">
        <SearchBar defaultValue={query} autoFocus={!query} />
      </div>

      {query ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {products.length} hasil untuk &quot;{query}&quot;
          </p>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <NoResultsInquiry searchQuery={query} />
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Cari sayur, buah, atau produk lainnya
          </p>
        </div>
      )}
    </div>
  )
}
