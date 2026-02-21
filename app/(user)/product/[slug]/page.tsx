import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatPrice, formatUnit, getDiscountedPrice } from '@/lib/utils'
import { AddToCartButton } from './add-to-cart-button'
import { ProductImageGallery } from '@/components/user/ProductImageGallery'

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

  // Get images array, fallback to image_url if images array is empty
  const productImages = product.images?.length > 0
    ? product.images
    : product.image_url
      ? [product.image_url]
      : []

  return (
    <div className="pb-24 md:pb-8">
      {/* Desktop Layout */}
      <div className="hidden md:block container px-4 py-8">
        <div className="grid grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Image Gallery */}
          <div className="sticky top-24">
            <div className="relative">
              {product.is_preorder && (
                <Badge className="absolute top-4 left-4 z-10 bg-orange-500">
                  Preorder H-{product.preorder_days}
                </Badge>
              )}
              {product.is_bulk_pricing && (
                <Badge className="absolute top-4 left-4 z-10 bg-purple-500">
                  Curah
                </Badge>
              )}
              <ProductImageGallery
                images={productImages}
                productName={product.name}
              />
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{product.name}</h1>
              <p className="text-gray-500 mt-1">
                {formatUnit(product.unit, product.unit_value)}
              </p>
            </div>

            <div>
              <p className="text-3xl font-bold text-green-600">
                {formatPrice(discountedPrice)}
              </p>
              {hasDiscount && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-400 line-through">
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

            <div>
              {product.stock > 0 ? (
                <p className="text-green-600">
                  Stok tersedia: {product.stock} {product.is_bulk_pricing ? 'kg' : ''}
                </p>
              ) : (
                <p className="text-red-500">Stok habis</p>
              )}
            </div>

            {reviews && reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500 text-lg">★</span>
                  <span className="font-medium">{avgRating.toFixed(1)}</span>
                </div>
                <span className="text-gray-500">({reviews.length} ulasan)</span>
              </div>
            )}

            <div className="pt-4">
              <AddToCartButton
                productId={product.id}
                stock={product.stock}
                price={discountedPrice}
                isBulkPricing={product.is_bulk_pricing}
                bulkMinPrice={product.bulk_min_price ?? 1000}
              />
            </div>

            {product.description && (
              <>
                <Separator />
                <div>
                  <h2 className="font-semibold mb-2">Deskripsi</h2>
                  <p className="text-gray-600 whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              </>
            )}

            {reviews && reviews.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="font-semibold mb-4">Ulasan ({reviews.length})</h2>
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
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Full-width Image Gallery */}
        <div className="relative">
          {product.is_preorder && (
            <Badge className="absolute top-4 left-4 z-10 bg-orange-500">
              Preorder H-{product.preorder_days}
            </Badge>
          )}
          {product.is_bulk_pricing && (
            <Badge className="absolute top-4 left-4 z-10 bg-purple-500">
              Curah
            </Badge>
          )}
          <ProductImageGallery
            images={productImages}
            productName={product.name}
          />
        </div>

        {/* Product Info */}
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
              <p className="text-sm text-green-600">
                Stok: {product.stock} {product.is_bulk_pricing ? 'kg' : ''}
              </p>
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

        {/* Fixed Bottom Add to Cart */}
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4">
          <AddToCartButton
            productId={product.id}
            stock={product.stock}
            price={discountedPrice}
            isBulkPricing={product.is_bulk_pricing}
            bulkMinPrice={product.bulk_min_price ?? 1000}
          />
        </div>
      </div>
    </div>
  )
}
