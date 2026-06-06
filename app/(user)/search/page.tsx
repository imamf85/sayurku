import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductCard } from '@/components/user/ProductCard'
import { NoResultsInquiry } from '@/components/user/NoResultsInquiry'
import { SearchBar } from '@/components/user/SearchBar'

interface SearchPageProps {
  searchParams: { q?: string }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q?.trim() ?? ''

  let products: any[] = []

  if (query) {
    const adminClient = createAdminClient()

    // Expand with synonyms
    const { data: synonymRow } = await adminClient
      .from('search_synonyms')
      .select('synonyms')
      .eq('keyword', query.toLowerCase())
      .maybeSingle()

    const allTerms = Array.from(
      new Set([query.toLowerCase(), ...(synonymRow?.synonyms ?? [])])
    )

    const nameFilter = allTerms.map((t) => `name.ilike.%${t}%`).join(',')

    const { data } = await adminClient
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .or(nameFilter)
      .order('name')
      .limit(50)

    products = data ?? []
  }

  return (
    <div className="container px-4 py-4">
      <div className="mb-6">
        <SearchBar placeholder={query || 'Cari sayur, buah, bumbu...'} />
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
        <div className="text-center py-12 text-gray-400">
          <p>Cari sayur, buah, atau produk lainnya</p>
        </div>
      )}
    </div>
  )
}
