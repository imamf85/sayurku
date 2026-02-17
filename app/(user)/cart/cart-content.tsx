'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { CartItem } from '@/types'
import { CartActions } from './cart-actions'

interface CartContentProps {
  initialItems: CartItem[]
  initialTotal: number
}

export function CartContent({ initialItems, initialTotal }: CartContentProps) {
  const [items, setItems] = useState(initialItems)
  const [total, setTotal] = useState(initialTotal)

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    // Update local state for immediate feedback
    setItems(prevItems => {
      const updatedItems = prevItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )

      // Recalculate total with updated items
      const newTotal = updatedItems.reduce(
        (acc, item) => acc + (item.product?.price || 0) * item.quantity,
        0
      )
      setTotal(newTotal)

      return updatedItems
    })
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <CartActions
            key={item.id}
            item={item}
            onQuantityChange={handleQuantityChange}
          />
        ))}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 md:bottom-0">
        <div className="container">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600">Total</span>
            <span className="text-xl font-bold text-green-600">
              {formatPrice(total)}
            </span>
          </div>
          <Link href="/checkout">
            <Button className="w-full h-12 bg-green-600 hover:bg-green-700">
              Checkout ({items.length} item)
            </Button>
          </Link>
        </div>
      </div>
    </>
  )
}
