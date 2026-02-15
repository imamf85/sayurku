'use client'

import { useRouter } from 'next/navigation'
import { CartItem as CartItemComponent } from '@/components/user/CartItem'
import { CartItem } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface CartActionsProps {
  item: CartItem
}

export function CartActions({ item }: CartActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleUpdateQuantity = async (quantity: number) => {
    if (quantity < 1) return

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity } as { quantity: number })
      .eq('id', item.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengupdate quantity',
        variant: 'destructive',
      })
      return
    }

    router.refresh()
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
