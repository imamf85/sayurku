'use client'

import { useRouter } from 'next/navigation'
import { CartItem as CartItemComponent } from '@/components/user/CartItem'
import { CartItem } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface CartActionsProps {
  item: CartItem
  onQuantityChange?: (itemId: string, newQuantity: number) => void
}

export function CartActions({ item, onQuantityChange }: CartActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleUpdateQuantity = async (quantity: number): Promise<boolean> => {
    if (quantity < 1) return false

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', item.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengupdate quantity',
        variant: 'destructive',
      })
      return false
    }

    // Notify parent about quantity change for total recalculation
    onQuantityChange?.(item.id, quantity)
    return true
  }

  const handleRemove = async () => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', item.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus item',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Item dihapus',
      description: 'Item berhasil dihapus dari keranjang',
    })

    router.refresh()
  }

  return (
    <CartItemComponent
      item={item}
      onUpdateQuantity={handleUpdateQuantity}
      onRemove={handleRemove}
    />
  )
}
