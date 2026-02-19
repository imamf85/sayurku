'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Product, Promo } from '@/types'
import { formatPrice, formatUnit, getDiscountedPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

const supabase = createClient()

interface ProductCardProps {
  product: Product
  promo?: Promo | null
  isInWishlist?: boolean
}

export function ProductCard({ product, promo, isInWishlist: initialWishlist = false }: ProductCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isInWishlist, setIsInWishlist] = useState(initialWishlist)
  const [addingToCart, setAddingToCart] = useState(false)
  const [togglingWishlist, setTogglingWishlist] = useState(false)

  const discountedPrice = getDiscountedPrice(product, promo)
  const hasDiscount = discountedPrice < product.price

  // Check wishlist status on mount
  useEffect(() => {
    const checkWishlistStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single()

      setIsInWishlist(!!data)
    }

    if (!initialWishlist) {
      checkWishlistStatus()
    }
  }, [product.id, initialWishlist])

  const handleAddToCart = async () => {
    setAddingToCart(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
      setAddingToCart(false)
      return
    }

    // Check if already in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .single()

    // For bulk pricing, add minimum price; for regular, add 1 unit
    const addQuantity = product.is_bulk_pricing ? (product.bulk_min_price || 1000) : 1

    let error
    if (existingItem) {
      const result = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + addQuantity })
        .eq('id', existingItem.id)
      error = result.error
    } else {
      const result = await supabase.from('cart_items').insert({
        user_id: user.id,
        product_id: product.id,
        quantity: addQuantity,
      })
      error = result.error
    }

    if (error) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Ditambahkan ke keranjang' })
    }

    setAddingToCart(false)
    router.refresh()
  }

  const handleToggleWishlist = async () => {
    setTogglingWishlist(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
      setTogglingWishlist(false)
      return
    }

    // Check if already in wishlist
    const { data: existingItem } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .single()

    let error
    if (existingItem) {
      const result = await supabase.from('wishlists').delete().eq('id', existingItem.id)
      error = result.error
      if (!error) {
        setIsInWishlist(false)
        toast({ title: 'Dihapus dari wishlist' })
      }
    } else {
      const result = await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
      })
      error = result.error
      if (!error) {
        setIsInWishlist(true)
        toast({ title: 'Ditambahkan ke wishlist' })
      }
    }

    if (error) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    }

    setTogglingWishlist(false)
  }

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
          {product.is_bulk_pricing && !product.is_preorder && (
            <Badge className="absolute top-2 left-2 bg-purple-500">
              Curah
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
            {product.is_bulk_pricing ? '/kg' : formatUnit(product.unit, product.unit_value)}
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
                e.stopPropagation()
                handleToggleWishlist()
              }}
              disabled={togglingWishlist}
            >
              {togglingWishlist ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart
                  className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`}
                />
              )}
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 bg-green-600 hover:bg-green-700"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddToCart()
              }}
              disabled={product.stock === 0 || addingToCart}
            >
              {addingToCart ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
