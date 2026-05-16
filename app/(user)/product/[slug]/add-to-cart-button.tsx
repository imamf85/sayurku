'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, ShoppingCart, Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BulkPriceInput } from '@/components/user/BulkPriceInput'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatPrice, getMaxBulkNominal } from '@/lib/utils'

interface AddToCartButtonProps {
  productId: string
  stock: number
  price: number
  isBulkPricing?: boolean
  bulkMinPrice?: number
}

export function AddToCartButton({
  productId,
  stock,
  price,
  isBulkPricing = false,
  bulkMinPrice = 1000,
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(isBulkPricing ? bulkMinPrice : 1)
  const [loading, setLoading] = useState(false)
  const [buyNowLoading, setBuyNowLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const addToCart = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/login?redirect=${window.location.pathname}`)
      return false
    }

    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .single()

    if (isBulkPricing) {
      // For bulk pricing, quantity is the nominal in Rupiah
      const maxNominal = getMaxBulkNominal(stock, price)

      if (existingItem) {
        const newNominal = existingItem.quantity + quantity
        if (newNominal > maxNominal) {
          toast({
            title: 'Melebihi stok',
            description: `Maksimal ${formatPrice(maxNominal)}`,
            variant: 'destructive',
          })
          return false
        }

        await supabase
          .from('cart_items')
          .update({ quantity: newNominal })
          .eq('id', existingItem.id)
      } else {
        await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: productId,
          quantity,
        })
      }
    } else {
      // For regular products
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity
        if (newQuantity > stock) {
          toast({
            title: 'Stok tidak cukup',
            description: `Maksimal ${stock} item`,
            variant: 'destructive',
          })
          return false
        }

        await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id)
      } else {
        await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: productId,
          quantity,
        })
      }
    }

    return true
  }

  const handleAddToCart = async () => {
    setLoading(true)
    const success = await addToCart()

    if (success) {
      toast({
        title: 'Berhasil ditambahkan',
        description: 'Produk berhasil ditambahkan ke keranjang',
      })
      router.refresh()
    }

    setLoading(false)
  }

  const handleBuyNow = async () => {
    setBuyNowLoading(true)
    const success = await addToCart()

    if (success) {
      router.push('/checkout')
    } else {
      setBuyNowLoading(false)
    }
  }

  const isLoading = loading || buyNowLoading

  // Render bulk pricing input
  if (isBulkPricing) {
    return (
      <div className="space-y-4">
        <BulkPriceInput
          pricePerKg={price}
          stock={stock}
          minPrice={bulkMinPrice}
          value={quantity}
          onChange={setQuantity}
        />

        <div className="flex gap-2">
          <Button
            className="flex-1 h-12 bg-green-600 hover:bg-green-700"
            onClick={handleAddToCart}
            disabled={isLoading || stock === 0}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Tambah ke Keranjang
              </>
            )}
          </Button>
          <Button
            className="flex-1 h-12 bg-orange-500 hover:bg-orange-600"
            onClick={handleBuyNow}
            disabled={isLoading || stock === 0}
          >
            {buyNowLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Bayar Sekarang
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Render regular quantity selector
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-medium">{quantity}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setQuantity(Math.min(stock, quantity + 1))}
            disabled={quantity >= stock}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Button
          className="flex-1 h-12 bg-green-600 hover:bg-green-700"
          onClick={handleAddToCart}
          disabled={isLoading || stock === 0}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ShoppingCart className="h-5 w-5 mr-2" />
              {formatPrice(price * quantity)}
            </>
          )}
        </Button>
      </div>

      <Button
        className="w-full h-12 bg-orange-500 hover:bg-orange-600"
        onClick={handleBuyNow}
        disabled={isLoading || stock === 0}
      >
        {buyNowLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Zap className="h-5 w-5 mr-2" />
            Bayar Sekarang
          </>
        )}
      </Button>
    </div>
  )
}
