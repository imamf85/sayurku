'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Product, Promo } from '@/types'
import { formatPrice, formatUnit, getDiscountedPrice } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  promo?: Promo | null
  onAddToCart?: () => void
  onToggleWishlist?: () => void
  isInWishlist?: boolean
}

export function ProductCard({
  product,
  promo,
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false,
}: ProductCardProps) {
  const discountedPrice = getDiscountedPrice(product, promo)
  const hasDiscount = discountedPrice < product.price

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border">
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-square bg-gray-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          {product.is_preorder && (
            <Badge className="absolute top-2 left-2 bg-orange-500">
              Preorder H-{product.preorder_days}
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="absolute top-2 right-2 bg-red-500">
              {promo?.type === 'percentage' ? `${promo.value}%` : formatPrice(promo?.value || 0)}
            </Badge>
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
          <p className="text-xs text-gray-500 mb-2">
            {formatUnit(product.unit, product.unit_value)}
          </p>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-green-600">{formatPrice(discountedPrice)}</p>
            {hasDiscount && (
              <p className="text-xs text-gray-400 line-through">
                {formatPrice(product.price)}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.preventDefault()
                onToggleWishlist?.()
              }}
            >
              <Heart
                className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`}
              />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 bg-green-600 hover:bg-green-700"
              onClick={(e) => {
                e.preventDefault()
                onAddToCart?.()
              }}
              disabled={product.stock === 0}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
