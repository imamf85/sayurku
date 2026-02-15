'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, ShoppingCart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatPrice } from '@/lib/utils'

interface AddToCartButtonProps {
  productId: string
  stock: number
  price: number
}

export function AddToCartButton({ productId, stock, price }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleAddToCart = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/login?redirect=${window.location.pathname}`)
      return
    }

    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .single()

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      if (newQuantity > stock) {
        toast({
          title: 'Stok tidak cukup',
          description: `Maksimal ${stock} item`,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      await supabase
        .from('cart_items')
        .update({ quantity: newQuantity } as { quantity: number })
        .eq('id', existingItem.id)
    } else {
      await supabase.from('cart_items').insert({
        user_id: user.id,
        product_id: productId,
        quantity,
      })
    }

    toast({
      title: 'Berhasil ditambahkan',
      description: 'Produk berhasil ditambahkan ke keranjang',
    })

    router.refresh()
    setLoading(false)
  }

  return (
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
        disabled={loading || stock === 0}
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
  )
}
