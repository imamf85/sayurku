import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/user/ProductCard'
import { PromoCarousel } from '@/components/user/PromoCarousel'
import { CategoryGrid } from '@/components/user/CategoryGrid'

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

  const promoSlides = promos.slice(0, 5).map((promo) => ({
    id: promo.id,
    image_url: promo.product?.image_url || '',
    title: promo.name,
  }))

  const promoMap = new Map(
    promos.map((promo) => [promo.product_id, promo])
  )

  return (
    <div className="container px-4 py-4 space-y-6">
      {promoSlides.length > 0 && <PromoCarousel slides={promoSlides} />}

      <section>
        <h2 className="text-lg font-bold mb-3">Kategori</h2>
        <CategoryGrid categories={categories} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Produk Terbaru</h2>
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

      {promos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Promo Spesial</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {promos
              .filter((promo) => promo.product)
              .slice(0, 8)
              .map((promo) => (
                <ProductCard
                  key={promo.id}
                  product={promo.product!}
                  promo={promo}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
