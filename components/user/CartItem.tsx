'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartItem as CartItemType } from '@/types'
import { formatPrice, formatUnit } from '@/lib/utils'

interface CartItemProps {
  item: CartItemType
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const product = item.product!

  return (
    <div className="flex gap-3 p-4 bg-white rounded-lg border">
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Image
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatUnit(product.unit, product.unit_value)}
        </p>
        <p className="font-bold text-green-600 mt-1">
          {formatPrice(product.price)}
        </p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              disabled={item.quantity >= product.stock}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
