'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CartItem } from '@/types'
import { useToast } from '@/hooks/use-toast'

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const fetchCart = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setItems([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setItems(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const addItem = async (productId: string, quantity: number = 1) => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return false
    }

    const existingItem = items.find((item) => item.product_id === productId)

    if (existingItem) {
      return updateQuantity(existingItem.id, existingItem.quantity + quantity)
    }

    const { error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: productId,
      quantity,
    })

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal menambahkan ke keranjang',
        variant: 'destructive',
      })
      return false
    }

    toast({
      title: 'Berhasil',
      description: 'Produk ditambahkan ke keranjang',
    })

    await fetchCart()
    router.refresh()
    return true
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      return removeItem(itemId)
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId)

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengupdate keranjang',
        variant: 'destructive',
      })
      return false
    }

    await fetchCart()
    router.refresh()
    return true
  }

  const removeItem = async (itemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus item',
        variant: 'destructive',
      })
      return false
    }

    toast({
      title: 'Item dihapus',
      description: 'Item berhasil dihapus dari keranjang',
    })

    await fetchCart()
    router.refresh()
    return true
  }

  const clearCart = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      return false
    }

    setItems([])
    router.refresh()
    return true
  }

  const total = items.reduce(
    (acc, item) => acc + (item.product?.price || 0) * item.quantity,
    0
  )

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0)

  return {
    items,
    loading,
    total,
    itemCount,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refetch: fetchCart,
  }
}
