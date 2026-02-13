import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatPrice, formatUnit, getDiscountedPrice } from '@/lib/utils'
import { AddToCartButton } from './add-to-cart-button'

interface ProductPageProps {
  params: { slug: string }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const supabase = createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!product) {
    notFound()
  }

  const { data: promo } = await supabase
    .from('promos')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_active', true)
    .gte('end_date', new Date().toISOString())
    .lte('start_date', new Date().toISOString())
    .single()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profile:profiles(full_name)')
    .eq('product_id', product.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const discountedPrice = getDiscountedPrice(product, promo)
  const hasDiscount = discountedPrice < product.price

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="pb-24">
      <div className="relative aspect-square bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        {product.is_preorder && (
          <Badge className="absolute top-4 left-4 bg-orange-500">
            Preorder H-{product.preorder_days}
          </Badge>
        )}
      </div>

      <div className="container px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{product.name}</h1>
            <p className="text-sm text-gray-500">
              {formatUnit(product.unit, product.unit_value)}
            </p>
          </div>
          {reviews && reviews.length > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                <span className="font-medium">{avgRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-500">{reviews.length} ulasan</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-2xl font-bold text-green-600">
            {formatPrice(discountedPrice)}
          </p>
          {hasDiscount && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.price)}
              </span>
              <Badge variant="destructive" className="text-xs">
                {promo?.type === 'percentage'
                  ? `${promo.value}% OFF`
                  : `Hemat ${formatPrice(promo?.value || 0)}`}
              </Badge>
            </div>
          )}
        </div>

        <div className="mt-2">
          {product.stock > 0 ? (
            <p className="text-sm text-green-600">Stok: {product.stock}</p>
          ) : (
            <p className="text-sm text-red-500">Stok habis</p>
          )}
        </div>

        {product.description && (
          <>
            <Separator className="my-4" />
            <div>
              <h2 className="font-medium mb-2">Deskripsi</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          </>
        )}

        {reviews && reviews.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h2 className="font-medium mb-3">Ulasan ({reviews.length})</h2>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {review.profile?.full_name || 'Anonymous'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < review.rating
                                ? 'text-yellow-500'
                                : 'text-gray-300'
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden">
        <AddToCartButton
          productId={product.id}
          stock={product.stock}
          price={discountedPrice}
        />
      </div>
    </div>
  )
}
