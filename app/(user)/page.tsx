import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/user/ProductCard'
import { CategoryGrid } from '@/components/user/CategoryGrid'
import { PromoProductsCarousel } from '@/components/user/PromoProductsCarousel'

export default async function HomePage() {
  const supabase = createClient()

  const [categoriesRes, productsRes, promosRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('promos')
      .select('*, product:products(*)')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .lte('start_date', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  const categories = categoriesRes.data || []
  const products = productsRes.data || []
  const promos = promosRes.data || []

  // Map promos with their products for the carousel
  const promoProducts = promos
    .filter((promo) => promo.product)
    .map((promo) => ({
      product: promo.product!,
      promo: promo,
    }))

  // Create promo map for product cards
  const promoMap = new Map(
    promos.map((promo) => [promo.product_id, promo])
  )

  return (
    <div className="container px-4 py-4 space-y-6">
      {/* Kategori */}
      <section>
        <h2 className="text-lg font-bold mb-3">Kategori</h2>
        <CategoryGrid categories={categories} />
      </section>

      {/* Promo Spesial - Always shown */}
      <PromoProductsCarousel promoProducts={promoProducts} />

      {/* Produk Terbaru */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">List Produk</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              promo={promoMap.get(product.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
